
// fLAGLE

const $ = id => document.getElementById(id);
const showEl = (id, val='block') => $(id) && ($(id).style.display = val);
const hideEl = id => $(id) && ($(id).style.display = 'none');

let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(type, freq, duration, gain=0.18, detune=0) {
  try {
    const ac = getAudio();
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();
    osc.connect(gainNode); gainNode.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    osc.detune.setValueAtTime(detune, ac.currentTime);
    gainNode.gain.setValueAtTime(gain, ac.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  } catch(e) { /* audio blocked */ }
}

function playChord(freqs, type='sine', duration=0.4, gain=0.12) {
  freqs.forEach((f,i) => setTimeout(() => playTone(type, f, duration, gain), i*25));
}

const SFX = {
  correct() {
    // bright ascending ping
    playTone('sine', 523, 0.15, 0.2);
    setTimeout(() => playTone('sine', 659, 0.15, 0.18), 80);
    setTimeout(() => playTone('sine', 784, 0.25, 0.16), 160);
  },
  wrong() {
    // low descending thud
    playTone('square', 220, 0.08, 0.12);
    setTimeout(() => playTone('square', 180, 0.18, 0.08), 80);
    playTone('sawtooth', 110, 0.25, 0.06);
  },
  streak2() {
    // double ping
    playTone('sine', 659, 0.15, 0.18);
    setTimeout(() => playTone('sine', 784, 0.2, 0.18), 100);
  },
  streak3() {
    // triple escalating
    [523, 659, 784, 1047].forEach((f,i) => setTimeout(()=>playTone('sine',f,.2,.18),i*70));
  },
  streakMax() {
    // full chord burst
    playChord([523,659,784,1047], 'sine', 0.5, 0.14);
    setTimeout(()=>playTone('triangle',1568,.4,.1),200);
  },
  skip() {
    playTone('triangle', 330, 0.12, 0.1);
    setTimeout(()=>playTone('triangle', 262, 0.15, 0.08), 80);
  },
  tick() {
    // timer warning tick
    playTone('square', 880, 0.05, 0.06);
  },
  navigate() {
    playTone('sine', 440, 0.06, 0.07);
  },
  gameOver() {
    [392, 349, 330, 294].forEach((f,i) => setTimeout(()=>playTone('sine',f,.35,.12),i*120));
  },
  newRecord() {
    [523,659,784,1047,1319].forEach((f,i) => setTimeout(()=>playTone('sine',f,.3,.14),i*80));
  }
};


const SIMILAR_FLAGS = {
  'Chad':             ['Romania (nearly identical, Chad is slightly wider)'],
  'Romania':          ['Chad (nearly identical flags)'],
  'New Zealand':      ['Australia (both have Union Jack + Southern Cross)'],
  'Australia':        ['New Zealand (similar design, different star count)'],
  'Ireland':          ['Ivory Coast (mirrored tricolours)'],
  'Ivory Coast':      ['Ireland (mirrored green-white-orange)'],
  'Colombia':         ['Venezuela', 'Ecuador (all yellow-blue-red tricolours)'],
  'Venezuela':        ['Colombia', 'Ecuador'],
  'Ecuador':          ['Colombia (same colors, Ecuador has coat of arms)'],
  'Netherlands':      ['Luxembourg (Luxembourg is lighter blue and longer)'],
  'Luxembourg':       ['Netherlands (very similar, different proportions)'],
  'Russia':           ['Serbia (both use Pan-Slavic colors)'],
  'Slovenia':         ['Russia', 'Slovakia (similar tricolours with coats of arms)'],
  'Slovakia':         ['Slovenia'],
  'Serbia':           ['Russia'],
  'Norway':           ['Iceland (both Nordic crosses, different colors)'],
  'Iceland':          ['Norway'],
  'Indonesia':        ['Monaco (both red over white)'],
  'Monaco':           ['Indonesia (same colors, Monaco is wider)'],
  'Poland':           ['Indonesia (Poland is white over red)'],
  'Senegal':          ['Mali (green-yellow-red, Senegal has a star)'],
  'Mali':             ['Senegal', 'Guinea'],
  'Guinea':           ['Mali'],
  'South Korea':      ['Frequently confused with other East Asian flags'],
  'North Korea':      ['South Korea (both Korean peninsula flags)'],
  'United Kingdom':   ['Australia', 'New Zealand (both feature the Union Jack)'],
  'Sweden':           ['Finland (Nordic cross flags)'],
  'Finland':          ['Sweden'],
  'Denmark':          ['Norway', 'Switzerland (red with white cross variants)'],
  'Switzerland':      ['Denmark (both red with white crosses, different shapes)'],
  'Bolivia':          ['Colombia', 'Ecuador', 'Venezuela (red-yellow-green variants)'],
  'Cameroon':         ['Senegal', 'Mali (vertical tricolours)'],
  'Tanzania':         ['Mozambique', 'Zimbabwe (Southern African flags)'],
  'Zambia':           ['Zimbabwe', 'Tanzania'],
  'Zimbabwe':         ['Zambia', 'Tanzania'],
  'India':            ['Niger (both horizontal tricolours with circular center emblem)'],
  'Bangladesh':       ['Japan (both red circle on solid background)'],
  'Japan':            ['Bangladesh (similar concept, different colors)'],
  'Libya':            ['Saudi Arabia (both pan-Arab green flags)'],
  'Pakistan':         ['Saudi Arabia (both green flags with crescent)'],
  'Saudi Arabia':     ['Pakistan', 'Libya'],
  'United Arab Emirates': ['Jordan (both Pan-Arab colors with horizontal stripes)'],
  'Jordan':           ['United Arab Emirates'],
};

function getSimilarityWarning(countryName) {
  const similar = SIMILAR_FLAGS[countryName];
  if (!similar || !similar.length) return null;
  return `⚠️ Often confused with: ${similar.join(' · ')}`;
}


const STATS_KEY = 'flagle-stats-v2';

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || defaultStats(); }
  catch { return defaultStats(); }
}
function defaultStats() {
  return {
    totalSeen: 0,
    totalCorrect: 0,
    bestStreak: 0,
    bestScore: 0,
    regionStats: {},   // { regionName: { seen, correct } }
    countryStats: {},  // { countryName: { seen, correct } }
    recentWrong: [],   // last 6 wrong country names
  };
}
function saveStats(s) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

function recordAttempt(countryName, region, correct) {
  const s = loadStats();
  s.totalSeen++;
  if (correct) s.totalCorrect++;

  if (!s.regionStats[region]) s.regionStats[region] = { seen:0, correct:0 };
  s.regionStats[region].seen++;
  if (correct) s.regionStats[region].correct++;

  if (!s.countryStats[countryName]) s.countryStats[countryName] = { seen:0, correct:0 };
  s.countryStats[countryName].seen++;
  if (correct) s.countryStats[countryName].correct++;

  if (!correct) {
    s.recentWrong = [countryName, ...s.recentWrong.filter(n=>n!==countryName)].slice(0,6);
  }
  saveStats(s);
}

function updateBestScore(score) {
  const s = loadStats();
  if (score > s.bestScore) { s.bestScore = score; saveStats(s); }
  return s.bestScore;
}

function updateBestStreak(streak) {
  const s = loadStats();
  if (streak > s.bestStreak) { s.bestStreak = streak; saveStats(s); }
}

function getNemesis() {
  const s = loadStats();
  let worst = null, worstRate = 1.1;
  Object.entries(s.countryStats).forEach(([name, data]) => {
    if (data.seen < 3) return;
    const rate = data.correct / data.seen;
    if (rate < worstRate) { worstRate = rate; worst = { name, ...data }; }
  });
  return worst;
}

function renderStats() {
  const s = loadStats();
  $('st-seen').textContent = s.totalSeen;
  $('st-correct').textContent = s.totalCorrect;
  const acc = s.totalSeen > 0 ? Math.round((s.totalCorrect/s.totalSeen)*100) : 0;
  $('st-acc').textContent = acc + '%';
  $('st-streak').textContent = s.bestStreak;

  // region bars
  const rb = $('region-bars');
  rb.innerHTML = '';
  const regions = ['Europe','Asia','Africa','Americas','Oceania'];
  regions.forEach(r => {
    const d = s.regionStats[r] || {seen:0,correct:0};
    const pct = d.seen > 0 ? Math.round((d.correct/d.seen)*100) : 0;
    rb.innerHTML += `
      <div class="region-bar-row">
        <span class="region-bar-name">${r}</span>
        <div class="region-bar-track"><div class="region-bar-fill" style="width:${pct}%"></div></div>
        <span class="region-bar-pct">${d.seen?pct+'%':'—'}</span>
      </div>`;
  });

  // nemesis
  const nemesis = getNemesis();
  const nw = $('nemesis-wrap');
  if (nemesis) {
    nw.style.display = 'block';
    const country = COUNTRIES.find(c => c.name === nemesis.name);
    $('nemesis-card').innerHTML = `
      <img class="nemesis-flag" src="${country?.flagUrl||''}" alt="${nemesis.name}" />
      <div class="nemesis-info">
        <div class="nemesis-name">${nemesis.name}</div>
        <div class="nemesis-stat">${nemesis.correct}/${nemesis.seen} correct · ${Math.round((nemesis.correct/nemesis.seen)*100)}% accuracy</div>
      </div>`;
  } else { nw.style.display = 'none'; }

  // recent wrong
  const rw = $('recent-wrong-wrap');
  if (s.recentWrong.length > 0) {
    rw.style.display = 'block';
    $('wrong-flags').innerHTML = s.recentWrong.map(name => {
      const c = COUNTRIES.find(cc => cc.name === name);
      return `<div class="wrong-flag-item"><img src="${c?.flagUrl||''}" alt="${name}" /><span>${name}</span></div>`;
    }).join('');
  } else { rw.style.display = 'none'; }

  // stats pill on landing
  if (s.totalSeen > 0) {
    $('pill-flags').textContent = `${s.totalSeen} flags seen`;
    $('pill-acc').textContent = `${acc}% accuracy`;
    $('stats-pill').style.display = 'flex';
  }
}


const canvas = $('confetti-canvas'), ctx2d = canvas.getContext('2d');
let particles = [];
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resizeCanvas(); window.addEventListener('resize', resizeCanvas);
function spawnConfetti(count=60) {
  const cols = ['#c8ff00','#00e676','#2979ff','#ff9800','#ff3b3b','#fff','#ff69b4'];
  for (let i=0;i<count;i++) particles.push({
    x:window.innerWidth/2, y:window.innerHeight*0.33,
    vx:(Math.random()-0.5)*14, vy:Math.random()*-12-4,
    size:Math.random()*9+3, color:cols[Math.floor(Math.random()*cols.length)],
    alpha:1, rot:Math.random()*360, rotSpeed:(Math.random()-0.5)*14, isCircle:Math.random()<0.4,
  });
}
(function loop() {
  ctx2d.clearRect(0,0,canvas.width,canvas.height);
  particles = particles.filter(p=>p.alpha>0.01);
  particles.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.38; p.alpha-=0.013; p.rot+=p.rotSpeed;
    ctx2d.save(); ctx2d.globalAlpha=p.alpha; ctx2d.fillStyle=p.color;
    ctx2d.translate(p.x,p.y); ctx2d.rotate(p.rot*Math.PI/180);
    if(p.isCircle){ctx2d.beginPath();ctx2d.arc(0,0,p.size/2,0,Math.PI*2);ctx2d.fill();}
    else ctx2d.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
    ctx2d.restore();
  });
  requestAnimationFrame(loop);
})();

const SCREENS = ['landing','difficulty','region','stats','game','gameover','paint'];
function showScreen(name) {
  SCREENS.forEach(s=>{ const el=$(`screen-${s}`); if(el) el.classList.remove('active'); });
  const t = $(`screen-${name}`); if(t) t.classList.add('active');
  $('home-btn').style.display = name==='landing' ? 'none' : 'block';
  if (name !== 'landing') SFX.navigate();
}


let state = {
  mode:'classic', difficulty:'easy', region:'all', playerName:'Explorer',
  score:0, lives:3, round:1, correct:0, streak:0, maxStreak:0,
  current:null, pool:[], locked:false,
  timerInterval:null, timerTotal:30, timerLeft:30,
  lastFlag:null,
};
const MULT = {easy:1,medium:2,hard:3};
const TIMER_BY_DIFF = {easy:35,medium:25,hard:18};
const STREAK_LABELS = ['','','🔥 ×1.5','🔥🔥 ×2','🔥🔥🔥 ×3'];
const STREAK_MULTS  = [1,1,1.5,2,3];
const DAILY_ROUNDS  = 10;

// stored scores for best tracking
function getStoredBest() {
  return loadStats().bestScore;
}


$('home-btn').style.display = 'none';
$('home-btn').addEventListener('click', () => { clearTimer(); showScreen('landing'); renderStats(); });

document.querySelectorAll('.mode-card').forEach(btn => {
  btn.addEventListener('click', () => {
    state.mode = btn.dataset.mode;
    // playerName already set by name logic — fall back to input value or default
    if (!state.playerName) state.playerName = $('player-name').value.trim() || 'Explorer';
    if (state.mode==='daily'||state.mode==='paintflag') startGame();
    else { $('diff-mode-label').textContent = btn.querySelector('.mode-title').textContent+' Mode'; showScreen('difficulty'); }
  });
});

// ── name persistence ──────────────────────────
const NAME_KEY = 'flagle-player-name';

const GREETINGS = [
  n => `welcome back, ${n} 👋`,
  n => `ready to play, ${n}?`,
  n => `good to see you, ${n}`,
  n => `let's go, ${n} 🌍`,
  n => `hey ${n}, flags await`,
];

function getGreeting(name) {
  const fn = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  return fn(name);
}

function saveName(name) {
  localStorage.setItem(NAME_KEY, name);
  state.playerName = name;
}

function showGreeting(name) {
  $('name-input-wrap').style.display = 'none';
  $('name-greeting').style.display   = 'flex';
  $('greeting-text').textContent      = getGreeting(name);
  $('logo-sub').textContent           = 'test your vexillology';
}

function showNameInput() {
  $('name-greeting').style.display   = 'none';
  $('name-input-wrap').style.display = 'flex';
  setTimeout(() => $('player-name').focus(), 60);
}

// restore on load
(function initName() {
  const saved = localStorage.getItem(NAME_KEY);
  if (saved) {
    state.playerName = saved;
    $('player-name').value = saved;
    showGreeting(saved);
  }
})();

// show tick when user types
$('player-name').addEventListener('input', () => {
  const tick = $('name-tick-btn');
  if (!tick) return;
  tick.style.display = $('player-name').value.trim().length > 0 ? 'flex' : 'none';
});

// enter key confirms
$('player-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const name = $('player-name').value.trim();
    if (name) { confirmName(name); }
    else document.querySelector('.mode-card[data-mode="classic"]').click();
  }
});

// tick button confirms
$('name-tick-btn') && $('name-tick-btn').addEventListener('click', () => {
  const name = $('player-name').value.trim();
  if (name) confirmName(name);
});

// "not you?" resets to input
$('greeting-edit') && $('greeting-edit').addEventListener('click', () => {
  localStorage.removeItem(NAME_KEY);
  $('player-name').value = '';
  $('name-tick-btn').style.display = 'none';
  showNameInput();
});

function confirmName(name) {
  saveName(name);
  SFX.correct();
  // flash tick green briefly
  const tick = $('name-tick-btn');
  if (tick) { tick.style.background = 'var(--green)'; setTimeout(() => { tick.style.background = 'var(--accent)'; }, 500); }
  showGreeting(name);
}

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => { state.difficulty = btn.dataset.diff; startGame(); });
});
$('back-from-diff').addEventListener('click', () => showScreen('landing'));

$('region-btn').addEventListener('click', () => showScreen('region'));
document.querySelectorAll('.region-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.region-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); state.region = btn.dataset.region;
  });
});
$('region-confirm-btn').addEventListener('click', () => showScreen('landing'));
$('back-from-region').addEventListener('click', () => showScreen('landing'));

// stats
function openStats() { renderStats(); showScreen('stats'); }
$('stats-page-btn').addEventListener('click', openStats);
$('view-stats-btn').addEventListener('click', openStats);
$('back-from-stats').addEventListener('click', () => showScreen('landing'));

// paint it button in footer
$('paint-mode-btn') && $('paint-mode-btn').addEventListener('click', () => {
  state.playerName = $('player-name').value.trim() || 'Explorer';
  state.mode = 'paintflag';
  startGame();
});
$('reset-stats-btn').addEventListener('click', () => {
  if (confirm('Reset all personal stats? This cannot be undone.')) {
    localStorage.removeItem(STATS_KEY);
    renderStats();
  }
});

$('restart-btn').addEventListener('click', startGame);
$('change-mode-btn').addEventListener('click', () => showScreen('landing'));
$('share-btn').addEventListener('click', shareResult);

document.addEventListener('keydown', e => {
  if (e.key==='Escape') { clearTimer(); showScreen('landing'); renderStats(); return; }
  if (!$('screen-game').classList.contains('active')) return;

  if (e.key==='Tab') {
    const sb=$('skip-btn');
    if(sb && sb.style.display!=='none' && $('screen-game').classList.contains('active')) {
      e.preventDefault(); sb.click();
    }
    return;
  }

  const sugg = $('suggestions');
  if (sugg && sugg.style.display!=='none') {
    const items=[...(sugg.querySelectorAll('.suggestion')||[])];
    const idx = items.indexOf(sugg.querySelector('.highlighted'));
    if (e.key==='ArrowDown') { e.preventDefault(); const ni=Math.min(idx+1,items.length-1); items.forEach(i=>i.classList.remove('highlighted')); if(items[ni]){items[ni].classList.add('highlighted');$('guess-input').value=items[ni].textContent;} }
    else if (e.key==='ArrowUp') { e.preventDefault(); const ni=Math.max(idx-1,0); items.forEach(i=>i.classList.remove('highlighted')); if(items[ni]){items[ni].classList.add('highlighted');$('guess-input').value=items[ni].textContent;} }
  }

  const mcVis = $('mc-options').style.display!=='none';
  const rvVis = $('reverse-options').style.display!=='none';
  if (mcVis||rvVis) {
    const btns=[...((mcVis?$('mc-options'):$('reverse-options')).querySelectorAll('button:not(:disabled)')||[])];
    const num=parseInt(e.key);
    if (num>=1&&num<=btns.length) { e.preventDefault(); btns[num-1].click(); }
  }
});

// ═══════════════════════════════════════════════
// pOOL
// ═══════════════════════════════════════════════
function buildPool(rng) {
  let pool = state.region==='all' ? [...COUNTRIES] : COUNTRIES.filter(c=>c.region===state.region);
  if (!pool.length) pool=[...COUNTRIES];
  for (let i=pool.length-1;i>0;i--) {
    const j=Math.floor((rng||Math.random)()*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  return pool;
}

// ═══════════════════════════════════════════════
// sTART GAME
// ═══════════════════════════════════════════════
function startGame() {
  clearTimer();
  Object.assign(state,{score:0,lives:3,round:1,correct:0,streak:0,maxStreak:0,locked:false,pool:[],lastFlag:null});

  if (state.mode==='daily') {
    state.difficulty='medium';
    const rng=seededRandom(getDailySeed());
    state.pool=buildPool(rng).slice(0,DAILY_ROUNDS);
  } else if (state.mode==='paintflag') {
    // paint mode: pick one random flag and go straight to paint screen
    state.pool=buildPool();
    state.current=state.pool.pop();
    state.lastFlag=state.current;
    showPaintStandalone();
    return;
  } else {
    state.pool=buildPool();
  }

  hideEl('classic-input'); hideEl('mc-options'); hideEl('reverse-options');
  $('flag-wrap').style.display='block';
  $('similarity-warn').style.display='none';

  if (['classic','streak','timeattack','daily'].includes(state.mode)) {
    showEl('classic-input');
    $('kbd-game-hint').innerHTML='Type · <kbd>Enter</kbd> guess · <kbd>↑↓</kbd> suggest · <kbd>Tab</kbd> skip';
  } else if (state.mode==='multichoice') {
    showEl('mc-options','grid');
    $('kbd-game-hint').innerHTML='Press <kbd>1</kbd>–<kbd>4</kbd> to choose';
  } else if (state.mode==='reverse') {
    showEl('reverse-options','grid');
    $('kbd-game-hint').innerHTML='Press <kbd>1</kbd>–<kbd>4</kbd> to choose the flag';
  }

  showEl('timer-wrap', state.mode==='timeattack'?'block':'none');
  $('lives-label').textContent='Lives';
  $('right-hud-label').textContent='Round';
  updateHUD(); showScreen('game'); nextRound();
}

// ═══════════════════════════════════════════════
// nEXT ROUND
// ═══════════════════════════════════════════════
function nextRound() {
  clearTimer();
  state.locked=false;
  hideFeedback();
  $('similarity-warn').style.display='none';
  if ($('guess-input')) $('guess-input').value='';
  hideEl('suggestions');
  if ($('suggestions')) $('suggestions').innerHTML='';
  updateStreakBar();

  if (state.mode==='daily') {
    if (state.round-1>=state.pool.length) { endGame(); return; }
    state.current=state.pool[state.round-1];
  } else {
    if (!state.pool.length) state.pool=buildPool();
    state.current=state.pool.pop();
  }
  state.lastFlag=state.current;

  const c=state.current;

  if (state.mode==='reverse') {
    $('flag-wrap').style.display='none';
  } else {
    $('flag-wrap').style.display='block';
    const img=$('flag-image');
    const shimmer=$('flag-shimmer');
    img.classList.remove('loaded');
    img.removeAttribute('src');
    shimmer.classList.remove('hidden');
    const pre=new Image();
    pre.onload=()=>{ img.src=c.flagUrl; img.classList.add('loaded'); shimmer.classList.add('hidden'); };
    pre.onerror=()=>{ img.src=c.flagUrl; img.classList.add('loaded'); shimmer.classList.add('hidden'); };
    pre.src=c.flagUrl;
  }

  $('hint-text').textContent = state.mode==='reverse' ? `Find the flag of: ${c.name}` : buildHint(c);
  $('round-display').textContent = state.mode==='daily' ? `${state.round}/${DAILY_ROUNDS}` : state.round;

  if (state.mode==='multichoice') buildMCOptions(c);
  if (state.mode==='reverse') buildReverseOptions(c);
  if (state.mode==='timeattack') startTimer();
  if (['classic','streak','timeattack','daily'].includes(state.mode))
    setTimeout(()=>$('guess-input')&&$('guess-input').focus(),80);
}

function buildHint(c) {
  if (state.difficulty==='hard') return '— No hints —';
  if (state.difficulty==='easy') return `Capital: ${c.capital}`;
  return `Region: ${c.region}`;
}

// ═══════════════════════════════════════════════
// mULTI-CHOICE
// ═══════════════════════════════════════════════
function buildMCOptions(correct) {
  const grid=$('mc-options'); grid.innerHTML='';
  const decoys=COUNTRIES.filter(c=>c.name!==correct.name).sort(()=>Math.random()-.5).slice(0,3);
  const options=[...decoys,correct].sort(()=>Math.random()-.5);
  options.forEach((c,i)=>{
    const btn=document.createElement('button');
    btn.className='mc-btn'; btn.textContent=`${i+1}. ${c.name}`; btn.tabIndex=2+i;
    btn.addEventListener('click',()=>handleMCAnswer(c,btn,options));
    grid.appendChild(btn);
  });
}
function handleMCAnswer(chosen,btn,options) {
  if (state.locked) return; state.locked=true;
  const ok=chosen.name===state.current.name;
  $('mc-options').querySelectorAll('.mc-btn').forEach((b,i)=>{ b.disabled=true; if(options[i].name===state.current.name) b.classList.add('correct'); });
  if (!ok) btn.classList.add('wrong');
  processAnswer(ok);
}

// ═══════════════════════════════════════════════
// rEVERSE MODE
// ═══════════════════════════════════════════════
function buildReverseOptions(correct) {
  const grid=$('reverse-options'); grid.innerHTML='';
  const decoys=COUNTRIES.filter(c=>c.name!==correct.name).sort(()=>Math.random()-.5).slice(0,3);
  const options=[...decoys,correct].sort(()=>Math.random()-.5);
  options.forEach((c,i)=>{
    const btn=document.createElement('button');
    btn.className='reverse-flag-btn'; btn.tabIndex=2+i;
    const img=document.createElement('img');
    img.src=c.flagUrl; img.alt=`Option ${i+1}`; img.loading='lazy';
    btn.appendChild(img);
    btn.addEventListener('click',()=>handleReverseAnswer(c,btn,options));
    grid.appendChild(btn);
  });
}
function handleReverseAnswer(chosen,btn,options) {
  if (state.locked) return; state.locked=true;
  const ok=chosen.name===state.current.name;
  $('reverse-options').querySelectorAll('.reverse-flag-btn').forEach((b,i)=>{ b.disabled=true; if(options[i].name===state.current.name) b.classList.add('correct'); });
  if (!ok) btn.classList.add('wrong');
  processAnswer(ok);
}

// ═══════════════════════════════════════════════
// lEVENSHTEIN "ALMOST!" DETECTION
// ═══════════════════════════════════════════════
function levenshtein(a, b) {
  const m=a.length, n=b.length;
  const dp=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);
  for (let j=0;j<=n;j++) dp[0][j]=j;
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

// ═══════════════════════════════════════════════
// cLASSIC SUBMIT
// ═══════════════════════════════════════════════
$('submit-btn').addEventListener('click', submitClassic);
$('guess-input').addEventListener('keydown', e=>{ if(e.key==='Enter') submitClassic(); });
function submitClassic() {
  if (state.locked) return;
  const guess=$('guess-input').value.trim().toLowerCase();
  if (!guess) return;
  const answer=state.current.name.toLowerCase();
  const dist=levenshtein(guess, answer);
  // almost: within 2 edits but not correct, and guess is reasonably long
  if (dist>0 && dist<=2 && guess.length>=3) {
    // show "almost" flash without consuming a life — just warn
    const el=$('feedback');
    el.className='feedback almost show';
    el.textContent=`🟡 Almost! Check your spelling — try again`;
    // don't lock, don't advance — let them retry
    setTimeout(()=>{ if(!state.locked){el.className='feedback';el.textContent='';} },1800);
    return;
  }
  state.locked=true; hideEl('suggestions');
  processAnswer(dist===0);
}

// ═══════════════════════════════════════════════
// sKIP
// ═══════════════════════════════════════════════
$('skip-btn').addEventListener('click',()=>{
  if (state.locked) return; state.locked=true; clearTimer();
  SFX.skip();
  const c=state.current;
  recordAttempt(c.name,c.region,false);
  state.streak=0; loseLife();
  showFeedback('wrong', `⟳ Skipped — it was ${c.name}`);
  showSimilarity(c.name);
  updateHUD(); updateStreakBar(); scheduleNext();
});

// ═══════════════════════════════════════════════
// pROCESS ANSWER
// ═══════════════════════════════════════════════
function processAnswer(ok) {
  clearTimer();
  const c=state.current;
  recordAttempt(c.name, c.region, ok);

  if (ok) {
    state.streak=Math.min(state.streak+1,4);
    state.maxStreak=Math.max(state.maxStreak,state.streak);
    updateBestStreak(state.maxStreak);

    let pts=MULT[state.difficulty];
    if (state.mode==='streak') pts=Math.round(pts*STREAK_MULTS[Math.min(state.streak,4)]);
    let timeBonus=0;
    if (state.mode==='timeattack') { timeBonus=Math.floor(state.timerLeft*.5); pts+=timeBonus; }
    state.score+=pts; state.correct++;

    // escalating sound based on streak
    if (state.streak>=4) SFX.streakMax();
    else if (state.streak===3) SFX.streak3();
    else if (state.streak===2) SFX.streak2();
    else SFX.correct();

    animateScore(); updateHUD();
    let msg=`✓ ${c.name} · +${pts} pt${pts!==1?'s':''}`;
    if (timeBonus>0) msg+=` (+${timeBonus} speed)`;
    if (state.streak>=2) msg+=` · ${STREAK_LABELS[Math.min(state.streak,4)]}`;
    showFeedback('correct',msg);
    if (state.streak>=3) spawnConfetti();
  } else {
    SFX.wrong();
    state.streak=0; loseLife();
    showFeedback('wrong', `✗ It was ${c.name}`);
    showSimilarity(c.name);
    updateHUD();
  }
  updateStreakBar(); scheduleNext();
}

function showSimilarity(name) {
  const warn=getSimilarityWarning(name);
  const el=$('similarity-warn');
  if (warn) {
    el.textContent=warn;
    el.style.display='block';
  } else {
    el.style.display='none';
  }
}

function loseLife() { if (state.mode!=='daily') state.lives--; }

function scheduleNext() {
  const done=(state.lives<=0&&state.mode!=='daily')||(state.mode==='daily'&&state.round>=DAILY_ROUNDS);
  setTimeout(()=>{
    if (done) { endGame(); return; }
    $('flag-wrap').style.display='block'; state.round++; nextRound();
  },1500);
}

// ═══════════════════════════════════════════════
// tIMER
// ═══════════════════════════════════════════════
let timerTick=0;
function startTimer() {
  clearTimer();
  state.timerTotal=TIMER_BY_DIFF[state.difficulty];
  state.timerLeft=state.timerTotal;
  timerTick=0;
  renderTimerBar();
  state.timerInterval=setInterval(()=>{
    state.timerLeft=Math.max(0,state.timerLeft-1);
    timerTick++;
    renderTimerBar();
    // tick sound on last 5 seconds
    if (state.timerLeft<=5&&state.timerLeft>0) SFX.tick();
    if (state.timerLeft<=0) {
      clearTimer();
      if (state.locked) return;
      state.locked=true; state.streak=0; SFX.wrong();
      recordAttempt(state.current.name,state.current.region,false);
      loseLife();
      showFeedback('wrong',`⏱ Time's up! It was ${state.current.name}`);
      showSimilarity(state.current.name);
      updateHUD(); updateStreakBar(); scheduleNext();
    }
  },1000);
}
function clearTimer() {
  if (state.timerInterval!==null) { clearInterval(state.timerInterval); state.timerInterval=null; }
}
function renderTimerBar() {
  const bar=$('timer-bar'); if(!bar) return;
  const pct=state.timerTotal>0?(state.timerLeft/state.timerTotal)*100:0;
  bar.style.width=pct+'%';
  bar.className='timer-inner'+(pct<25?' danger':pct<50?' warning':'');
}

// ═══════════════════════════════════════════════
// hUD
// ═══════════════════════════════════════════════
function updateHUD() {
  $('score-display').textContent=state.score;
  [$('l1'),$('l2'),$('l3')].forEach((d,i)=>d&&d.classList.toggle('lost',i>=state.lives));
}
function updateStreakBar() {
  const bar=$('streak-bar'); if(!bar) return;
  if (state.streak>=2) {
    bar.textContent=(STREAK_LABELS[Math.min(state.streak,4)]||'🔥🔥🔥 ×3')+' STREAK';
    bar.classList.add('visible');
  } else {
    bar.textContent='';
    bar.classList.remove('visible');
  }
}

function showFeedback(type,msg) { const el=$('feedback'); el.className=`feedback ${type} show`; el.textContent=msg; }
function hideFeedback() { const el=$('feedback'); if(el){el.className='feedback';el.textContent='';} }

function animateScore() {
  const el=$('score-display'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  setTimeout(()=>el.classList.remove('pop'),450);
}

// ═══════════════════════════════════════════════
// sUGGESTIONS
// ═══════════════════════════════════════════════
$('guess-input').addEventListener('input',()=>{
  const q=$('guess-input').value.trim().toLowerCase(), box=$('suggestions');
  if (q.length<2) { box.style.display='none'; return; }
  const src=state.region==='all'?COUNTRIES:COUNTRIES.filter(c=>c.region===state.region);
  const matches=src.filter(c=>c.name.toLowerCase().includes(q)).slice(0,7);
  if (!matches.length) { box.style.display='none'; return; }
  box.innerHTML=matches.map(c=>`<div class="suggestion" role="option">${c.name}</div>`).join('');
  box.style.display='block';
  box.querySelectorAll('.suggestion').forEach(el=>{
    el.addEventListener('mousedown',e=>{ e.preventDefault(); $('guess-input').value=el.textContent; box.style.display='none'; submitClassic(); });
  });
});
document.addEventListener('click',e=>{ if(!e.target.closest('.input-wrap')) hideEl('suggestions'); });

// ═══════════════════════════════════════════════
// gAME OVER
// ═══════════════════════════════════════════════
function endGame() {
  clearTimer();
  SFX.gameOver();
  const prevBest=getStoredBest();
  const newBest=updateBestScore(state.score);
  const isNew=state.score>prevBest&&state.score>0;
  if (isNew) { setTimeout(SFX.newRecord,400); setTimeout(spawnConfetti,100); }

  $('go-score').textContent=state.score;
  $('go-correct').textContent=state.correct;
  $('go-rounds').textContent=state.round-1;
  $('go-diff').textContent=state.difficulty.charAt(0).toUpperCase()+state.difficulty.slice(1);
  $('go-best').textContent=newBest;

  const nr=$('new-record'); isNew?nr.classList.add('show'):nr.classList.remove('show');
  const names={classic:'Classic',multichoice:'Multi-Choice',timeattack:'Time Attack',streak:'Streak',reverse:'Reverse',daily:'Daily Challenge'};
  $('go-eyebrow').textContent=names[state.mode]||'Game Over';
  $('go-streak').textContent=state.maxStreak>=3?`🔥 Best streak this game: ${state.maxStreak}`:'';

  // init paint mini-game
  if (state.lastFlag) {
    $('paint-country-name').textContent=`Recreate: ${state.lastFlag.name}`;
    $('paint-reference').src=state.lastFlag.flagUrl;
    initPaintGame();
  }

  showScreen('gameover');
}

// ═══════════════════════════════════════════════
// pAINT MINI-GAME
// ═══════════════════════════════════════════════
const PAINT_COLORS = [
  '#ffffff','#000000','#ff3b3b','#ff9800','#ffeb3b',
  '#00e676','#2979ff','#9c27b0','#795548','#607d8b',
  '#e91e63','#00bcd4','#c8ff00','#4caf50','#3f51b5','#ff5722'
];

let paintState = { tool:'brush', color:'#ff3b3b', size:14, drawing:false, fillMode:false };

function initPaintGame() {
  const pal=$('palette');
  pal.innerHTML='';
  PAINT_COLORS.forEach(col=>{
    const sw=document.createElement('button');
    sw.className='palette-swatch'+(col===paintState.color?' active':'');
    sw.style.background=col; sw.title=col;
    sw.addEventListener('click',()=>{
      paintState.color=col; paintState.tool='brush';
      pal.querySelectorAll('.palette-swatch').forEach(s=>s.classList.remove('active'));
      sw.classList.add('active'); setTool('brush');
    });
    pal.appendChild(sw);
  });
  setTool('brush');
  $('tool-brush').onclick=()=>setTool('brush');
  $('tool-fill').onclick=()=>setTool('fill');
  $('tool-eraser').onclick=()=>setTool('eraser');

  const result = setupPaintCanvas('paint-canvas', $('brush-size'));
  if (!result) return;
  const { el: fc, ctx: fx } = result;

  $('brush-size').oninput=()=>{ paintState.size=parseInt($('brush-size').value); };
  $('paint-clear').onclick=()=>{ fx.fillStyle='#ffffff'; fx.fillRect(0,0,fc.width,fc.height); };
}

function setTool(name) {
  paintState.tool=name;
  ['brush','fill','eraser'].forEach(t=>{
    const btn=$('tool-'+t); if(btn) btn.classList.toggle('active',t===name);
  });
}

function hexToRgb(hex) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return [r,g,b,255];
}

function floodFill(ctx, x, y, fillColor) {
  const imgData=ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);
  const data=imgData.data;
  const w=ctx.canvas.width, h=ctx.canvas.height;
  const idx=(px,py)=>(py*w+px)*4;
  const target=[data[idx(x,y)],data[idx(x,y)+1],data[idx(x,y)+2],data[idx(x,y)+3]];
  if (target.every((v,i)=>v===fillColor[i])) return;

  function match(px,py) {
    const i=idx(px,py);
    return data[i]===target[0]&&data[i+1]===target[1]&&data[i+2]===target[2]&&data[i+3]===target[3];
  }
  function set(px,py) {
    const i=idx(px,py);
    data[i]=fillColor[0];data[i+1]=fillColor[1];data[i+2]=fillColor[2];data[i+3]=fillColor[3];
  }

  const stack=[[x,y]];
  const visited=new Uint8Array(w*h);
  while (stack.length) {
    const [cx,cy]=stack.pop();
    if (cx<0||cy<0||cx>=w||cy>=h) continue;
    if (visited[cy*w+cx]) continue;
    if (!match(cx,cy)) continue;
    visited[cy*w+cx]=1;
    set(cx,cy);
    stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
  }
  ctx.putImageData(imgData,0,0);
}

// ═══════════════════════════════════════════════
// sHARE
// ═══════════════════════════════════════════════
function shareResult() {
  const emojis={classic:'🏳️',multichoice:'🔢',timeattack:'⚡',streak:'🔥',reverse:'↩️',daily:'📅'};
  const bars=['⬜','🟥','🟧','🟩'];
  const accBar=state.round>1?bars[Math.min(3,Math.floor((state.correct/(state.round-1))*4))]:'⬜';
  const text=[
    `${emojis[state.mode]||'🌍'} FLAGLE — ${(state.mode).toUpperCase()}`,
    `Score: ${state.score}  |  ${state.correct}/${state.round-1} ${accBar}`,
    `Difficulty: ${state.difficulty}`,
    state.maxStreak>=3?`🔥 Best streak: ${state.maxStreak}`:'',
    '',
    'github.com/ShiiiivanshSingh/Flag-Guess-'
  ].filter(l=>l!==null&&l!==undefined).join('\n');

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(()=>{
      const t=$('share-toast'); t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2500);
    }).catch(()=>prompt('Copy your result:',text));
  } else { prompt('Copy your result:',text); }
}

// ═══════════════════════════════════════════════
// sTANDALONE PAINT MODE
// ═══════════════════════════════════════════════
function showPaintStandalone() {
  const c=state.current;
  $('paint-standalone-flag-name').textContent=`Paint: ${c.name}`;
  $('paint-standalone-reference').src=c.flagUrl;
  initPaintStandalone();
  showScreen('paint');
}

function initPaintStandalone() {
  const pal=$('paint-standalone-palette');
  pal.innerHTML='';
  PAINT_COLORS.forEach(col=>{
    const sw=document.createElement('button');
    sw.className='palette-swatch'+(col===paintState.color?' active':'');
    sw.style.background=col;
    sw.addEventListener('click',()=>{
      paintState.color=col; paintState.tool='brush';
      pal.querySelectorAll('.palette-swatch').forEach(s=>s.classList.remove('active'));
      sw.classList.add('active'); setToolOn('standalone','brush');
    });
    pal.appendChild(sw);
  });

  setToolOn('standalone','brush');
  $('tool-brush-s').onclick=()=>setToolOn('standalone','brush');
  $('tool-fill-s').onclick=()=>setToolOn('standalone','fill');
  $('tool-eraser-s').onclick=()=>setToolOn('standalone','eraser');

  const result = setupPaintCanvas('paint-standalone-canvas', $('brush-size-s'));
  if (!result) return;
  const { el: fc, ctx: fx } = result;

  $('brush-size-s').oninput=()=>{ paintState.size=parseInt($('brush-size-s').value); };
  $('paint-standalone-clear').onclick=()=>{ fx.fillStyle='#ffffff'; fx.fillRect(0,0,fc.width,fc.height); };
  $('paint-standalone-new').onclick=()=>{
    state.pool=buildPool();
    state.current=state.pool.pop();
    state.lastFlag=state.current;
    showPaintStandalone();
  };
  $('paint-standalone-back').onclick=()=>showScreen('landing');
}

function setToolOn(prefix, name) {
  paintState.tool=name;
  const map={brush:'tool-brush-s',fill:'tool-fill-s',eraser:'tool-eraser-s'};
  Object.entries(map).forEach(([t,id])=>{ const b=$(id); if(b) b.classList.toggle('active',t===name); });
}

function setupPaintCanvas(canvasId, sizeSlider) {
  // get fresh element by id each call — never clone, cloning loses the 2d context
  const pc = typeof canvasId === 'string' ? $(canvasId) : canvasId;
  if (!pc) return;
  const pctx = pc.getContext('2d');

  // clear to white
  pctx.fillStyle = '#ffffff';
  pctx.fillRect(0, 0, pc.width, pc.height);

  function getPos(e) {
    const rect = pc.getBoundingClientRect();
    const sx = pc.width / rect.width, sy = pc.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy };
  }

  let drawing = false;

  function startDraw(e) {
    e.preventDefault();
    const { x, y } = getPos(e);
    if (paintState.tool === 'fill') {
      floodFill(pctx, Math.round(x), Math.round(y), hexToRgb(paintState.color));
      return;
    }
    drawing = true;
    pctx.beginPath();
    pctx.moveTo(x, y);
  }

  function draw(e) {
    e.preventDefault();
    if (!drawing) return;
    const { x, y } = getPos(e);
    const sz = sizeSlider ? parseInt(sizeSlider.value) : paintState.size;
    pctx.lineWidth = sz;
    pctx.lineCap = 'round';
    pctx.lineJoin = 'round';
    pctx.strokeStyle = paintState.tool === 'eraser' ? '#ffffff' : paintState.color;
    pctx.lineTo(x, y);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(x, y);
  }

  function stopDraw() {
    drawing = false;
    pctx.beginPath();
  }

  // remove old listeners by replacing with a fresh clone of just the element shell,
  // but we keep the pctx reference alive by redrawing after clone
  const snapshot = pctx.getImageData(0, 0, pc.width, pc.height);
  const fresh = pc.cloneNode(false); // cloneNode(false) = no children, keeps attributes
  pc.parentNode.replaceChild(fresh, pc);
  const freshCtx = fresh.getContext('2d');
  freshCtx.putImageData(snapshot, 0, 0);

  fresh.addEventListener('mousedown', e => {
    e.preventDefault();
    const { x, y } = getPos2(fresh, e);
    if (paintState.tool === 'fill') {
      floodFill(freshCtx, Math.round(x), Math.round(y), hexToRgb(paintState.color)); return;
    }
    drawing = true;
    freshCtx.beginPath(); freshCtx.moveTo(x, y);
  });
  fresh.addEventListener('mousemove', e => {
    e.preventDefault();
    if (!drawing) return;
    const { x, y } = getPos2(fresh, e);
    const sz = sizeSlider ? parseInt(sizeSlider.value) : paintState.size;
    freshCtx.lineWidth = sz; freshCtx.lineCap = 'round'; freshCtx.lineJoin = 'round';
    freshCtx.strokeStyle = paintState.tool === 'eraser' ? '#ffffff' : paintState.color;
    freshCtx.lineTo(x, y); freshCtx.stroke();
    freshCtx.beginPath(); freshCtx.moveTo(x, y);
  });
  fresh.addEventListener('mouseup', () => { drawing = false; freshCtx.beginPath(); });
  fresh.addEventListener('mouseleave', () => { drawing = false; freshCtx.beginPath(); });
  fresh.addEventListener('touchstart', e => {
    e.preventDefault();
    const { x, y } = getPos2(fresh, e);
    if (paintState.tool === 'fill') {
      floodFill(freshCtx, Math.round(x), Math.round(y), hexToRgb(paintState.color)); return;
    }
    drawing = true; freshCtx.beginPath(); freshCtx.moveTo(x, y);
  }, { passive: false });
  fresh.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!drawing) return;
    const { x, y } = getPos2(fresh, e);
    const sz = sizeSlider ? parseInt(sizeSlider.value) : paintState.size;
    freshCtx.lineWidth = sz; freshCtx.lineCap = 'round'; freshCtx.lineJoin = 'round';
    freshCtx.strokeStyle = paintState.tool === 'eraser' ? '#ffffff' : paintState.color;
    freshCtx.lineTo(x, y); freshCtx.stroke();
    freshCtx.beginPath(); freshCtx.moveTo(x, y);
  }, { passive: false });
  fresh.addEventListener('touchend', () => { drawing = false; freshCtx.beginPath(); });

  // return fresh canvas + ctx so callers can reference them for clear etc.
  return { el: fresh, ctx: freshCtx };
}

function getPos2(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy };
}

// ═══════════════════════════════════════════════
// cURSOR TRAIL PARTICLES (landing only)
// ═══════════════════════════════════════════════
// custom cursor
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// CURSOR
// ═══════════════════════════════════════════════
const curDot  = $('cursor-dot');
const curRing = $('cursor-ring');
let curX = -100, curY = -100, ringX = -100, ringY = -100;

document.addEventListener('mousemove', e => {
  curX = e.clientX;
  curY = e.clientY;
  // use left/top so the CSS `transform: translate(-50%,-50%)` centering is preserved
  if (curDot) { curDot.style.left = curX + 'px'; curDot.style.top = curY + 'px'; }
});

(function ringLoop() {
  ringX += (curX - ringX) * 0.18;
  ringY += (curY - ringY) * 0.18;
  if (curRing) { curRing.style.left = ringX + 'px'; curRing.style.top = ringY + 'px'; }
  requestAnimationFrame(ringLoop);
})();

document.addEventListener('mouseover', e => {
  if (!curRing) return;
  curRing.classList.toggle('hovered', !!e.target.closest('button, a, input, [role="option"], .mode-card, .palette-swatch'));
});

document.addEventListener('mousedown', () => curDot?.classList.add('pressed'));
document.addEventListener('mouseup',   () => curDot?.classList.remove('pressed'));

document.addEventListener('mouseleave', () => {
  if (curDot)  curDot.style.opacity  = '0';
  if (curRing) curRing.style.opacity = '0';
});
document.addEventListener('mouseenter', () => {
  if (curDot)  curDot.style.opacity  = '1';
  if (curRing) curRing.style.opacity = '1';
});

// ═══════════════════════════════════════════════
// init

showScreen('landing');
renderStats();
