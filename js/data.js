/* ============================================================
   data.js — Supabase 数据层 (替代 storage.js)
   所有 CRUD 操作通过 Supabase REST API
   ============================================================ */

App.data = (() => {

  let client = null;
  const BUCKET = 'media';

  // ---- Init ----
  function init() {
    client = supabase.createClient(App.config.SUPABASE_URL, App.config.SUPABASE_ANON_KEY);
    return client;
  }

  function getClient() {
    if (!client) return init();
    return client;
  }

  // ============================================================
  //  App Config (密码校验 + 宝宝信息)
  // ============================================================
  async function getConfig() {
    const { data, error } = await getClient().from('app_config').select('*').eq('id', 1).single();
    if (error) throw error;
    return data;
  }

  async function checkPasscode(input) {
    const { data, error } = await getClient().from('app_config')
      .select('id').eq('id', 1).eq('passcode', input).single();
    if (error || !data) return false;
    return true;
  }

  async function updateConfig(updates) {
    const { error } = await getClient().from('app_config').update(updates).eq('id', 1);
    if (error) throw error;
  }

  // ============================================================
  //  Photos
  // ============================================================
  async function getPhotos() {
    const { data, error } = await getClient().from('photos')
      .select('*').order('photo_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapPhoto);
  }

  async function addPhoto(photo) {
    const row = unmapPhoto(photo);
    const { error } = await getClient().from('photos').insert(row);
    if (error) throw error;
  }

  async function updatePhoto(id, updates) {
    const row = {};
    if (updates.favorite !== undefined) row.favorite = updates.favorite;
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.tags !== undefined) row.tags = updates.tags;
    const { error } = await getClient().from('photos').update(row).eq('id', id);
    if (error) throw error;
  }

  async function deletePhoto(id) {
    // Also delete from storage
    const { data: photo } = await getClient().from('photos').select('storage_path,thumb_path').eq('id', id).single();
    if (photo) {
      const paths = [photo.storage_path];
      if (photo.thumb_path) paths.push(photo.thumb_path);
      await getClient().storage.from(BUCKET).remove(paths);
    }
    const { error } = await getClient().from('photos').delete().eq('id', id);
    if (error) throw error;
  }

  // Upload photo file to Supabase Storage
  async function uploadPhotoFile(file, photoId, isThumb) {
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const folder = isThumb ? 'thumbs' : 'photos';
    const filename = `${folder}/${photoId}.${ext}`;
    const { data, error } = await getClient().storage.from(BUCKET).upload(filename, file, {
      cacheControl: '31536000',
      upsert: true,
      contentType: file.type || 'image/jpeg'
    });
    if (error) throw error;
    return data.path;
  }

  // Get public URL for a storage path
  function getPublicUrl(path) {
    if (!path) return '';
    return getClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  // Map DB row → app model (add public URLs)
  function mapPhoto(row) {
    return {
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      date: row.photo_date,
      dataUrl: getPublicUrl(row.storage_path),
      thumbnailDataUrl: getPublicUrl(row.thumb_path) || getPublicUrl(row.storage_path),
      tags: row.tags || [],
      favorite: row.favorite || false,
      originalSize: row.original_size || 0,
      createdAt: row.created_at
    };
  }

  function unmapPhoto(p) {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      photo_date: p.date,
      storage_path: p.storage_path || p._storagePath || '',
      thumb_path: p.thumb_path || p._thumbPath || '',
      tags: p.tags,
      favorite: p.favorite,
      original_size: p.originalSize
    };
  }

  // ============================================================
  //  Milestones
  // ============================================================
  async function getMilestones() {
    const { data, error } = await getClient().from('milestones')
      .select('*').order('milestone_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapMs);
  }

  async function addMilestone(ms) {
    const { error } = await getClient().from('milestones').insert(unmapMs(ms));
    if (error) throw error;
  }

  async function updateMilestone(id, updates) {
    const { error } = await getClient().from('milestones').update(unmapMs(updates)).eq('id', id);
    if (error) throw error;
  }

  async function deleteMilestone(id) {
    const { error } = await getClient().from('milestones').delete().eq('id', id);
    if (error) throw error;
  }

  function mapMs(row) {
    return {
      id: row.id, category: row.category, type: row.type,
      customLabel: row.custom_label, date: row.milestone_date,
      ageInDays: row.age_days, title: row.title, emoji: row.emoji,
      notes: row.notes, photoIds: row.photo_ids || [],
      createdAt: row.created_at
    };
  }

  function unmapMs(m) {
    return {
      id: m.id, category: m.category, type: m.type,
      custom_label: m.customLabel, milestone_date: m.date,
      age_days: m.ageInDays, title: m.title, emoji: m.emoji,
      notes: m.notes, photo_ids: m.photoIds
    };
  }

  // ============================================================
  //  Growth Records
  // ============================================================
  async function getGrowthRecords() {
    const { data, error } = await getClient().from('growth_records')
      .select('*').order('record_date', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapGr);
  }

  async function addGrowthRecord(gr) {
    const { error } = await getClient().from('growth_records').insert(unmapGr(gr));
    if (error) throw error;
  }

  async function deleteGrowthRecord(id) {
    const { error } = await getClient().from('growth_records').delete().eq('id', id);
    if (error) throw error;
  }

  function mapGr(row) {
    return {
      id: row.id, date: row.record_date, ageInDays: row.age_days,
      height: row.height, weight: row.weight,
      headCircumference: row.head_circumference,
      notes: row.notes, createdAt: row.created_at
    };
  }

  function unmapGr(g) {
    return {
      id: g.id, record_date: g.date, age_days: g.ageInDays,
      height: g.height, weight: g.weight,
      head_circumference: g.headCircumference, notes: g.notes
    };
  }

  // ============================================================
  //  Diary Entries
  // ============================================================
  async function getDiaryEntries() {
    const { data, error } = await getClient().from('diary_entries')
      .select('*').order('entry_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapDe);
  }

  async function addDiaryEntry(de) {
    const { error } = await getClient().from('diary_entries').insert(unmapDe(de));
    if (error) throw error;
  }

  async function updateDiaryEntry(id, updates) {
    const { error } = await getClient().from('diary_entries').update(unmapDe(updates)).eq('id', id);
    if (error) throw error;
  }

  async function deleteDiaryEntry(id) {
    const { error } = await getClient().from('diary_entries').delete().eq('id', id);
    if (error) throw error;
  }

  function mapDe(row) {
    return {
      id: row.id, date: row.entry_date, title: row.title,
      content: row.content, mood: row.mood,
      photoIds: row.photo_ids || [], tags: row.tags || [],
      createdAt: row.created_at, updatedAt: row.updated_at
    };
  }

  function unmapDe(d) {
    return {
      id: d.id, entry_date: d.date, title: d.title,
      content: d.content, mood: d.mood,
      photo_ids: d.photoIds, tags: d.tags
    };
  }

  return {
    init, getClient,
    getConfig, checkPasscode, updateConfig,
    getPhotos, addPhoto, updatePhoto, deletePhoto, uploadPhotoFile, getPublicUrl,
    getMilestones, addMilestone, updateMilestone, deleteMilestone,
    getGrowthRecords, addGrowthRecord, deleteGrowthRecord,
    getDiaryEntries, addDiaryEntry, updateDiaryEntry, deleteDiaryEntry
  };

})();
