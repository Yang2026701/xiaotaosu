/* ============================================================
   growth.js — Height/Weight Tracker (Supabase)
   ============================================================ */

App.pages.growth = (() => {
  const u = App.utils; const m = App.models; const d = App.data;
  const container = () => document.getElementById('page-growth');
  let heightChart = null, weightChart = null, sortDesc = true, recordsCollapsed = true;

  function init() {}
  function destroy() { if(heightChart){heightChart.destroy();heightChart=null;} if(weightChart){weightChart.destroy();weightChart=null;} }

  // 从 WHO 表（0-24月）反推某月龄下具体数值所处的百分位 (P3~P97 正态近似)
  // base: 列起点——身高 base=1，体重 base=4。超范围返回 null，否则返回原始百分位(可能<3或>97)
  function pctOf(who, ageMon, value, base) {
    if (value == null || ageMon == null) return null;
    let lower = null;
    for (let i = 0; i < who.length - 1; i++) {
      if (who[i][0] <= ageMon && ageMon <= who[i + 1][0]) { lower = i; break; }
    }
    if (lower == null) return null; // 表外
    const a0 = who[lower][0], a1 = who[lower + 1][0];
    const f = (ageMon - a0) / ((a1 - a0) || 1);
    const lerp = (idx) => who[lower][idx] + (who[lower + 1][idx] - who[lower][idx]) * f;
    const p3 = lerp(base), p50 = lerp(base + 1), p97 = lerp(base + 2);
    const sigma = (p97 - p3) / (2 * 1.881); // 3rd 分位 z≈-1.881
    if (sigma <= 0) return null;
    return normalCdf(((value - p50) / sigma)) * 100;
  }
  function normalCdf(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
  function erf(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return x >= 0 ? y : -y;
  }
  function dispPct(p) { return p == null ? '' : Math.min(99, Math.max(1, Math.round(p))); }

  function render(appData) {
    const records = [...(appData.growthRecords||[])].sort((a,b)=>a.date.localeCompare(b.date));
    const birthDate = appData.settings.birthDate;
    const who = m.WHO_GIRLS; // 女宝参考（预留：按 sex 切换 WHO_BOYS）
    records.forEach(r => { r.ageInDays = u.calcAge(birthDate, r.date).totalDays; r.ageMon = r.ageInDays / 30.4375; });

    const latest = records.length>0?records[records.length-1]:null;
    const prev = records.length>1?records[records.length-2]:null;

    const htPct = latest? pctOf(who, latest.ageMon, latest.height, 1) : null;
    const wtPct = latest? pctOf(who, latest.ageMon, latest.weight, 4) : null;

    let html = '<div class="stat-tiles">';
    html += tile('📏','身高',latest?latest.height:'--','cm',prev?delta(latest.height,prev.height,'cm'):'', dispPct(htPct));
    html += tile('⚖️','体重',latest?latest.weight:'--','kg',prev?delta(latest.weight,prev.weight,'kg'):'', dispPct(wtPct));
    html += tile('📐','头围',latest&&latest.headCircumference?latest.headCircumference:'--','cm','');
    html += '</div>';

    html += growthAlert(latest, who);

    if (records.length > 0) {
      html += '<div class="chart-container"><h3>📏 身高生长曲线</h3><div class="chart-wrap"><canvas id="chart-height"></canvas></div></div>';
      html += '<div class="chart-container"><h3>⚖️ 体重生长曲线</h3><div class="chart-wrap"><canvas id="chart-weight"></canvas></div></div>';
    }

    html += `<div class="chart-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;cursor:pointer;user-select:none" id="btn-toggle-records">📋 记录列表 ${recordsCollapsed?'▸':'▾'}</h3>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-secondary" id="btn-sort-gr">${sortDesc?'最新在前':'最早在前'}</button>
          <button class="btn btn-primary btn-sm" id="btn-add-growth">+ 添加</button>
        </div>
      </div>
      <div id="records-body"${recordsCollapsed?' class="gr-collapsed"':''}>`;

    if (records.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">还没有发育记录</div><div class="empty-desc">添加身高体重数据来生成生长曲线吧~</div></div>';
    } else {
      html += '<div style="overflow-x:auto"><table class="records-table"><thead><tr><th>日期</th><th>月龄</th><th>身高(cm)</th><th>体重(kg)</th><th>头围(cm)</th><th>备注</th><th></th></tr></thead><tbody>';
      const rows = sortDesc ? [...records].reverse() : records;
      rows.forEach(r => {
        const age = u.calcAge(birthDate, r.date);
        html += `<tr><td>${u.formatDateShort(r.date)}</td><td>${age.text}</td><td>${r.height!=null?r.height:'-'}</td><td>${r.weight!=null?r.weight:'-'}</td><td>${r.headCircumference!=null?r.headCircumference:'-'}</td><td class="td-notes">${u.escapeHtml(r.notes||'-')}</td><td><button class="btn btn-sm btn-secondary btn-del-gr" data-id="${r.id}">删除</button></td></tr>`;
      });
      html += '</tbody></table></div>';
    }
    html += '</div></div>';

    container().innerHTML = html;

    setTimeout(() => {
      container().querySelectorAll('.stat-value').forEach(el => {
        const num = parseFloat(el.childNodes[0]?.textContent||'');
        if (!isNaN(num)) App.effects.animateNumber(el, 0, num, 600);
      });
    }, 50);

    const addBtn = document.getElementById('btn-add-growth');
    if (addBtn) addBtn.addEventListener('click', () => showAddForm(appData));

    const sortBtn = document.getElementById('btn-sort-gr');
    if (sortBtn) sortBtn.addEventListener('click', () => { sortDesc = !sortDesc; render(appData); });

    const toggleBtn = document.getElementById('btn-toggle-records');
    if (toggleBtn) toggleBtn.addEventListener('click', () => {
      recordsCollapsed = !recordsCollapsed;
      const rb = document.getElementById('records-body');
      if (rb) rb.classList.toggle('gr-collapsed', recordsCollapsed);
      toggleBtn.textContent = '📋 记录列表 ' + (recordsCollapsed ? '▸' : '▾');
    });

    container().querySelectorAll('.btn-del-gr').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        App.confirm('确定删除这条记录吗？', async () => {
          try { await d.deleteGrowthRecord(btn.dataset.id); App.showToast('已删除','success'); await App.notifyDataChange(); }
          catch(e) { App.showToast('删除失败','error'); }
        });
      });
    });

    if (records.length > 0) {
      setTimeout(() => {
        renderHeightChart(records);
        renderWeightChart(records);
      }, 150);
    }
  }

  function tile(icon, label, value, unit, ds, pct) {
    return `<div class="stat-tile"><div style="font-size:1.5rem;margin-bottom:4px">${icon}</div><div class="stat-value">${value!=='--'?value:'--'}<span class="unit">${value!=='--'?unit:''}</span></div>${pct?`<div class="stat-pct">约 P${pct}</div>`:''}<div class="stat-label">${label}</div>${ds?`<div class="stat-delta">${ds}</div>`:''}</div>`;
  }
  function delta(c,p,u) { if(c==null||p==null) return ''; const d=c-p; return `${d>=0?'+':''}${d.toFixed(1)}${u} 较上次`; }

  // 最新记录偏离参考范围（P3~P97）时的警示
  function growthAlert(latest, who) {
    if (!latest) return '';
    const lines = [];
    if (latest.height != null) {
      const p = pctOf(who, latest.ageMon, latest.height, 1);
      if (p != null && p < 3) lines.push(`📏 身高低于同龄参考范围（约P${dispPct(p)}）`);
      else if (p != null && p > 97) lines.push(`📏 身高偏高，超过同龄参考范围（约P${dispPct(p)}）`);
    }
    if (latest.weight != null) {
      const p = pctOf(who, latest.ageMon, latest.weight, 4);
      if (p != null && p < 3) lines.push(`⚖️ 体重低于同龄参考范围（约P${dispPct(p)}）`);
      else if (p != null && p > 97) lines.push(`⚖️ 体重偏高，超过同龄参考范围（约P${dispPct(p)}）`);
    }
    return lines.length ? '<div class="growth-alert">' + lines.join('<br>') + '</div>' : '';
  }

  // 画 WHO 参考线：x 直接使用月龄
  function buildWHO(maxAgeMon, base) {
    const who = m.WHO_GIRLS; const p3=[],p50=[],p97=[];
    for (const row of who) {
      if (row[0] > maxAgeMon + 1) break;
      p3.push({x:row[0],y:row[base  ]});
      p50.push({x:row[0],y:row[base+1]});
      p97.push({x:row[0],y:row[base+2]});
    }
    return {p3,p50,p97};
  }

  function renderHeightChart(records) {
    const ctx = document.getElementById('chart-height'); if(!ctx) return;
    if(heightChart) heightChart.destroy();
    const pts = records.filter(r=>r.height!=null);
    const actual = pts.map(r=>({x:r.ageMon,y:r.height}));
    const maxAgeMon = Math.max(...records.map(r=>r.ageMon)) || 24;
    const w = buildWHO(maxAgeMon, 1);
    heightChart = new Chart(ctx, {
      type:'line', data:{datasets:[
        {label:'P97',data:w.p97,borderColor:'rgba(215,204,200,0.5)',borderWidth:1,borderDash:[4,4],pointRadius:0,fill:false,order:10},
        {label:'P50',data:w.p50,borderColor:'#D7CCC8',borderWidth:1,borderDash:[6,3],pointRadius:0,fill:false,order:9},
        {label:'P3',data:w.p3,borderColor:'rgba(215,204,200,0.5)',borderWidth:1,borderDash:[4,4],pointRadius:0,fill:{target:'+2',above:'rgba(215,204,200,0.12)'},order:10},
        {label:'小桃酥',data:actual,borderColor:'#FF8C69',backgroundColor:'#FF8C69',borderWidth:2.5,pointRadius:5,pointBackgroundColor:'#FF8C69',pointBorderColor:'#FFF',pointBorderWidth:2,pointHoverRadius:7,tension:0.2,fill:false,order:1}
      ]},
      options: {
        responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:false},tooltip:{backgroundColor:'#4E342E',cornerRadius:8,
          callbacks:{label(ctx){
            const ds=ctx.dataset;
            if(ds.label==='小桃酥'){
              const idx=ctx.dataIndex, r=pts[idx];
              const dlt = idx>0 && pts[idx-1].height!=null ? r.height-pts[idx-1].height : null;
              let s=`身高: ${ctx.parsed.y} cm`;
              if(r&&r.date) s+=` · 第${Math.round(ctx.parsed.x)}个月 · ${u.formatDateShort(r.date)}`;
              if(dlt!=null) s+=` · ${dlt>=0?'+':''}${dlt.toFixed(1)} 较上次`;
              return s;
            }
            return `${ds.label}: ${ctx.parsed.y} cm`;
          }}}},
        scales:{x:{type:'linear',title:{display:true,text:'月龄',color:'#BCAAA4'},grid:{color:'#EDE7E0'},ticks:{color:'#BCAAA4',font:{size:11}},min:0,max:Math.min(24,Math.ceil(maxAgeMon)+1)},
                y:{title:{display:true,text:'身高(cm)',color:'#BCAAA4'},grid:{color:'#EDE7E0'},ticks:{color:'#BCAAA4',font:{size:11}},min:40,max:100}}
      }
    });
  }

  function renderWeightChart(records) {
    const ctx = document.getElementById('chart-weight'); if(!ctx) return;
    if(weightChart) weightChart.destroy();
    const pts = records.filter(r=>r.weight!=null);
    const actual = pts.map(r=>({x:r.ageMon,y:r.weight}));
    const maxAgeMon = Math.max(...records.map(r=>r.ageMon)) || 24;
    const w = buildWHO(maxAgeMon, 4);
    weightChart = new Chart(ctx, {
      type:'line', data:{datasets:[
        {label:'P97',data:w.p97,borderColor:'rgba(215,204,200,0.5)',borderWidth:1,borderDash:[4,4],pointRadius:0,fill:false,order:10},
        {label:'P50',data:w.p50,borderColor:'#D7CCC8',borderWidth:1,borderDash:[6,3],pointRadius:0,fill:false,order:9},
        {label:'P3',data:w.p3,borderColor:'rgba(215,204,200,0.5)',borderWidth:1,borderDash:[4,4],pointRadius:0,fill:{target:'+2',above:'rgba(215,204,200,0.12)'},order:10},
        {label:'小桃酥',data:actual,borderColor:'#81C784',backgroundColor:'#81C784',borderWidth:2.5,pointRadius:5,pointBackgroundColor:'#81C784',pointBorderColor:'#FFF',pointBorderWidth:2,pointHoverRadius:7,tension:0.2,fill:false,order:1}
      ]},
      options: {
        responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:false},tooltip:{backgroundColor:'#4E342E',cornerRadius:8,
          callbacks:{label(ctx){
            const ds=ctx.dataset;
            if(ds.label==='小桃酥'){
              const idx=ctx.dataIndex, r=pts[idx];
              const dlt = idx>0 && pts[idx-1].weight!=null ? r.weight-pts[idx-1].weight : null;
              let s=`体重: ${ctx.parsed.y} kg`;
              if(r&&r.date) s+=` · 第${Math.round(ctx.parsed.x)}个月 · ${u.formatDateShort(r.date)}`;
              if(dlt!=null) s+=` · ${dlt>=0?'+':''}${dlt.toFixed(1)} 较上次`;
              return s;
            }
            return `${ds.label}: ${ctx.parsed.y} kg`;
          }}}},
        scales:{x:{type:'linear',title:{display:true,text:'月龄',color:'#BCAAA4'},grid:{color:'#EDE7E0'},ticks:{color:'#BCAAA4',font:{size:11}},min:0,max:Math.min(24,Math.ceil(maxAgeMon)+1)},
                y:{title:{display:true,text:'体重(kg)',color:'#BCAAA4'},grid:{color:'#EDE7E0'},ticks:{color:'#BCAAA4',font:{size:11}},min:1,max:18}}
      }
    });
  }

  function showAddForm(appData) {
    const today = u.todayStr(), birthDate = appData.settings.birthDate;
    const formHtml = `
      <div class="form-group"><label class="form-label">日期 *</label><input type="date" class="form-input" id="gf-date" value="${today}" min="${birthDate}" max="${today}"></div>
      <div class="form-row"><div class="form-group"><label class="form-label">身高 (cm)</label><input type="number" class="form-input" id="gf-height" placeholder="50" step="0.1" min="30" max="130"></div>
      <div class="form-group"><label class="form-label">体重 (kg)</label><input type="number" class="form-input" id="gf-weight" placeholder="3.3" step="0.1" min="1" max="30"></div></div>
      <div class="form-group"><label class="form-label">头围 (cm)</label><input type="number" class="form-input" id="gf-head" placeholder="34" step="0.1" min="25" max="55"></div>
      <div class="form-group"><label class="form-label">备注</label><textarea class="form-textarea" id="gf-notes" rows="2" placeholder="记录一些备注..."></textarea></div>`;

    App.showModal({
      title: '添加发育记录',
      body: formHtml,
      async onSave() {
        const date = document.getElementById('gf-date').value;
        const height = parseFloat(document.getElementById('gf-height').value) || null;
        const weight = parseFloat(document.getElementById('gf-weight').value) || null;
        const headCircumference = parseFloat(document.getElementById('gf-head').value) || null;
        const notes = document.getElementById('gf-notes').value.trim();

        const record = { date, height, weight, headCircumference };
        const errors = m.validateGrowthRecord(record, birthDate);
        if (errors) { App.showToast(Object.values(errors)[0], 'error'); return false; }

        try {
          await d.addGrowthRecord({
            id: u.generateId('g'), date, height, weight, headCircumference,
            ageInDays: u.calcAge(birthDate, date).totalDays, notes
          });
          App.showToast('记录已添加', 'success');
          App.celebrate();
          return true;
        } catch(e) { App.showToast('保存失败: '+e.message, 'error'); return false; }
      }
    });
  }

  return { init, render, destroy };
})();