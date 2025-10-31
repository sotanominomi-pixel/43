// script.js — 完全再現版・モードごとに表示
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  // State
  let mode = localStorage.getItem('nclock_mode') || 'clock';
  let customHours = Number(localStorage.getItem('nclock_hours')) || 24;
  let showSeconds = localStorage.getItem('nclock_show_seconds') === 'false' ? false : true;
  let elapsedMs = Number(localStorage.getItem('nclock_sw_elapsed')) || 0;
  let laps = JSON.parse(localStorage.getItem('nclock_sw_laps') || '[]');
  let alarms = JSON.parse(localStorage.getItem('nclock_alarms') || '[]');
  let lastTriggered = localStorage.getItem('nclock_last_triggered') || '';
  let running = false;
  let lang = localStorage.getItem('nclock_lang') || 'ja';

  // Localization
  const L = {
    ja: {
      'tab.clock': '時計', 'tab.stopwatch': 'ストップウォッチ', 'tab.alarm': 'アラーム', 'tab.settings': '設定',
      'btn.start':'Start','btn.stop':'Stop','btn.lap':'Lap','btn.reset':'Reset','btn.addAlarm':'アラーム追加',
      'label.hours':'1日の長さ','label.hoursValue':'24 時間',
      'settings.showSeconds':'秒数表示','settings.language':'言語','footer':'設定は自動で保存されます。',
      'msg.pickTime':'時刻を選択してください','msg.invalidTime':'不正な時刻です','msg.alarmSound':'アラームが鳴りました'
    },
    en: {
      'tab.clock': 'Clock', 'tab.stopwatch': 'Stopwatch', 'tab.alarm': 'Alarm', 'tab.settings': 'Settings',
      'btn.start':'Start','btn.stop':'Stop','btn.lap':'Lap','btn.reset':'Reset','btn.addAlarm':'Add Alarm',
      'label.hours':'Day length','label.hoursValue':'24 h',
      'settings.showSeconds':'Show seconds','settings.language':'Language','footer':'Settings are saved automatically.',
      'msg.pickTime':'Please pick a time','msg.invalidTime':'Invalid time','msg.alarmSound':'Alarm'
    }
  };

  function t(key){ return L[lang][key] || key; }

  // Save state
  function saveAll(){
    localStorage.setItem('nclock_mode', mode);
    localStorage.setItem('nclock_hours', customHours);
    localStorage.setItem('nclock_show_seconds', showSeconds);
    localStorage.setItem('nclock_sw_elapsed', elapsedMs);
    localStorage.setItem('nclock_sw_laps', JSON.stringify(laps));
    localStorage.setItem('nclock_alarms', JSON.stringify(alarms));
    localStorage.setItem('nclock_lang', lang);
    localStorage.setItem('nclock_last_triggered', lastTriggered);
  }

  // Render tabs
  function renderTabs(){
    const tabsDiv = document.createElement('div');
    tabsDiv.className = 'tabs';
    ['clock','stopwatch','alarm','settings'].forEach(m=>{
      const b = document.createElement('button');
      b.className = 'tab';
      if(mode===m) b.classList.add('active');
      b.textContent = t('tab.'+m);
      b.addEventListener('click', ()=>{ mode = m; saveAll(); renderApp(); });
      tabsDiv.appendChild(b);
    });
    return tabsDiv;
  }

  // Clock panel
  function renderClock(){
    const container = document.createElement('div');
    container.className = 'panel';

    const display = document.createElement('div');
    display.id = 'display';
    display.className = 'time-display';
    container.appendChild(display);

    const sliderBox = document.createElement('div');
    sliderBox.className = 'slider-box';
    const labelRow = document.createElement('div');
    labelRow.className = 'label-row';
    const labelLeft = document.createElement('div'); labelLeft.textContent = t('label.hours');
    const labelHours = document.createElement('div'); labelHours.textContent = `${customHours} ${lang==='en'?'h':'時間'}`;
    labelRow.appendChild(labelLeft); labelRow.appendChild(labelHours);
    const slider = document.createElement('input');
    slider.type='range'; slider.min=12; slider.max=48; slider.step=1; slider.value=customHours;
    slider.addEventListener('input',(e)=>{ customHours = Number(e.target.value); labelHours.textContent=`${customHours} ${lang==='en'?'h':'時間'}`; saveAll(); });
    sliderBox.appendChild(labelRow); sliderBox.appendChild(slider);
    container.appendChild(sliderBox);

    return container;
  }

  // Stopwatch panel
  function renderStopwatch(){
    const container = document.createElement('div');
    container.className = 'panel';

    const display = document.createElement('div');
    display.id='display';
    display.className='time-display';
    container.appendChild(display);

    const controls = document.createElement('div'); controls.className='controls';
    const swStartBtn = document.createElement('button'); swStartBtn.className='btn-circle btn-start'; swStartBtn.textContent=running?t('btn.stop'):t('btn.start');
    swStartBtn.addEventListener('click', ()=>{
      running = !running;
      swStartBtn.textContent = running?t('btn.stop'):t('btn.start');
      swStartBtn.className = 'btn-circle '+(running?'btn-stop':'btn-start');
    });
    const swLapBtn = document.createElement('button'); swLapBtn.className='btn-rect mono'; swLapBtn.textContent=t('btn.lap'); swLapBtn.disabled = !running;
    swLapBtn.addEventListener('click', ()=>{ laps.unshift(formatStopwatch(elapsedMs)); if(laps.length>5000) laps.pop(); renderApp(); saveAll(); });
    const swResetBtn = document.createElement('button'); swResetBtn.className='btn-rect mono'; swResetBtn.textContent=t('btn.reset');
    swResetBtn.addEventListener('click', ()=>{ elapsedMs=0; laps=[]; saveAll(); renderApp(); });

    controls.appendChild(swStartBtn); controls.appendChild(swLapBtn); controls.appendChild(swResetBtn);
    container.appendChild(controls);

    const lapList = document.createElement('div'); lapList.className='lap-list';
    if(laps.length===0){ lapList.textContent = lang==='en'?'No laps':'ラップなし'; }
    else{ laps.forEach((l,i)=>{ const d=document.createElement('div'); d.className='lap-item'; d.innerHTML=`<div>Lap ${laps.length-i}</div><div>${l}</div>`; lapList.appendChild(d); }); }
    container.appendChild(lapList);

    return container;
  }

  // Alarm panel
  function renderAlarm(){
    const container = document.createElement('div');
    container.className='panel';

    const controls = document.createElement('div'); controls.className='alarm-controls';
    const input = document.createElement('input'); input.type='time'; input.step=60; input.className='time-input';
    const addBtn = document.createElement('button'); addBtn.className='btn-large mono'; addBtn.textContent=t('btn.addAlarm');
    addBtn.addEventListener('click', ()=>{
      const val = input.value; if(!val){ alert(t('msg.pickTime')); return; }
      const [hh,mm] = val.split(':').map(n=>Number(n));
      if(isNaN(hh)||isNaN(mm)){ alert(t('msg.invalidTime')); return; }
      alarms.push({id:Math.random().toString(36),hour:hh,min:mm,enabled:true});
      input.value=''; saveAll(); renderApp();
    });
    controls.appendChild(input); controls.appendChild(addBtn); container.appendChild(controls);

    if(alarms.length===0){ const d=document.createElement('div'); d.textContent=lang==='en'?'No alarms':'アラームなし'; container.appendChild(d); }
    else{ alarms.forEach((a,idx)=>{
      const card=document.createElement('div'); card.className='alarm-card';
      const timeDiv=document.createElement('div'); timeDiv.className='alarm-time'; timeDiv.textContent=`${String(a.hour).padStart(2,'0')}:${String(a.min).padStart(2,'0')}`;
      const actions=document.createElement('div'); actions.className='alarm-actions';
      const toggle=document.createElement('div'); toggle.className='toggle'+(a.enabled?' on':''); const thumb=document.createElement('div'); thumb.className='thumb'; toggle.appendChild(thumb);
      toggle.addEventListener('click', ()=>{ a.enabled=!a.enabled; saveAll(); renderApp(); });
      const del=document.createElement('button'); del.className='del-btn'; del.textContent=lang==='en'?'Delete':'削除';
      del.add
            del.addEventListener('click', ()=>{ alarms.splice(idx,1); saveAll(); renderApp(); });
      actions.appendChild(toggle);
      actions.appendChild(del);
      card.appendChild(timeDiv);
      card.appendChild(actions);
      container.appendChild(card);
    }); }

    return container;
  }

  // Settings panel
  function renderSettings(){
    const container=document.createElement('div'); container.className='panel';

    // Seconds toggle
    const secRow=document.createElement('div'); secRow.className='settings-row';
    const secLabel=document.createElement('div'); secLabel.className='setting-label'; secLabel.textContent=t('settings.showSeconds');
    const secToggle=document.createElement('input'); secToggle.type='checkbox'; secToggle.checked=showSeconds;
    secToggle.addEventListener('change', ()=>{ showSeconds=secToggle.checked; saveAll(); });
    secRow.appendChild(secLabel); secRow.appendChild(secToggle);
    container.appendChild(secRow);

    // Language select
    const langRow=document.createElement('div'); langRow.className='settings-row';
    const langLabel=document.createElement('div'); langLabel.className='setting-label'; langLabel.textContent=t('settings.language');
    const select=document.createElement('select'); select.className='lang-select';
    Object.keys(L).forEach(lg=>{ const opt=document.createElement('option'); opt.value=lg; opt.textContent=lg.toUpperCase(); if(lg===lang) opt.selected=true; select.appendChild(opt); });
    select.addEventListener('change',()=>{ lang=select.value; saveAll(); renderApp(); });
    langRow.appendChild(langLabel); langRow.appendChild(select);
    container.appendChild(langRow);

    const footer = document.createElement('div'); footer.className='footer'; footer.textContent=t('footer');
    container.appendChild(footer);

    return container;
  }

  // Stopwatch format
  function formatStopwatch(ms){
    const total = Math.floor(ms/1000);
    const h=Math.floor(total/3600); const m=Math.floor(total/60)%60; const s=total%60;
    if(h>0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // Main render
  function renderApp(){
    app.innerHTML=''; // clear previous
    app.appendChild(renderTabs());
    if(mode==='clock') app.appendChild(renderClock());
    if(mode==='stopwatch') app.appendChild(renderStopwatch());
    if(mode==='alarm') app.appendChild(renderAlarm());
    if(mode==='settings') app.appendChild(renderSettings());
  }

  // Clock & stopwatch loop
  let lastFrame=performance.now();
  function tick(now){
    const dt=now-lastFrame; lastFrame=now;
    const speed = 24 / customHours;

    if(running) elapsedMs += dt*speed;

    const display = document.getElementById('display');
    if(display){
      if(mode==='clock'){
        const d=new Date();
        const secOfDay=d.getHours()*3600+d.getMinutes()*60+d.getSeconds()+d.getMilliseconds()/1000;
        const virtual = secOfDay*speed;
        const h=Math.floor(virtual/3600)%24;
        const m=Math.floor(virtual/60)%60;
        const s=Math.floor(virtual)%60;
        display.textContent = showSeconds? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` :
                                             `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      } else if(mode==='stopwatch'){
        display.textContent = formatStopwatch(elapsedMs);
      }
    }

    // Alarm check
    const nowReal = new Date();
    const keyNow = `${nowReal.getFullYear()}${String(nowReal.getMonth()+1).padStart(2,'0')}${String(nowReal.getDate()).padStart(2,'0')}${String(nowReal.getHours()).padStart(2,'0')}${String(nowReal.getMinutes()).padStart(2,'0')}`;
    if(nowReal.getSeconds()===0){
      alarms.forEach(a=>{
        if(!a.enabled) return;
        if(a.hour===nowReal.getHours() && a.min===nowReal.getMinutes()){
          if(lastTriggered!==keyNow){
            lastTriggered=keyNow; saveAll();
            try{ if(Notification.permission==='granted'){ new Notification('N Clock',{body:`${t('msg.alarmSound')}: ${String(a.hour).padStart(2,'0')}:${String(a.min).padStart(2,'0')}`}); } }catch(e){}
            try{ alert(`${t('msg.alarmSound')}: ${String(a.hour).padStart(2,'0')}:${String(a.min).padStart(2,'0')}`); }catch(e){}
          }
        }
      });
    }

    requestAnimationFrame(tick);
  }

  renderApp();
  requestAnimationFrame(tick);
  setInterval(saveAll,2000);
});
