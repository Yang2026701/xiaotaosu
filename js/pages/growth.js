/* ============================================================
   growth.js — Height/Weight Tracker (Supabase)
   ============================================================ */

App.pages.growth = (() => {
  const u = App.utils; const m = App.models; const d = App.data;
  const container = () => document.getElementById('page-growth');
  let heightChart = null, weightChart = null;

  function init() {}
  function destroy() { if(heightChart){heightChart.destroy();heightChart=null;} if(weightChart){weightChart.destroy();weightChart=null;} }

  function render(appData) {
    const records = [...(appData.growthRecords||[])].sort((a,b)=>a.date.localeCompare(b.date));
    const birthDate = appData.settings.birthDate;
    records.forEach(r => { r.ageInDays = u.calcAge(birthDate, r.date).totalDays; });

    const latest = records.length>0?records[records.length-1]:null;
    const prev = records.length>1?records[records.length-2]:null;

    let html = '<div class="stat-tiles">';
    html += tile('📏','身高',latest?latest.height:'--','cm',prev?delta(latest.height,prev.height,'cm'):'');
    html += tile('⚖️','体重',latest?latest.weight:'--','kg',prev?delta(latest.weight,prev.weight,'kg'):'');
    html += tile('📐','头围',latest&&latest.headCircumference?latest.headCircumference:'--','cm','');
    html += '</div>';

    if (records.length > 0) {
      html += '<div class="chart-container"><h3>📏 身高生长曲线</h3><div class="chart-wrap"><canvas id="chart-height"></canvas></div></div>';
      html += '<div class="chart-container"><h3>⚖️ 体重生长曲线</h3><div class="chart-wrap"><canvas id="chart-weight"></canvas></div></div>';
    }

    html += `<div class="chart-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0">📋 记录列表</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-growth">+ 添加</button>
      </div>`;

    if (records.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">还没有发育记录</div><div class="empty-desc">添加身高体重数据来生成生长曲线吧~</div></div>';
    } else {
      html += '<div style="overflow-x:auto"><table class="records-table"><thead><tr><th>日期</th><th>月龄</th><th>身高(cm)</th><th>体重(kg)</th><th>头围(cm)</th><th></th></tr></thead><tbody>';
      [...records].reverse().forEach(r => {
        const age = u.calcAge(birthDate, r.date);
        html += `<tr><td>${u.formatDateShort(r.date)}</td><td>${age.text}</td><td>${r.height!=null?r.height:'-'}</td><td>${r.weight!=null?r.weight:'-'}</td><td>${r.headCircumference!=null?r.headCircumference:'-'}</td><td><button class="btn btn-sm btn-secondary btn-del-gr" data-id="${r.id}">删除</button></td></tr>`;
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    container().innerHTML = html;

    setTimeout(() => {
      container().querySelectorAll('.stat-value').forEach(el => {
        const num = parseFloat(el.childNodes[0]?.textContent||'');
        if (!isNaN(num)) App.effects.animateNumber(el, 0, num, 600);
      });
    }, 50);

    const addBtn = document.getElementById('btn-add-growth');
    if (addBtn) addBtn.addEventListener('click', () => showAddForm(appData));

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
        renderHeightChart([...records], birthDate);
        renderWeightChart([...records], birthDate);
      }, 150);
    }
  }

  function tile(icon, label, value, unit, ds) {
    return `<div class="stat-tile"><div style="font-size:1.5rem;margin-bottom:4px">${icon}</div><div class="stat-value">${value!=='--'?value:'--'}<span class="unit">${value!=='--'?unit:''}</span></div><div class="stat-label">${label}</div>${ds?`<div class="stat-delta">${ds}</div>`:''}</div>`;
  }
  function delta(c,p,u) { if(c==null||p==null) return ''; const d=c-p; return `${d>=0?'+':''}${d.toFixed(1)}${u} 较上次`; }

  function renderHeightChart(records, birthDate) {
    const ctx = document.getElementById('chart-height'); if(!ctx) return;
    if(heightChart) heightChart.destroy();
    const actual = records.filter(r=>r.height!=null).map(r=>({x:r.ageInDays,y:r.height}));
    const w = buildWHO(records,birthDate,'height');
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
          callbacks:{label(ctx){return ctx.dataset.label==='小桃酥'?`身高: ${ctx.parsed.y} cm`:`${ctx.dataset.label}: ${ctx.parsed.y} cm`;}}}},
        scales:{x:{type:'linear',title:{display:true,text:'天数',color:'#BCAAA4'},grid:{color:'#EDE7E0'},ticks:{color:'#BCAAA4',font:{size:11}},min:0,max:Math.max(730,...records.map(r=>r.ageInDays))+30},
                y:{title:{display:true,text:'身高(cm)',color:'#BCAAA4'},grid:{color:'#EDE7E0'},ticks:{color:'#BCAAA4',font:{size:11}},min:40,max:100}}
      }
    });
  }

  function renderWeightChart(records, birthDate) {
    const ctx = document.getElementById('chart-weight'); if(!ctx) return;
    if(weightChart) weightChart.destroy();
    const actual = records.filter(r=>r.weight!=null).map(r=>({x:r.ageInDays,y:r.weight}));
    const w = buildWHO(records,birthDate,'weight');
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
          callbacks:{label(ctx){return ctx.dataset.label==='小桃酥'?`体重: ${ctx.parsed.y} kg`:`${ctx.dataset.label}: ${ctx.parsed.y} kg`;}}}},
        scales:{x:{type:'linear',title:{display:true,text:'天数',color:'#BCAAA4'},grid:{color:'#EDE7E0'},ticks:{color:'#BCAAA4',font:{size:11}},min:0,max:Math.max(730,...records.map(r=>r.ageInDays))+30},
                y:{title:{display:true,text:'体重(kg)',color:'#BCAAA4'},grid:{color:'#EDE7E0'},ticks:{color:'#BCAAA4',font:{size:11}},min:1,max:18}}
      }
    });
  }

  function buildWHO(records, birthDate, metric) {
    const who = m.WHO_GIRLS; const maxAge = Math.max(730,...records.map(r=>r.ageInDays));
    const p3=[],p50=[],p97=[];
    for(const row of who) {
      const days=Math.round(row[0]*30.4375); if(days>maxAge+60) break;
      if(metric==='height') { p3.push({x:days,y:row[1]}); p50.push({x:days,y:row[2]}); p97.push({x:days,y:row[3]}); }
      else { p3.push({x:days,y:row[4]}); p50.push({x:days,y:row[5]}); p97.push({x:days,y:row[6]}); }
    }
    return {p3,p50,p97};
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
