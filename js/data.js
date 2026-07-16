/* ============================================================
   data.js — Supabase REST API (pure fetch, zero dependencies)
   ============================================================ */
window.App = window.App || {};

App.data = (() => {

  const BUCKET = 'media';

  // ---- Helpers ----
  function url()     { return App.config.SUPABASE_URL; }
  function apiKey()  { return App.config.SUPABASE_ANON_KEY; }

  function headers() {
    return {
      'apikey': apiKey(),
      'Authorization': 'Bearer ' + apiKey(),
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async function req(method, path, body) {
    const opts = { method, headers: headers() };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${url()}${path}`, opts);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Supabase ${method} ${path} failed:`, res.status, errText);
      throw new Error(`请求失败 (${res.status})`);
    }

    // For DELETE, might not have JSON body
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // ============================================================
  //  App Config
  // ============================================================
  async function getConfig() {
    const data = await req('GET', '/rest/v1/app_config?id=eq.1&select=*');
    if (!data || data.length === 0) throw new Error('配置数据不存在');
    return data[0];
  }

  async function checkPasscode(input) {
    const data = await req('GET', `/rest/v1/app_config?id=eq.1&passcode=eq.${encodeURIComponent(input)}&select=id`);
    return data && data.length > 0;
  }

  async function updateConfig(updates) {
    return req('PATCH', '/rest/v1/app_config?id=eq.1', updates);
  }

  // ============================================================
  //  Photos
  // ============================================================
  async function getPhotos() {
    const data = await req('GET', '/rest/v1/photos?select=*&order=photo_date.desc');
    return (data || []).map(mapPhoto);
  }

  async function addPhoto(photo) {
    return req('POST', '/rest/v1/photos', unmapPhoto(photo));
  }

  async function updatePhoto(id, updates) {
    const row = {};
    if (updates.favorite !== undefined) row.favorite = updates.favorite;
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.tags !== undefined) row.tags = updates.tags;
    return req('PATCH', `/rest/v1/photos?id=eq.${encodeURIComponent(id)}`, row);
  }

  async function deletePhoto(id) {
    // Get photo paths first for storage cleanup
    try {
      const data = await req('GET', `/rest/v1/photos?id=eq.${encodeURIComponent(id)}&select=storage_path,thumb_path`);
      if (data && data.length > 0) {
        const p = data[0];
        const paths = [p.storage_path];
        if (p.thumb_path) paths.push(p.thumb_path);
        // Remove from storage (don't fail if this errors)
        try { await removeFile(paths); } catch(e) { console.warn('Storage cleanup failed:', e); }
      }
    } catch(e) { /* continue */ }
    return req('DELETE', `/rest/v1/photos?id=eq.${encodeURIComponent(id)}`);
  }

  // Upload file to Supabase Storage via REST
  async function uploadPhotoFile(file, photoId, isThumb) {
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const folder = isThumb ? 'thumbs' : 'photos';
    const path = `${folder}/${photoId}.${ext}`;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${url()}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { 'apikey': apiKey(), 'Authorization': 'Bearer ' + apiKey() },
      body: formData
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Upload failed:', res.status, err);
      throw new Error(`上传失败 (${res.status})`);
    }

    return path;
  }

  // Remove files from storage
  async function removeFile(paths) {
    const pathParams = paths.map(p => `paths=${encodeURIComponent(p)}`).join('&');
    const res = await fetch(`${url()}/storage/v1/object/${BUCKET}?${pathParams}`, {
      method: 'DELETE',
      headers: { 'apikey': apiKey(), 'Authorization': 'Bearer ' + apiKey() }
    });
    if (!res.ok) console.warn('Storage delete failed:', res.status);
  }

  // Get public URL
  function getPublicUrl(path) {
    if (!path) return '';
    return `${url()}/storage/v1/object/public/${path}`;
  }

  function mapPhoto(row) {
    return {
      id: row.id, title: row.title || '', description: row.description || '',
      date: row.photo_date,
      dataUrl: getPublicUrl(row.storage_path),
      thumbnailDataUrl: getPublicUrl(row.thumb_path) || getPublicUrl(row.storage_path),
      tags: row.tags || [], favorite: row.favorite || false,
      originalSize: row.original_size || 0, createdAt: row.created_at
    };
  }

  function unmapPhoto(p) {
    return {
      id: p.id, title: p.title, description: p.description,
      photo_date: p.date, storage_path: p._storagePath || p.storage_path || '',
      thumb_path: p._thumbPath || p.thumb_path || '',
      tags: p.tags, favorite: p.favorite, original_size: p.originalSize
    };
  }

  // ============================================================
  //  Milestones
  // ============================================================
  async function getMilestones() {
    const data = await req('GET', '/rest/v1/milestones?select=*&order=milestone_date.desc');
    return (data || []).map(mapMs);
  }
  async function addMilestone(ms) { return req('POST', '/rest/v1/milestones', unmapMs(ms)); }
  async function updateMilestone(id, u) { return req('PATCH', `/rest/v1/milestones?id=eq.${encodeURIComponent(id)}`, unmapMs(u)); }
  async function deleteMilestone(id) { return req('DELETE', `/rest/v1/milestones?id=eq.${encodeURIComponent(id)}`); }

  function mapMs(row) {
    return { id: row.id, category: row.category, type: row.type, customLabel: row.custom_label,
      date: row.milestone_date, ageInDays: row.age_days, title: row.title, emoji: row.emoji,
      notes: row.notes, photoIds: row.photo_ids || [], createdAt: row.created_at };
  }
  function unmapMs(m) {
    return { id: m.id, category: m.category, type: m.type, custom_label: m.customLabel,
      milestone_date: m.date, age_days: m.ageInDays, title: m.title, emoji: m.emoji,
      notes: m.notes, photo_ids: m.photoIds };
  }

  // ============================================================
  //  Growth Records
  // ============================================================
  async function getGrowthRecords() {
    const data = await req('GET', '/rest/v1/growth_records?select=*&order=record_date.asc');
    return (data || []).map(mapGr);
  }
  async function addGrowthRecord(gr) { return req('POST', '/rest/v1/growth_records', unmapGr(gr)); }
  async function deleteGrowthRecord(id) { return req('DELETE', `/rest/v1/growth_records?id=eq.${encodeURIComponent(id)}`); }

  function mapGr(row) {
    return { id: row.id, date: row.record_date, ageInDays: row.age_days,
      height: row.height, weight: row.weight, headCircumference: row.head_circumference,
      notes: row.notes, createdAt: row.created_at };
  }
  function unmapGr(g) {
    return { id: g.id, record_date: g.date, age_days: g.ageInDays,
      height: g.height, weight: g.weight, head_circumference: g.headCircumference, notes: g.notes };
  }

  // ============================================================
  //  Diary
  // ============================================================
  async function getDiaryEntries() {
    const data = await req('GET', '/rest/v1/diary_entries?select=*&order=entry_date.desc');
    return (data || []).map(mapDe);
  }
  async function addDiaryEntry(de) { return req('POST', '/rest/v1/diary_entries', unmapDe(de)); }
  async function updateDiaryEntry(id, u) { return req('PATCH', `/rest/v1/diary_entries?id=eq.${encodeURIComponent(id)}`, unmapDe(u)); }
  async function deleteDiaryEntry(id) { return req('DELETE', `/rest/v1/diary_entries?id=eq.${encodeURIComponent(id)}`); }

  function mapDe(row) {
    return { id: row.id, date: row.entry_date, title: row.title, content: row.content,
      mood: row.mood, photoIds: row.photo_ids || [], tags: row.tags || [],
      createdAt: row.created_at, updatedAt: row.updated_at };
  }
  function unmapDe(d) {
    return { id: d.id, entry_date: d.date, title: d.title, content: d.content,
      mood: d.mood, photo_ids: d.photoIds, tags: d.tags };
  }

  return {
    getConfig, checkPasscode, updateConfig,
    getPhotos, addPhoto, updatePhoto, deletePhoto, uploadPhotoFile, getPublicUrl,
    getMilestones, addMilestone, updateMilestone, deleteMilestone,
    getGrowthRecords, addGrowthRecord, deleteGrowthRecord,
    getDiaryEntries, addDiaryEntry, updateDiaryEntry, deleteDiaryEntry
  };

})();
