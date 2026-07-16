/* ============================================================
   milestones.js — Growth Milestones (Supabase)
   ============================================================ */

App.pages.milestones = (() => {
  const u = App.utils;
  const m = App.models;
  const d = App.data;
  const container = () => document.getElementById('page-milestones');
  let activeCategory = 'all';

  function init() {}

  function render(appData) {
    const milestones = appData.milestones || [];
    const birthDate = appData.settings.birthDate;
    const currentAge = u.calcAge(birthDate, u.todayStr());
    const allTypes = m.getAllMilestoneTypes();
    const achievedKeys = new Set(milestones.filter(ms => ms.type !== 'custom').map(ms => ms.type));

    let display = [...milestones].sort((a, b) => b.date.localeCompare(a.date));
    if (activeCategory !== 'all') display = display.filter(ms => ms.category === activeCategory);

    const upcoming = allTypes.filter(t => {
      if (activeCategory !== 'all' && t.category !== activeCategory) return false;
      return !achievedKeys.has(t.key);
    });

    let html = '';
    html += `<div class="milestone-summary">
      <div class="milestone-stat"><div class="milestone-stat-value">${currentAge.text}</div><div class="milestone-stat-label">当前月龄</div></div>
      <div class="milestone-stat"><div class="milestone-stat-value">${achievedKeys.size}</div><div class="milestone-stat-label">已达成里程碑</div></div>
    </div>`;

    html += '<div class="chip-list" id="milestone-filters">';
    m.MILESTONE_CATEGORIES.forEach(cat => {
      const count = cat.key === 'all' ? achievedKeys.size : allTypes.filter(t => t.category === cat.key && achievedKeys.has(t.key)).length;
      const total = cat.key === 'all' ? allTypes.length : allTypes.filter(t => t.category === cat.key).length;
      html += `<button class="chip${activeCategory===cat.key?' active':''}" data-cat="${cat.key}">${cat.emoji} ${cat.label} <span class="chip-count">${count}/${total}</span></button>`;
    });
    html += '</div>';

    if (display.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">还没有记录里程碑</div><div class="empty-desc">记录小桃酥的每一个"第一次"吧~</div></div>';
    } else {
      html += '<div class="milestone-list">';
      display.forEach(ms => {
        const age = u.calcAge(birthDate, ms.date);
        html += `<div class="milestone-card">
          <div class="milestone-emoji">${ms.emoji||'⭐'}</div>
          <div class="milestone-info">
            <h3>${u.escapeHtml(ms.title)}</h3>
            <div class="milestone-meta">${u.formatDate(ms.date)} · 第${age.totalDays}天 (${age.text})</div>
            ${ms.notes?`<div class="milestone-notes">${u.escapeHtml(ms.notes)}</div>`:''}
            <div class="milestone-actions">
              <button class="btn btn-sm btn-secondary btn-edit-ms" data-id="${ms.id}">✏️ 编辑</button>
              <button class="btn btn-sm btn-secondary btn-del-ms" data-id="${ms.id}">🗑️ 删除</button>
            </div>
          </div></div>`;
      });
      html += '</div>';
    }

    if (upcoming.length > 0) {
      html += '<h3 style="font-size:14px;color:#BCAAA4;margin:24px 0 12px">🔮 即将到来</h3><div class="milestone-list">';
      upcoming.forEach(t => {
        html += `<div class="milestone-card upcoming"><div class="milestone-emoji">${t.emoji}</div><div class="milestone-info"><h3>${t.title}</h3><div class="milestone-meta">预计 ${formatTypicalAge(t.typicalAgeDays)}</div></div></div>`;
      });
      html += '</div>';
    }

    container().innerHTML = html;

    container().querySelectorAll('#milestone-filters .chip').forEach(chip => {
      chip.addEventListener('click', () => { activeCategory = chip.dataset.cat; render(appData); });
    });

    container().querySelectorAll('.btn-edit-ms').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ms = milestones.find(x => x.id === btn.dataset.id);
        if (ms) showForm(appData, ms);
      });
    });

    container().querySelectorAll('.btn-del-ms').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        App.confirm('确定要删除这个里程碑吗？', async () => {
          try {
            await d.deleteMilestone(btn.dataset.id);
            App.showToast('里程碑已删除', 'success');
            await App.notifyDataChange();
          } catch (e) { App.showToast('删除失败', 'error'); }
        });
      });
    });
  }

  function formatTypicalAge(days) {
    return days < 60 ? `${days}天左右` : `~${Math.round(days/30)}个月`;
  }

  // ---- Form ----
  function showForm(appData, existing) {
    const isEdit = !!existing;
    const birthDate = appData.settings.birthDate;
    const today = u.todayStr();

    let html = '<div class="form-group"><label class="form-label">分类</label><div class="chip-list" id="ms-cat">';
    m.MILESTONE_CATEGORIES.filter(c=>c.key!=='all').forEach(cat => {
      html += `<button class="chip${existing&&existing.category===cat.key?' active':''}" data-cat="${cat.key}">${cat.emoji} ${cat.label}</button>`;
    });
    html += '</div></div>';
    html += '<div class="form-group"><label class="form-label">里程碑类型</label><select class="form-select" id="ms-type"><option value="">-- 选择类型 --</option></select></div>';
    html += '<div class="form-group" id="ms-custom-grp" style="display:none"><label class="form-label">自定义名称</label><input class="form-input" id="ms-custom" placeholder="例如：第一次游泳"></div>';
    html += `<div class="form-group"><label class="form-label">日期 *</label><input type="date" class="form-input" id="ms-date" value="${existing?existing.date:today}" min="${birthDate}" max="${today}"></div>`;
    html += '<div class="form-group"><label class="form-label">备注</label><textarea class="form-textarea" id="ms-notes" rows="2" placeholder="记录这一刻..."></textarea></div>';

    let selCat = existing ? existing.category : 'motor';
    let selType = existing ? existing.type : '';

    App.showModal({
      title: isEdit ? '编辑里程碑' : '添加里程碑',
      body: html,
      onOpen() {
        if (existing) document.getElementById('ms-notes').value = existing.notes || '';
        if (existing?.customLabel) document.getElementById('ms-custom').value = existing.customLabel;

        function updateTypes(cat) {
          const types = m.MILESTONE_TYPES[cat] || [];
          const sel = document.getElementById('ms-type');
          sel.innerHTML = '<option value="">-- 选择类型 --</option>';
          types.forEach(t => { sel.innerHTML += `<option value="${t.key}">${t.emoji} ${t.title}</option>`; });
          sel.innerHTML += '<option value="custom">⭐ 自定义</option>';
          if (selType) sel.value = selType;
          document.getElementById('ms-custom-grp').style.display = sel.value === 'custom' ? 'block' : 'none';
        }
        updateTypes(selCat);

        document.querySelectorAll('#ms-cat .chip').forEach(chip => {
          chip.addEventListener('click', () => {
            document.querySelectorAll('#ms-cat .chip').forEach(c=>c.classList.remove('active'));
            chip.classList.add('active'); selCat = chip.dataset.cat; selType = ''; updateTypes(selCat);
          });
        });
        document.getElementById('ms-type').addEventListener('change', function() {
          document.getElementById('ms-custom-grp').style.display = this.value === 'custom' ? 'block' : 'none';
        });
      },
      async onSave() {
        const type = document.getElementById('ms-type').value;
        const customLabel = document.getElementById('ms-custom').value.trim();
        const date = document.getElementById('ms-date').value;
        const notes = document.getElementById('ms-notes').value.trim();
        if (!date) { App.showToast('请选择日期','error'); return false; }
        if (!type) { App.showToast('请选择里程碑类型','error'); return false; }
        if (type==='custom' && !customLabel) { App.showToast('请输入名称','error'); return false; }

        const def = type !== 'custom' ? m.lookupMilestone(type) : null;
        const msData = {
          category: selCat, type, customLabel, date,
          ageInDays: u.calcAge(birthDate, date).totalDays,
          title: def ? def.title : customLabel,
          emoji: def ? def.emoji : '⭐',
          notes, photoIds: existing ? existing.photoIds : []
        };

        try {
          if (isEdit) {
            msData.id = existing.id;
            await d.updateMilestone(existing.id, msData);
            App.showToast('已更新', 'success');
          } else {
            msData.id = u.generateId('m');
            await d.addMilestone(msData);
            App.showToast('里程碑已添加', 'success');
            App.celebrate();
          }
          return true;
        } catch(e) { App.showToast('保存失败: '+e.message, 'error'); return false; }
      }
    });
  }

  return { init, render, destroy: ()=>{}, showAddForm: (d) => showForm(d, null) };
})();
