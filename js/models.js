/* ============================================================
   models.js — Data models, validation, constants, WHO reference data
   ============================================================ */

App.models = (() => {
  const u = App.utils;

  // ---- Milestone Type Registry ----
  const MILESTONE_CATEGORIES = [
    { key: 'all',       label: '全部',   emoji: '🌟' },
    { key: 'motor',     label: '大运动', emoji: '💪' },
    { key: 'language',  label: '语言',   emoji: '💬' },
    { key: 'social',    label: '社交',   emoji: '😊' },
    { key: 'cognitive', label: '认知',   emoji: '🧠' },
    { key: 'feeding',   label: '饮食',   emoji: '🍼' },
  ];

  const MILESTONE_TYPES = {
    motor: [
      { key: 'first_lift_head',  title: '第一次抬头',   emoji: '👶', typicalAgeDays: 40 },
      { key: 'first_roll_over',  title: '第一次翻身',   emoji: '🔄', typicalAgeDays: 100 },
      { key: 'first_sit',        title: '第一次独坐',   emoji: '🧘', typicalAgeDays: 180 },
      { key: 'first_crawl',      title: '第一次爬行',   emoji: '🐛', typicalAgeDays: 250 },
      { key: 'first_stand',      title: '第一次扶站',   emoji: '🧍', typicalAgeDays: 300 },
      { key: 'first_walk',       title: '第一次走路',   emoji: '🚶', typicalAgeDays: 370 },
    ],
    language: [
      { key: 'first_coo',        title: '第一次发出声音', emoji: '👶', typicalAgeDays: 50 },
      { key: 'first_laugh',      title: '第一次笑出声',   emoji: '😂', typicalAgeDays: 90 },
      { key: 'first_babble',     title: '第一次咿呀学语', emoji: '🗣️', typicalAgeDays: 160 },
      { key: 'first_word',       title: '第一次叫妈妈/爸爸', emoji: '💝', typicalAgeDays: 330 },
    ],
    social: [
      { key: 'first_smile',      title: '第一次微笑',     emoji: '😊', typicalAgeDays: 45 },
      { key: 'first_stranger',   title: '第一次认生',     emoji: '😰', typicalAgeDays: 220 },
      { key: 'first_wave_bye',   title: '第一次挥手拜拜', emoji: '👋', typicalAgeDays: 300 },
    ],
    cognitive: [
      { key: 'first_track',      title: '第一次追视',     emoji: '👀', typicalAgeDays: 60 },
      { key: 'first_peekaboo',   title: '第一次玩躲猫猫', emoji: '🙈', typicalAgeDays: 220 },
      { key: 'first_imitate',    title: '第一次模仿动作', emoji: '🪞', typicalAgeDays: 280 },
    ],
    feeding: [
      { key: 'first_solid',      title: '第一次吃辅食',   emoji: '🥄', typicalAgeDays: 180 },
      { key: 'first_self_feed',  title: '第一次自己吃饭', emoji: '🍽️', typicalAgeDays: 340 },
      { key: 'first_cup',        title: '第一次用杯子',   emoji: '🥤', typicalAgeDays: 250 },
    ],
  };

  // Flatten milestone types for lookup
  function getAllMilestoneTypes() {
    const all = [];
    for (const cat of Object.keys(MILESTONE_TYPES)) {
      for (const m of MILESTONE_TYPES[cat]) {
        all.push({ ...m, category: cat });
      }
    }
    return all;
  }

  function lookupMilestone(typeKey) {
    for (const cat of Object.keys(MILESTONE_TYPES)) {
      const found = MILESTONE_TYPES[cat].find(m => m.key === typeKey);
      if (found) return { ...found, category: cat };
    }
    return null;
  }

  // ---- WHO Percentile Data (Girls 0-24 months) ----
  // Age in months: height in cm (P3, P15, P50, P85, P97), weight in kg
  const WHO_GIRLS = [
    // ageMon, htP3, htP50, htP97, wtP3, wtP50, wtP97
    [0,  45.6, 49.1, 52.9, 2.4, 3.2, 4.2],
    [1,  49.9, 53.7, 57.4, 3.2, 4.2, 5.4],
    [2,  53.0, 57.1, 61.0, 3.9, 5.1, 6.5],
    [3,  55.6, 59.8, 63.8, 4.5, 5.8, 7.4],
    [4,  57.8, 62.1, 66.2, 5.0, 6.4, 8.1],
    [5,  59.7, 64.0, 68.2, 5.4, 6.9, 8.7],
    [6,  61.2, 65.7, 70.0, 5.7, 7.3, 9.2],
    [7,  62.6, 67.3, 71.6, 6.0, 7.6, 9.6],
    [8,  63.8, 68.7, 73.2, 6.3, 7.9, 10.0],
    [9,  65.0, 70.1, 74.7, 6.5, 8.2, 10.4],
    [10, 66.1, 71.5, 76.1, 6.7, 8.5, 10.7],
    [11, 67.2, 72.8, 77.5, 6.9, 8.7, 11.0],
    [12, 68.2, 74.0, 78.9, 7.1, 8.9, 11.3],
    [13, 69.2, 75.2, 80.2, 7.3, 9.2, 11.6],
    [14, 70.2, 76.4, 81.5, 7.5, 9.4, 11.9],
    [15, 71.1, 77.5, 82.7, 7.7, 9.6, 12.2],
    [16, 72.0, 78.6, 83.9, 7.8, 9.8, 12.4],
    [17, 72.9, 79.7, 85.1, 8.0, 10.0, 12.7],
    [18, 73.8, 80.7, 86.2, 8.2, 10.2, 12.9],
    [19, 74.6, 81.7, 87.3, 8.3, 10.4, 13.2],
    [20, 75.4, 82.7, 88.4, 8.5, 10.6, 13.4],
    [21, 76.2, 83.7, 89.5, 8.7, 10.9, 13.7],
    [22, 77.0, 84.6, 90.5, 8.8, 11.1, 13.9],
    [23, 77.7, 85.5, 91.5, 9.0, 11.3, 14.2],
    [24, 78.5, 86.4, 92.5, 9.2, 11.5, 14.4],
  ];

  // ---- Mood Options ----
  const MOODS = [
    { key: 'joyful',   emoji: '😊', label: '开心' },
    { key: 'tired',    emoji: '🥱', label: '疲惫' },
    { key: 'grateful', emoji: '🙏', label: '感恩' },
    { key: 'worried',  emoji: '😰', label: '担心' },
    { key: 'touched',  emoji: '😭', label: '感动' },
    { key: 'amused',   emoji: '🤣', label: '好笑' },
    { key: 'hopeful',  emoji: '🤩', label: '期待' },
  ];

  // ---- Factory Functions ----
  function createPhoto({ title, description, date, dataUrl, thumbnailDataUrl, tags, originalSize, compressedSize }) {
    return {
      id: u.generateId('p'),
      title: title || '',
      description: description || '',
      date: date || u.todayStr(),
      dataUrl: dataUrl || '',
      thumbnailDataUrl: thumbnailDataUrl || dataUrl || '',
      tags: tags || [],
      favorite: false,
      originalSize: originalSize || 0,
      compressedSize: compressedSize || 0,
      createdAt: new Date().toISOString()
    };
  }

  function createMilestone({ category, type, customLabel, date, notes, photoIds }) {
    const def = type !== 'custom' ? lookupMilestone(type) : null;
    return {
      id: u.generateId('m'),
      category: category || 'custom',
      type: type || 'custom',
      customLabel: customLabel || '',
      date: date || u.todayStr(),
      ageInDays: 0, // computed at save time by caller
      title: def ? def.title : (customLabel || '自定义'),
      emoji: def ? def.emoji : '⭐',
      notes: notes || '',
      photoIds: photoIds || [],
      createdAt: new Date().toISOString()
    };
  }

  function createGrowthRecord({ date, height, weight, headCircumference, notes }) {
    return {
      id: u.generateId('g'),
      date: date || u.todayStr(),
      ageInDays: 0, // computed at save time
      height: height || null,
      weight: weight || null,
      headCircumference: headCircumference || null,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };
  }

  function createDiaryEntry({ date, title, content, mood, photoIds, tags }) {
    return {
      id: u.generateId('d'),
      date: date || u.todayStr(),
      title: title || '',
      content: content || '',
      mood: mood || 'joyful',
      photoIds: photoIds || [],
      tags: tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // ---- Validation ----
  function validateDate(dateStr, birthDate) {
    if (!dateStr) return '请选择日期';
    if (birthDate && dateStr < birthDate) return '日期不能早于宝宝出生日';
    if (dateStr > u.todayStr()) return '日期不能是未来';
    return null;
  }

  function validateGrowthRecord(record, birthDate) {
    const errors = {};
    const dateErr = validateDate(record.date, birthDate);
    if (dateErr) errors.date = dateErr;
    if (record.height != null && (record.height < 30 || record.height > 130))
      errors.height = '身高范围: 30-130cm';
    if (record.weight != null && (record.weight < 1 || record.weight > 30))
      errors.weight = '体重范围: 1-30kg';
    if (record.headCircumference != null && (record.headCircumference < 25 || record.headCircumference > 55))
      errors.headCircumference = '头围范围: 25-55cm';
    return Object.keys(errors).length ? errors : null;
  }

  return {
    MILESTONE_CATEGORIES,
    MILESTONE_TYPES,
    MOODS,
    WHO_GIRLS,
    getAllMilestoneTypes,
    lookupMilestone,
    createPhoto,
    createMilestone,
    createGrowthRecord,
    createDiaryEntry,
    validateDate,
    validateGrowthRecord
  };

})();
