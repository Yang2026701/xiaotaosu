/* ============================================================
   album.js — Photo Album (Supabase Storage)
   ============================================================ */

App.pages.album = (() => {
  const u = App.utils;
  const m = App.models;
  const d = App.data;
  const container = () => document.getElementById('page-album');
  let activeTag = null;

  function init() {
    document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);
  }

  function render(appData) {
    const photos = [...(appData.photos || [])].sort((a, b) => b.date.localeCompare(a.date));
    const allTags = new Set();
    photos.forEach(p => (p.tags || []).forEach(t => allTags.add(t)));

    let filtered = activeTag ? photos.filter(p => (p.tags || []).includes(activeTag)) : photos;

    let html = '';
    if (allTags.size > 0) {
      html += '<div class="chip-list" id="album-tags">';
      html += `<button class="chip${activeTag===null?' active':''}" data-tag="">📷 全部<span class="chip-count">${photos.length}</span></button>`;
      [...allTags].sort().forEach(tag => {
        html += `<button class="chip${activeTag===tag?' active':''}" data-tag="${u.escapeHtml(tag)}">${u.escapeHtml(tag)}<span class="chip-count">${photos.filter(p=>(p.tags||[]).includes(tag)).length}</span></button>`;
      });
      html += '</div>';
    }

    if (filtered.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">📸</div><div class="empty-title">还没有照片哦</div><div class="empty-desc">点击 + 按钮添加小桃酥的第一张照片吧~</div></div>';
    } else {
      const groups = new Map();
      filtered.forEach(p => {
        const month = p.date.substring(0, 7);
        if (!groups.has(month)) groups.set(month, []);
        groups.get(month).push(p);
      });

      html += '<div class="photo-timeline">';
      for (const [month, monthPhotos] of groups) {
        html += `<div class="photo-month-header">${u.formatMonth(month + '-01')}</div>`;
        html += '<div class="photo-grid">';
        monthPhotos.forEach(p => {
          html += `<div class="photo-card" data-id="${p.id}">`;
          html += `<img src="${p.thumbnailDataUrl || p.dataUrl}" alt="${u.escapeHtml(p.title||'照片')}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23FFEDE6%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2230%22>📷</text></svg>'">`;
          html += '<div class="photo-card-overlay">';
          html += `<span>${u.formatDateShort(p.date)}</span>`;
          if (p.favorite) html += '<span class="photo-card-fav">⭐</span>';
          html += '</div></div>';
        });
        html += '</div>';
      }
      html += '</div>';
    }

    container().innerHTML = html;

    container().querySelectorAll('#album-tags .chip').forEach(chip => {
      chip.addEventListener('click', () => { activeTag = chip.dataset.tag || null; render(appData); });
    });

    container().querySelectorAll('.photo-card').forEach(card => {
      App.effects.initTilt(card, { maxTilt: 6, scale: 1.02 });
      card.addEventListener('click', () => {
        const photo = photos.find(p => p.id === card.dataset.id);
        if (photo) showLightbox(appData, photos, photo);
      });
    });
  }

  // ---- Upload ----
  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { App.showToast('请选择图片文件', 'error'); e.target.value = ''; return; }

    App.showToast('正在压缩上传...', '');

    try {
      const compressed = await u.resizeImage(file, 600, 0.6);
      const thumb = await u.resizeImage(file, 150, 0.5);

      // Convert dataURL to File for upload
      const photoFile = dataURLtoFile(compressed.dataUrl, 'photo.jpg');
      const thumbFile = dataURLtoFile(thumb.dataUrl, 'thumb.jpg');

      const photoId = u.generateId('p');

      // Upload to Supabase Storage (parallel)
      const [photoPath, thumbPath] = await Promise.all([
        d.uploadPhotoFile(photoFile, photoId, false),
        d.uploadPhotoFile(thumbFile, photoId, true)
      ]);

      // Show add modal
      showAddPhotoModal(photoId, photoPath, thumbPath, file.size);
    } catch (err) {
      console.error('Upload failed:', err);
      App.showToast('上传失败，请重试', 'error');
    }
    e.target.value = '';
  }

  function dataURLtoFile(dataUrl, filename) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    return new File([u8arr], filename, { type: mime });
  }

  function showAddPhotoModal(photoId, photoPath, thumbPath, originalSize) {
    const today = u.todayStr();
    const previewUrl = d.getPublicUrl(thumbPath);

    const formHtml = `
      <div style="text-align:center;margin-bottom:16px"><img src="${previewUrl}" style="border-radius:12px;max-height:200px" alt="预览"></div>
      <div class="form-group"><label class="form-label">日期</label><input type="date" class="form-input" id="ap-date" value="${today}"></div>
      <div class="form-group"><label class="form-label">标题</label><input type="text" class="form-input" id="ap-title" placeholder="给照片取个名字"></div>
      <div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="ap-desc" rows="2" placeholder="照片背后的故事..."></textarea></div>
      <div class="form-group"><label class="form-label">标签（逗号分隔）</label><input type="text" class="form-input" id="ap-tags" placeholder="例如: 满月, 笑脸, 家庭"></div>`;

    App.showModal({
      title: '添加照片',
      body: formHtml,
      async onSave() {
        const date = document.getElementById('ap-date').value;
        const title = document.getElementById('ap-title').value.trim();
        const description = document.getElementById('ap-desc').value.trim();
        const tagsStr = document.getElementById('ap-tags').value.trim();
        if (!date) { App.showToast('请选择日期', 'error'); return false; }

        const tags = tagsStr ? tagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
        const photo = {
          id: photoId, title, description, date, tags, favorite: false, originalSize,
          storage_path: photoPath, _storagePath: photoPath,
          thumb_path: thumbPath, _thumbPath: thumbPath,
          dataUrl: d.getPublicUrl(photoPath),
          thumbnailDataUrl: d.getPublicUrl(thumbPath)
        };

        try {
          await d.addPhoto(photo);
          App.showToast('照片已添加！', 'success');
          App.celebrate();
          return true;
        } catch (e) { App.showToast('保存失败: ' + e.message, 'error'); return false; }
      }
    });
  }

  // ---- Lightbox ----
  function showLightbox(appData, allPhotos, currentPhoto) {
    const photos = allPhotos.filter(p => p.dataUrl);
    let idx = photos.findIndex(p => p.id === currentPhoto.id);
    if (idx < 0) idx = 0;

    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.id = 'lightbox';

    function renderImage() {
      const p = photos[idx];
      overlay.innerHTML = `
        <button class="lightbox-close">✕</button>
        <button class="lightbox-nav lightbox-prev">◀</button>
        <button class="lightbox-nav lightbox-next">▶</button>
        <div class="lightbox-image-wrap"><img src="${p.dataUrl}" alt="${u.escapeHtml(p.title||'')}"></div>
        <div class="lightbox-caption">
          <div class="lightbox-title">${u.escapeHtml(p.title||'无标题')}</div>
          <div class="lightbox-date">${u.formatDate(p.date)} · ${idx+1}/${photos.length}</div>
        </div>
        <div class="lightbox-actions">
          <button id="lb-fav">${p.favorite?'⭐':'☆'}</button>
          <button id="lb-del">🗑️</button>
        </div>`;

      overlay.querySelector('.lightbox-close').onclick = close;
      overlay.querySelector('.lightbox-prev').onclick = () => { if (idx>0){idx--;renderImage();} };
      overlay.querySelector('.lightbox-next').onclick = () => { if (idx<photos.length-1){idx++;renderImage();} };
      overlay.querySelector('#lb-fav').onclick = async (e) => {
        p.favorite = !p.favorite;
        const photo = appData.photos.find(x => x.id === p.id);
        if (photo) photo.favorite = p.favorite;
        await d.updatePhoto(p.id, { favorite: p.favorite });
        if (p.favorite) App.effects.sparkle(e.clientX, e.clientY);
        renderImage();
      };
      overlay.querySelector('#lb-del').onclick = () => {
        App.confirm('确定要删除这张照片吗？', async () => {
          try { await d.deletePhoto(p.id); close(); App.showToast('照片已删除', 'success'); await App.notifyDataChange(); }
          catch(e) { App.showToast('删除失败', 'error'); }
        });
      };
    }

    function close() { overlay.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) {
      if (e.key==='Escape') close();
      if (e.key==='ArrowLeft'&&idx>0) { idx--;renderImage(); }
      if (e.key==='ArrowRight'&&idx<photos.length-1) { idx++;renderImage(); }
    }
    document.addEventListener('keydown', onKey);

    let touchX=0;
    overlay.addEventListener('touchstart', e=>{touchX=e.touches[0].clientX;});
    overlay.addEventListener('touchend', e=>{
      const diff=touchX-e.changedTouches[0].clientX;
      if(Math.abs(diff)>60){ if(diff>0&&idx<photos.length-1)idx++; else if(diff<0&&idx>0)idx--; renderImage(); }
    });

    renderImage();
    document.body.appendChild(overlay);
  }

  return { init, render, destroy: ()=>{}, showLightbox };
})();
