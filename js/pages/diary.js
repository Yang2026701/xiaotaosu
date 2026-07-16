/* ============================================================
   diary.js — Parent Diary (Supabase)
   ============================================================ */

App.pages.diary = (() => {
  const u = App.utils; const m = App.models; const d = App.data;
  const container = () => document.getElementById('page-diary');
  let viewingDetail = false, detailEntryId = null;

  function init() {}

  function render(appData) {
    const entries = [...(appData.diaryEntries||[])].sort((a,b)=>b.date.localeCompare(a.date));

    if (viewingDetail && detailEntryId) {
      const entry = entries.find(e=>e.id===detailEntryId);
      if (entry) { renderDetail(appData, entry); return; }
      viewingDetail = false;
    }

    if (entries.length === 0) {
      container().innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">还没有日记哦</div><div class="empty-desc">记录和小桃酥在一起的每一个温暖瞬间~</div></div>';
      return;
    }

    let html = '<div class="diary-list">';
    entries.forEach(entry => {
      const mood = m.MOODS.find(x=>x.key===entry.mood)||m.MOODS[0];
      const photos = (entry.photoIds||[]).map(pid=>appData.photos.find(p=>p.id===pid)).filter(Boolean);
      html += `<div class="diary-card" data-id="${entry.id}">
        <div class="diary-card-header"><span class="diary-mood">${mood.emoji}</span><span class="diary-card-date">${u.formatDate(entry.date)}</span></div>
        <div class="diary-card-title">${u.escapeHtml(entry.title||'无标题')}</div>
        <div class="diary-card-preview">${u.escapeHtml(entry.content||'')}</div>
        <div class="diary-card-footer">${photos.length>0?`<span class="diary-photo-count">📷 ${photos.length}张照片</span>`:''}${(entry.tags||[]).map(t=>`<span class="diary-tag">#${u.escapeHtml(t)}</span>`).join('')}</div>
      </div>`;
    });
    html += '</div>';
    container().innerHTML = html;

    container().querySelectorAll('.diary-card').forEach(card => {
      App.effects.initTilt(card, { maxTilt: 4, scale: 1.01 });
      card.addEventListener('click', () => { viewingDetail=true; detailEntryId=card.dataset.id; render(appData); });
    });
  }

  function renderDetail(appData, entry) {
    const mood = m.MOODS.find(x=>x.key===entry.mood)||m.MOODS[0];
    const photos = (entry.photoIds||[]).map(pid=>appData.photos.find(p=>p.id===pid)).filter(Boolean);

    let html = '<div class="diary-detail">';
    html += '<button class="btn btn-secondary btn-sm" id="btn-dback" style="margin-bottom:16px">← 返回</button>';
    html += `<div class="diary-detail-header"><div class="diary-detail-date">${u.formatDate(entry.date)}</div><div class="diary-detail-mood">${mood.emoji} ${mood.label}</div><h2 class="diary-detail-title">${u.escapeHtml(entry.title||'无标题')}</h2></div>`;
    html += `<div class="diary-detail-content">${u.escapeHtml(entry.content||'')}</div>`;

    if (photos.length>0) {
      html += '<div class="diary-detail-photos">';
      photos.forEach(p=>{ html += `<img src="${p.thumbnailDataUrl||p.dataUrl}" alt="${u.escapeHtml(p.title||'')}" data-photo-id="${p.id}">`; });
      html += '</div>';
    }
    if (entry.tags?.length) { html += '<div class="diary-detail-tags">'+entry.tags.map(t=>`<span class="chip">#${u.escapeHtml(t)}</span>`).join('')+'</div>'; }

    html += '<div class="diary-detail-actions"><button class="btn btn-primary btn-sm" id="btn-dedit">✏️ 编辑</button><button class="btn btn-danger btn-sm" id="btn-ddel">🗑️ 删除</button></div></div>';
    container().innerHTML = html;

    document.getElementById('btn-dback').addEventListener('click', () => { viewingDetail=false; detailEntryId=null; render(appData); });
    document.getElementById('btn-dedit').addEventListener('click', () => { viewingDetail=false; detailEntryId=null; showForm(appData, entry); });
    document.getElementById('btn-ddel').addEventListener('click', () => {
      App.confirm('确定删除这篇日记吗？', async () => {
        try { await d.deleteDiaryEntry(entry.id); viewingDetail=false; detailEntryId=null; App.showToast('已删除','success'); await App.notifyDataChange(); }
        catch(e) { App.showToast('删除失败','error'); }
      });
    });

    container().querySelectorAll('.diary-detail-photos img').forEach(img => {
      img.addEventListener('click', () => {
        const photo = appData.photos.find(p=>p.id===img.dataset.photoId);
        if (photo) App.pages.album.showLightbox(appData, appData.photos, photo);
      });
    });
  }

  function showForm(appData, existing) {
    const isEdit = !!existing, today = u.todayStr();
    const emojis = m.MOODS.map(mood => `<button class="mood-option${(!existing&&mood.key==='joyful')||(existing&&existing.mood===mood.key)?' selected':''}" data-mood="${mood.key}" title="${mood.label}">${mood.emoji}</button>`).join('');

    const html = `
      <div class="form-group"><label class="form-label">日期</label><input type="date" class="form-input" id="dy-date" value="${existing?existing.date:today}"></div>
      <div class="form-group"><label class="form-label">标题</label><input type="text" class="form-input" id="dy-title" value="${existing?u.escapeHtml(existing.title||''):''}" placeholder="给这篇日记起个标题"></div>
      <div class="form-group"><label class="form-label">心情</label><div class="mood-selector" id="dy-mood">${emojis}</div></div>
      <div class="form-group"><label class="form-label">内容</label><textarea class="form-textarea" id="dy-content" rows="6" placeholder="今天发生了什么...">${existing?u.escapeHtml(existing.content||''):''}</textarea></div>
      <div class="form-group"><label class="form-label">标签（逗号分隔）</label><input type="text" class="form-input" id="dy-tags" value="${existing?(existing.tags||[]).join(', '):''}" placeholder="例如: 出生, 医院"></div>`;

    let selMood = existing ? existing.mood : 'joyful';

    App.showModal({
      title: isEdit ? '编辑日记' : '写日记',
      body: html,
      onOpen() {
        document.querySelectorAll('#dy-mood .mood-option').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('#dy-mood .mood-option').forEach(b=>b.classList.remove('selected'));
            btn.classList.add('selected'); selMood = btn.dataset.mood;
          });
        });
      },
      async onSave() {
        const date = document.getElementById('dy-date').value;
        const title = document.getElementById('dy-title').value.trim();
        const content = document.getElementById('dy-content').value.trim();
        const tags = (document.getElementById('dy-tags').value.trim()||'').split(/[,，]/).map(t=>t.trim()).filter(Boolean);
        if (!date) { App.showToast('请选择日期','error'); return false; }
        if (!title) { App.showToast('请输入标题','error'); return false; }

        try {
          const entry = { date, title, content, mood: selMood, tags, photoIds: existing ? existing.photoIds : [] };
          if (isEdit) {
            await d.updateDiaryEntry(existing.id, entry);
            App.showToast('日记已更新','success');
          } else {
            entry.id = u.generateId('d');
            await d.addDiaryEntry(entry);
            App.showToast('日记已保存','success');
            App.celebrate();
          }
          return true;
        } catch(e) { App.showToast('保存失败: '+e.message, 'error'); return false; }
      }
    });
  }

  return { init, render, destroy: ()=>{ viewingDetail=false;detailEntryId=null; }, showAddForm: (d) => showForm(d, null) };
})();
