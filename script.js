// script.js — localized + fixed-tab-position + monochrome lang UI
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const display = document.getElementById('display');
  const sliderBox = document.getElementById('sliderBox');
  const slider = document.getElementById('sliderHours');
  const labelHours = document.getElementById('labelHours');
  const labelLeft = document.getElementById('labelLeft');

  const tabClock = document.getElementById('tabClock');
  const tabStopwatch = document.getElementById('tabStopwatch');
  const tabAlarm = document.getElementById('tabAlarm');
  const tabSettings = document.getElementById('tabSettings');

  const langSelect = document.getElementById('langSelect');
  const langSelectSettings = document.getElementById('langSelectSettings');

  const stopwatchArea = document.getElementById('stopwatchArea');
  const swStart = document.getElementById('swStart');
  const swLap = document.getElementById('swLap');
  const swReset = document.getElementById('swReset');
  const lapList = document.getElementById('lapList');

  const alarmArea = document.getElementById('alarmArea');
  const alarmTimeInput = document.getElementById('alarmTime');
  const alarmSetBtn = document.getElementById('alarmSetBtn');
  const alarmsContainer = document.getElementById('alarmsContainer');

  const settingsArea = document.getElementById('settingsArea');
  const secondsToggle = document.getElementById('secondsToggle');
  const secondsLabel = document.getElementById('secondsLabel');
  const footer = document.querySelector('.footer');

  // Localization dictionary
  const L = {
    ja: {
      'tab.clock': '時計',
      'tab.stopwatch': 'ストップウォッチ',
      'tab.alarm': 'アラーム',
      'tab.settings': '設定',
      'btn.start': 'Start',
      'btn.stop': 'Stop',
      'btn.lap': 'Lap',
      'btn.reset': 'Reset',
      'btn.addAlarm': 'アラーム追加',
      'label.hours': '1日の長さ',
      'label.hoursValue': '24 時間',
      'settings.showSeconds': '秒数表示',
      'settings.language': '言語',
      'footer': '設定は自動で保存されます。',
      'msg.pickTime': '時刻を選択してください',
      'msg.invalidTime': '不正な時刻です',
      'msg.alarmSound': 'アラームが鳴りました'
    },
    en: {
      'tab.clock': 'Clock',
      'tab.stopwatch': 'Stopwatch',
      'tab.alarm': 'Alarm',
      'tab.settings': 'Settings',
      'btn.start': 'Start',
      'btn.stop': 'Stop',
      'btn.lap': 'Lap',
      'btn.reset': 'Reset',
      'btn.addAlarm': 'Add Alarm',
      'label.hours': 'Day length',
      'label.hoursValue': '24 h',
      'settings.showSeconds': 'Show seconds',
      'settings.language': 'Language',
      'footer': 'Settings are saved automatically.',
      'msg.pickTime': 'Please pick a time',
      'msg.invalidTime': 'Invalid time',
      'msg.alarmSound': 'Alarm'
    }
  };

  // State
  let customHours = Number(localStorage.getItem('nclock_hours')) || 24;
  slider.value = customHours;
  labelHours.textContent = `${customHours} 時間`;

  let showSeconds = (localStorage.getItem('nclock_show_seconds') === null) ? true : (localStorage.getItem('nclock_show_seconds') === 'true');
  secondsToggle.checked = showSeconds;
  secondsLabel.textContent = showSeconds ? '表示' : '非表示';

  let lang = localStorage.getItem('nclock_lang') || 'ja';
  langSelect.value = lang;
  langSelectSettings.value = lang;

  let mode = localStorage.getItem('nclock_mode') || 'clock';
  let lastFrame = performance.now();
  let running = false;
  let elapsedMs = Number(localStorage.getItem('nclock_sw_elapsed')) || 0;
  let laps = JSON.parse(localStorage.getItem('nclock_sw_laps') || '[]');
  let alarms = JSON.parse(localStorage.getItem('nclock_alarms') || '[]'); // {id,hour,min,enabled}
  let lastTriggered = localStorage.getItem('nclock_last_triggered') || '';

  // Helpers
  function t(key){
    return (L[lang] && L[lang][key]) ? L[lang][key] : key;
  }
  function applyLocalization(){
    tabClock.textContent = t('tab.clock');
    tabStopwatch.textContent = t('tab.stopwatch');
    tabAlarm.textContent = t('tab.alarm');
    tabSettings.textContent = t('tab.settings');
    labelLeft.textContent = t('label.hours');
    labelHours.textContent = (lang === 'en') ? `${customHours} h` : `${customHours} 時間`;
    footer.textContent = t('footer');
    document.querySelectorAll('[data-key]').forEach(el => {
      const k = el.getAttribute('data-key');
      if(k) el.textContent = t(k);
    });
    document.querySelectorAll('[data-key-start]').forEach(el=>{
      if(running) el.textContent = t('btn.stop'); else el.textContent = t('btn.start');
    });
    document.querySelectorAll('.btn-large[data-key]').forEach(el=>{
      const k = el.getAttribute('data-key'); if(k) el.textContent = t(k);
    });
    secondsLabel.textContent = showSeconds ? (lang === 'en' ? 'On' : '表示') : (lang === 'en' ? 'Off' : '非表示');
  }

  function saveAll(){
    localStorage.setItem('nclock_hours', String(customHours));
    localStorage.setItem('nclock_mode', mode);
    localStorage.setItem('nclock_sw_elapsed', String(elapsedMs));
    localStorage.setItem('nclock_sw_laps', JSON.stringify(laps));
    localStorage.setItem('nclock_alarms', JSON.stringify(alarms));
    localStorage.setItem('nclock_show_seconds', String(showSeconds));
    localStorage.setItem('nclock_lang', lang);
    localStorage.setItem('nclock_last_triggered', lastTriggered);
  }

  // Mode switching
  function setMode(m){
    mode = m;
    [tabClock, tabStopwatch, tabAlarm, tabSettings].forEach(t => t.classList.remove('active'));
    if(m === 'clock') tabClock.classList.add('active');
    if(m === 'stopwatch') tabStopwatch.classList.add('active');
    if(m === 'alarm') tabAlarm.classList.add('active');
    if(m === 'settings') tabSettings.classList.add('active');

    stopwatchArea.style.display = (m === 'stopwatch') ? 'flex' : 'none';
    alarmArea.style.display = (m === 'alarm') ? 'block' : 'none';
    settingsArea.style.display = (m === 'settings') ? 'block' : 'none';
    sliderBox.style.display = (m === 'clock') ? 'block' : 'none';
    saveAll();
    applyLocalization();
  }
  setMode(mode);

  // Slider
  slider.addEventListener('input', (e) => {
    customHours = Number(e.target.value);
    labelHours.textContent = (lang === 'en') ? `${customHours} h` : `${customHours} 時間`;
    saveAll();
  });

  // Tabs
  tabClock.addEventListener('click', () => setMode('clock'));
  tabStopwatch.addEventListener('click', () => setMode('stopwatch'));
  tabAlarm.addEventListener('click', () => setMode('alarm'));
  tabSettings.addEventListener('click', () => setMode('settings'));

  // Language
  function setLanguage(newLang){
    lang = newLang;
    langSelect.value = newLang;
    langSelectSettings.value = newLang;
    applyLocalization();
    saveAll();
  }
  langSelect.addEventListener('change', () => setLanguage(langSelect.value));
  langSelectSettings.addEventListener('change', () => setLanguage(langSelectSettings.value));

  // Seconds toggle
  secondsToggle.addEventListener('change', () => {
    showSeconds = secondsToggle.checked;
    secondsLabel.textContent = showSeconds ? (lang === 'en' ? 'On' : '表示') : (lang === 'en' ? 'Off' : '非表示');
    saveAll();
  });

  // Stopwatch helpers
  function formatStopwatch(ms){
    const total = Math.floor(ms/1000);
    const h = Math.floor(total/3600);
    const m = Math.floor(total/60)%60;
    const s = total%60;
    if(h>0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function renderLaps(){
    lapList.innerHTML = '';
    if(laps.length === 0){
      lapList.innerHTML = `<div style="color:var(--muted);padding:8px">${lang==='en' ? 'No laps' : '
