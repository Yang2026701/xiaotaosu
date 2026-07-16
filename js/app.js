/* ============================================================
   app.js — 密码锁 → 欢迎页 → 主应用 (Supabase 驱动)
   ============================================================ */

(() => {
  const u = App.utils;
  const data = App.data;
  const models = App.models;
  const pages = App.pages;

  // State
  let appData = null;       // { settings, photos, milestones, growthRecords, diaryEntries }
  let activeTab = 'album';
  let isFirstRun = false;

  // DOM
  const $lock = document.getElementById('lock-screen');
  const $welcome = document.getElementById('welcome-page');
  const $main = document.getElementById('main-app');
  const $content = document.getElementById('content');
  const $fab = document.getElementById('fab');
  const $ageDisplay = document.getElementById('age-display');
  const $appTitle = document.getElementById('app-title');
  const $tabBar = document.getElementById('tab-bar');
  const $modalOverlay = document.getElementById('modal-overlay');
  const $modalTitle = document.getElementById('modal-title');
  const $modalBody = document.getElementById('modal-body');
  const $modalFooter = document.getElementById('modal-footer');
  const $confirmOverlay = document.getElementById('confirm-overlay');
  const $confirmMsg = document.getElementById('confirm-message');
  const $toastContainer = document.getElementById('toast-container');
  const $settingsBtn = document.getElementById('btn-settings');

  let modalCallbacks = {};
  let welcomeCanvasCtx = null, welcomeAnimId = null, welcomeParticles = [];

  // ============================================================
  //  Bootstrap — show lock screen first
  // ============================================================
  function init() {
    data.init(); // Init Supabase client
    initLockScreen();
    startLockParticles();
  }

  // ============================================================
  //  Lock Screen
  // ============================================================
  function initLockScreen() {
    const passcode = sessionStorage.getItem('xts_passcode');
    if (passcode) {
      // Already authenticated this session — try to skip lock
      checkAndEnter(passcode);
      return;
    }

    document.getElementById('lock-submit').addEventListener('click', () => {
      const input = document.getElementById('lock-passcode').value.trim();
      if (!input) return;
      checkAndEnter(input);
    });

    document.getElementById('lock-passcode').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const input = e.target.value.trim();
        if (input) checkAndEnter(input);
      }
    });
  }

  async function checkAndEnter(input) {
    const lockBtn = document.getElementById('lock-submit');
    const lockErr = document.getElementById('lock-error');
    lockBtn.textContent = '...';
    lockBtn.disabled = true;
    lockErr.textContent = '';

    // First, get config from Supabase (validates connection too)
    try {
      const config = await data.getConfig();
      if (config.passcode === input) {
        // Success!
        sessionStorage.setItem('xts_passcode', input);
        await unlock(config);
      } else {
        lockErr.textContent = '密码错误，请重试';
        lockBtn.textContent = '进入';
        lockBtn.disabled = false;
      }
    } catch (e) {
      console.error('Supabase connection error:', e);
      lockErr.textContent = '连接失败，请检查网络后刷新页面';
      lockBtn.textContent = '进入';
      lockBtn.disabled = false;
    }
  }

  async function unlock(config) {
    $lock.classList.add('unlock');
    stopLockParticles();

    // Build app data from config
    appData = {
      settings: {
        babyName: config.baby_name || '小桃酥',
        birthDate: config.birth_date || '2026-07-16',
        birthHeight: config.birth_height || 50,
        birthWeight: config.birth_weight || 3.3,
        passcode: config.passcode
      },
      photos: [], milestones: [], growthRecords: [], diaryEntries: []
    };

    // Check if first run (no growth records)
    try {
      const records = await data.getGrowthRecords();
      isFirstRun = records.length === 0;
      if (isFirstRun) {
        // Create initial birth record
        const birthRecord = {
          id: u.generateId('g'),
          date: appData.settings.birthDate,
          ageInDays: 0,
          height: appData.settings.birthHeight,
          weight: appData.settings.birthWeight,
          headCircumference: null,
          notes: '出生时测量'
        };
        await data.addGrowthRecord(birthRecord);
      }
    } catch (e) {
      console.error('Error checking first run:', e);
    }

    setTimeout(() => {
      $lock.style.display = 'none';
      showWelcome();
    }, 400);
  }

  // Lock screen particles
  function startLockParticles() {
    const canvas = document.getElementById('lock-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);

    const colors = ['rgba(255,160,122,0.3)','rgba(255,182,161,0.28)','rgba(255,145,164,0.25)','rgba(255,220,200,0.28)'];
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 4 + Math.random() * 14,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: 0.3 + Math.random() * 0.7,
      rot: Math.random() * Math.PI * 2,
      rotSp: (Math.random() - 0.5) * 0.02,
      op: 0.12 + Math.random() * 0.25,
      color: colors[Math.floor(Math.random() * colors.length)],
      wob: Math.random() * Math.PI * 2,
      wobSp: 0.005 + Math.random() * 0.015,
      wobA: 0.4 + Math.random() * 1.8
    }));

    (function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.wob += p.wobSp;
        p.x += p.speedX + Math.sin(p.wob) * p.wobA * 0.04;
        p.y += p.speedY;
        p.rot += p.rotSp;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.bezierCurveTo(-s*0.4,-s*0.7,-s*0.1,-s,s*0.3,-s*0.5);
        ctx.bezierCurveTo(s*0.5,-s*0.2,s*0.5,-s*0.05,s*0.2,s*0.05);
        ctx.bezierCurveTo(s*0.1,s*0.1,-s*0.2,s*0.05,-s*0.3,-s*0.1);
        ctx.bezierCurveTo(-s*0.4,-s*0.3,-s*0.5,-s*0.5,0,0);
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.op})`);
        ctx.fill(); ctx.restore();
        if (p.y > canvas.height + 30) { p.y = -30; p.x = Math.random() * canvas.width; }
        if (p.x > canvas.width + 30) p.x = -30;
        if (p.x < -30) p.x = canvas.width + 30;
      }
      welcomeAnimId = requestAnimationFrame(animate);
    })();
  }
  function stopLockParticles() { if (welcomeAnimId) cancelAnimationFrame(welcomeAnimId); }

  // ============================================================
  //  Welcome Page
  // ============================================================
  function showWelcome() {
    $welcome.hidden = false;
    $main.hidden = true;
    updateWelcomeInfo();
    startWelcomeParticles();
    document.getElementById('btn-enter-app').addEventListener('click', enterApp);
  }

  async function updateWelcomeInfo() {
    const s = appData.settings;
    const age = u.calcAge(s.birthDate, u.todayStr());
    try {
      const photos = await data.getPhotos();
      const milestones = await data.getMilestones();
      const achieved = new Set(milestones.filter(m => m.type !== 'custom').map(m => m.type));
      document.getElementById('welcome-baby-name').textContent = s.babyName;
      document.getElementById('ws-age').textContent = age.text;
      document.getElementById('ws-photos').textContent = photos.length;
      document.getElementById('ws-milestones').textContent = achieved.size;
    } catch (e) {
      console.error('Error loading welcome stats:', e);
      document.getElementById('ws-age').textContent = age.text;
      document.getElementById('ws-photos').textContent = '--';
      document.getElementById('ws-milestones').textContent = '--';
    }
  }

  function startWelcomeParticles() {
    const canvas = document.getElementById('welcome-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    const colors = ['rgba(255,160,122,0.35)','rgba(255,182,161,0.3)','rgba(255,145,164,0.28)','rgba(255,220,200,0.25)'];
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      size: 4 + Math.random() * 16, speedX: (Math.random()-0.5)*0.45,
      speedY: 0.3 + Math.random()*0.8, rot: Math.random()*Math.PI*2,
      rotSp: (Math.random()-0.5)*0.022,
      op: 0.14 + Math.random()*0.3, color: colors[Math.floor(Math.random()*colors.length)],
      wob: Math.random()*Math.PI*2, wobSp: 0.005+Math.random()*0.018,
      wobA: 0.5+Math.random()*2.2
    }));
    (function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.wob += p.wobSp; p.x += p.speedX + Math.sin(p.wob)*p.wobA*0.04;
        p.y += p.speedY; p.rot += p.rotSp;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.bezierCurveTo(-s*0.4,-s*0.7,-s*0.1,-s,s*0.3,-s*0.5);
        ctx.bezierCurveTo(s*0.5,-s*0.2,s*0.5,-s*0.05,s*0.2,s*0.05);
        ctx.bezierCurveTo(s*0.1,s*0.1,-s*0.2,s*0.05,-s*0.3,-s*0.1);
        ctx.bezierCurveTo(-s*0.4,-s*0.3,-s*0.5,-s*0.5,0,0);
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.op})`);
        ctx.fill(); ctx.restore();
        if (p.y > canvas.height+30) { p.y=-30; p.x=Math.random()*canvas.width; }
        if (p.x > canvas.width+30) p.x=-30;
        if (p.x < -30) p.x=canvas.width+30;
      }
      requestAnimationFrame(animate);
    })();
  }

  async function enterApp() {
    $welcome.classList.add('exit');
    setTimeout(async () => {
      $welcome.style.display = 'none';
      await setupApp();
    }, 450);
  }

  // ============================================================
  //  Main App Setup (async — loads data from Supabase)
  // ============================================================
  async function setupApp() {
    $main.hidden = false;
    $main.offsetHeight;

    App.particles.init();
    updateAgeDisplay();
    updateAppTitle();

    // Hash routing
    const hash = location.hash.replace('#', '');
    if (['album','milestones','growth','diary','settings'].includes(hash)) activeTab = hash;
    else { activeTab = 'album'; location.hash = 'album'; }

    await loadAllData();
    navigateTo(activeTab);

    // Tab clicks
    $tabBar.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => { location.hash = btn.dataset.tab; });
    });
    window.addEventListener('hashchange', async () => {
      const tab = location.hash.replace('#', '');
      if (['album','milestones','growth','diary','settings'].includes(tab)) {
        await loadAllData();
        navigateTo(tab);
      }
    });

    $settingsBtn.addEventListener('click', () => { location.hash = 'settings'; });
    $fab.addEventListener('click', handleFabClick);
    $modalOverlay.addEventListener('click', (e) => { if (e.target === $modalOverlay) closeModal(); });
    $confirmOverlay.addEventListener('click', (e) => { if (e.target === $confirmOverlay) closeConfirm(); });
    document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!$confirmOverlay.hidden) closeConfirm();
        else if (!$modalOverlay.hidden) closeModal();
      }
    });

    pages.album.init();
    pages.milestones.init();
    pages.growth.init();
    pages.diary.init();
    setInterval(updateAgeDisplay, 60000);
  }

  async function loadAllData() {
    try {
      const [photos, milestones, growthRecords, diaryEntries] = await Promise.all([
        data.getPhotos(), data.getMilestones(), data.getGrowthRecords(), data.getDiaryEntries()
      ]);
      appData.photos = photos;
      appData.milestones = milestones;
      appData.growthRecords = growthRecords;
      appData.diaryEntries = diaryEntries;
    } catch (e) {
      console.error('Error loading data:', e);
      App.showToast('数据加载失败，请刷新重试', 'error');
    }
  }

  function navigateTo(tab) {
    document.querySelectorAll('.page').forEach(p => p.hidden = true);
    const pageEl = document.getElementById('page-' + tab);
    if (pageEl) pageEl.hidden = false;
    $tabBar.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    $fab.classList.toggle('hidden', tab === 'settings');
    if (activeTab !== tab && activeTab === 'growth') pages.growth.destroy();
    activeTab = tab;
    renderActivePage();
    $content.scrollTop = 0;
  }

  function renderActivePage() {
    switch (activeTab) {
      case 'album':      pages.album.render(appData); break;
      case 'milestones': pages.milestones.render(appData); break;
      case 'growth':     pages.growth.render(appData); break;
      case 'diary':      pages.diary.render(appData); break;
      case 'settings':   renderSettings(); break;
    }
  }

  // ---- FAB ----
  function handleFabClick(e) {
    App.effects.ripple(e, $fab);
    switch (activeTab) {
      case 'album': document.getElementById('photo-input').click(); break;
      case 'milestones': pages.milestones.showAddForm(appData); break;
      case 'growth': document.getElementById('btn-add-growth')?.click(); break;
      case 'diary': pages.diary.showAddForm(appData); break;
    }
  }

  // ---- Public API ----
  App.notifyDataChange = async function() {
    await loadAllData();
    updateAgeDisplay();
    renderActivePage();
  };
  App.getData = function() { return appData; };
  App.celebrate = function() { App.effects.celebrate(2500); };

  function updateAgeDisplay() {
    if (!appData?.settings?.birthDate) { $ageDisplay.textContent = '--'; return; }
    const age = u.calcAge(appData.settings.birthDate, u.todayStr());
    $ageDisplay.textContent = `${u.formatDate(appData.settings.birthDate)} 出生 · 现在 ${age.text} 啦`;
  }
  function updateAppTitle() {
    $appTitle.textContent = `${appData?.settings?.babyName || '宝宝'}的成长记录`;
  }

  // ---- Modal ----
  App.showModal = function({ title, body, onSave, onOpen }) {
    $modalTitle.textContent = title || '';
    $modalBody.innerHTML = body || '';
    $modalFooter.innerHTML = `<button class="btn btn-secondary" id="modal-cancel">取消</button><button class="btn btn-primary" id="modal-save">保存</button>`;
    $modalOverlay.hidden = false;
    modalCallbacks = { onSave };
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-save').addEventListener('click', async () => {
      if (modalCallbacks.onSave) {
        const result = await modalCallbacks.onSave();
        if (result === false) return;
      }
      closeModal();
      await App.notifyDataChange();
    });
    if (onOpen) onOpen();
    setTimeout(() => {
      const first = $modalBody.querySelector('input, textarea, select, button');
      if (first) first.focus();
    }, 100);
    return { close: closeModal };
  };
  function closeModal() { $modalOverlay.hidden = true; $modalBody.innerHTML = ''; modalCallbacks = {}; }

  // ---- Confirm ----
  App.confirm = function(msg, cb) {
    $confirmMsg.textContent = msg; $confirmOverlay.hidden = false;
    const ok = document.getElementById('confirm-ok');
    const newOk = ok.cloneNode(true);
    ok.parentNode.replaceChild(newOk, ok);
    newOk.addEventListener('click', () => { closeConfirm(); cb(); });
  };
  function closeConfirm() { $confirmOverlay.hidden = true; }

  // ---- Toast ----
  App.showToast = function(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' toast-' + type : '');
    t.textContent = msg; $toastContainer.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.remove(); }, 2500);
  };

  // ---- Settings ----
  function renderSettings() {
    const s = appData.settings;
    const html = `
      <div class="settings-section"><h3>宝宝信息</h3><div class="settings-card">
        ${sr('名字', u.escapeHtml(s.babyName), 'babyName')}
        ${sr('生日', u.formatDate(s.birthDate), 'birthDate')}
        ${sr('出生身高', s.birthHeight+' cm', 'birthHeight')}
        ${sr('出生体重', s.birthWeight+' kg', 'birthWeight')}
      </div></div>
      <div class="settings-section"><h3>安全设置</h3><div class="settings-card">
        ${sr('访问密码', '••••••', 'passcode')}
      </div></div>
      <div class="settings-section"><h3>关于</h3><div class="settings-card">
        <div class="settings-row"><span class="settings-row-label">存储方式</span><span class="settings-row-value">Supabase 云端</span></div>
        <div class="settings-row"><span class="settings-row-label">数据互通</span><span class="settings-row-value">手机·电脑·iPad</span></div>
        <div class="settings-row"><span class="settings-row-label">托管平台</span><span class="settings-row-value">GitHub Pages</span></div>
      </div></div>
      <div style="text-align:center;margin:32px 0;color:#BCAAA4;font-size:12px">🍑 小桃酥的成长记录 · 云端版</div>`;

    document.getElementById('page-settings').innerHTML = html;

    document.querySelectorAll('.btn-edit-setting').forEach(btn => {
      btn.addEventListener('click', () => editSetting(btn.dataset.field));
    });
  }

  function sr(label, value, field) {
    return `<div class="settings-row"><span class="settings-row-label">${label}</span><span class="settings-row-value">${value}</span><button class="settings-row-action btn-edit-setting" data-field="${field}">编辑</button></div>`;
  }

  async function editSetting(field) {
    const s = appData.settings;
    const labels = { babyName:'宝宝名字', birthDate:'生日', birthHeight:'出生身高(cm)', birthWeight:'出生体重(kg)', passcode:'访问密码' };
    let inputHtml;
    if (field === 'birthDate') {
      inputHtml = `<input type="date" class="form-input" id="set-value" value="${s.birthDate}" max="${u.todayStr()}">`;
    } else if (field === 'passcode') {
      inputHtml = `<input type="text" class="form-input" id="set-value" value="${s.passcode}" placeholder="新密码" maxlength="20"><div class="form-hint" style="margin-top:8px">修改后需用新密码重新登录</div>`;
    } else {
      inputHtml = `<input type="${field==='babyName'?'text':'number'}" class="form-input" id="set-value" value="${field==='babyName'?s.babyName:s[field]}" ${field!=='babyName'?'step="0.1"':''}>`;
    }

    App.showModal({
      title: '编辑'+labels[field],
      body: inputHtml,
      async onSave() {
        const val = document.getElementById('set-value').value;
        if (!val) return false;
        try {
          if (field === 'babyName') { s.babyName = val.trim()||'宝宝'; await data.updateConfig({ baby_name: s.babyName }); }
          else if (field === 'birthDate') { s.birthDate = val; await data.updateConfig({ birth_date: s.birthDate }); }
          else if (field === 'birthHeight') { s.birthHeight = parseFloat(val); await data.updateConfig({ birth_height: s.birthHeight }); }
          else if (field === 'birthWeight') { s.birthWeight = parseFloat(val); await data.updateConfig({ birth_weight: s.birthWeight }); }
          else if (field === 'passcode') {
            s.passcode = val;
            await data.updateConfig({ passcode: val });
            sessionStorage.setItem('xts_passcode', val);
          }
          updateAgeDisplay(); updateAppTitle();
          App.showToast('已更新', 'success');
          return true;
        } catch (e) { App.showToast('更新失败: '+e.message, 'error'); return false; }
      }
    });
  }

  // Start
  init();
})();
