// ═══════════════════════════════════════════════
// FLAGLE — GAME LOGIC (FIXED)
// ═══════════════════════════════════════════════

const $ = id => document.getElementById(id);
const showEl = (id, val = 'block') => $(id) && ($(id).style.display = val);
const hideEl = id => $(id) && ($(id).style.display = 'none');

const SCREENS = ['landing', 'difficulty', 'region', 'game', 'gameover'];
function showScreen(name) {
  SCREENS.forEach(s => { const el = $(`screen-${s}`); if (el) el.classList.remove('active'); });
  const t = $(`screen-${name}`); if (t) t.classList.add('active');
  $('home-btn').style.display = name === 'landing' ? 'none' : 'block';
}

let state = {
  mode:'classic', difficulty:'easy', region:'all', playerName:'Explorer',
  score:0, lives:3, round:1, correct:0, streak:0, maxStreak:0,
  current:null, pool:[], locked:false,
  timerInterval:null, timerTotal:30, timerLeft:30,
};

const MULT = { easy:1, medium:2, hard:3 };
const TIMER_BY_DIFF = { easy:35, medium:25, hard:18 };
const STREAK_LABELS = ['','','🔥 ×1.5','🔥🔥 ×2','🔥🔥🔥 ×3'];
const STREAK_MULTS  = [1, 1, 1.5, 2, 3];
const DAILY_ROUNDS  = 10;

/* ── LEADERBOARD ── */
function getLeaderboard() { try { return JSON.parse(localStorage.getItem('flagle-lb')||'[]'); } catch { return []; } }
function saveScore(entry) {
  const lb = getLeaderboard(); lb.push(entry); lb.sort((a,b)=>b.score-a.score);
  localStorage.setItem('flagle-lb', JSON.stringify(lb.slice(0,20)));
}

/* ── CONFETTI ── */
const canvas = $('confetti-canvas'), ctx2d = canvas.getContext('2d');
let particles = [];
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resizeCanvas(); window.addEventListener('resize', resizeCanvas);
function spawnConfetti(count=60) {
  const colors=['#c8ff00','#00e676','#2979ff','#ff9800','#ff3b3b','#ffffff'];
  for (let i=0;i<count;i++) particles.push({
    x:window.innerWidth/2, y:window.innerHeight*0.35,
    vx:(Math.random()-0.5)*12, vy:Math.random()*-10-4,
    size:Math.random()*8+3, color:colors[Math.floor(Math.random()*colors.length)],
    alpha:1, rot:Math.random()*360, rotSpeed:(Math.random()-0.5)*12,
    isCircle:Math.random()<0.4,
  });
}
(function animLoop() {
  ctx2d.clearRect(0,0,canvas.width,canvas.height);
  particles = particles.filter(p=>p.alpha>0.02);
  particles.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.35; p.alpha-=0.014; p.rot+=p.rotSpeed;
    ctx2d.save(); ctx2d.globalAlpha=p.alpha; ctx2d.fillStyle=p.color;
    ctx2d.translate(p.x,p.y); ctx2d.rotate(p.rot*Math.PI/180);
    if(p.isCircle){ctx2d.beginPath();ctx2d.arc(0,0,p.size/2,0,Math.PI*2);ctx2d.fill();}
    else ctx2d.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
    ctx2d.restore();
  });
  requestAnimationFrame(animLoop);
})();

/* ── NAV ── */
$('home-btn').style.display = 'none';
$('home-btn').addEventListener('click', () => { clearTimer(); showScreen('landing'); });

document.querySelectorAll('.mode-card').forEach(btn => {
  btn.addEventListener('click', () => {
    state.mode = btn.dataset.mode;
    state.playerName = $('player-name').value.trim() || 'Explorer';
    if (state.mode === 'daily') startGame();
    else { $('diff-mode-label').textContent = btn.querySelector('.mode-title').textContent + ' Mode'; showScreen('difficulty'); }
  });
});
$('player-name').addEventListener('keydown', e => { if(e.key==='Enter') document.querySelector('.mode-card[data-mode="classic"]').click(); });
document.querySelectorAll('.diff-btn').forEach(btn => { btn.addEventListener('click', () => { state.difficulty = btn.dataset.diff; startGame(); }); });
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
$('restart-btn').addEventListener('click', () => startGame());
$('change-mode-btn').addEventListener('click', () => showScreen('landing'));
$('share-btn').addEventListener('click', shareResult);

/* ── KEYBOARD ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { clearTimer(); showScreen('landing'); return; }
  if (!$('screen-game').classList.contains('active')) return;

  const sugg = $('suggestions');
  if (sugg && sugg.style.display !== 'none') {
    const items = [...sugg.querySelectorAll('.suggestion')];
    const cur = sugg.querySelector('.highlighted');
    let idx = items.indexOf(cur);
    if (e.key === 'ArrowDown') { e.preventDefault(); idx=Math.min(idx+1,items.length-1); items.forEach(i=>i.classList.remove('highlighted')); if(items[idx]){items[idx].classList.add('highlighted');$('guess-input').value=items[idx].textContent;} }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx=Math.max(idx-1,0); items.forEach(i=>i.classList.remove('highlighted')); if(items[idx]){items[idx].classList.add('highlighted');$('guess-input').value=items[idx].textContent;} }
  }

  const mcVis  = $('mc-options').style.display !== 'none';
  const revVis = $('reverse-options').style.display !== 'none';
  if (mcVis || revVis) {
    const btns = [...(mcVis?$('mc-options'):$('reverse-options')).querySelectorAll('button:not(:disabled)')];
    const num = parseInt(e.key);
    if (num>=1 && num<=btns.length) { e.preventDefault(); btns[num-1].click(); }
  }
});

/* ── BUILD POOL ── */
function buildPool(rng) {
  let pool = state.region==='all' ? [...COUNTRIES] : COUNTRIES.filter(c=>c.region===state.region);
  if (!pool.length) pool = [...COUNTRIES];
  for (let i=pool.length-1;i>0;i--) {
    const j = Math.floor((rng||Math.random)()*(i+1));
    [pool[i],pool[j]] = [pool[j],pool[i]];
  }
  return pool;
}

/* ── START GAME ── */
function startGame() {
  clearTimer();
  Object.assign(state, { score:0, lives:3, round:1, correct:0, streak:0, maxStreak:0, locked:false, pool:[] });

  if (state.mode === 'daily') {
    state.difficulty = 'medium';
    const rng = seededRandom(getDailySeed());
    state.pool = buildPool(rng).slice(0, DAILY_ROUNDS);
  } else {
    state.pool = buildPool();
  }

  hideEl('classic-input'); hideEl('mc-options'); hideEl('reverse-options');
  $('flag-wrap').style.display = 'block';

  if (['classic','streak','timeattack','daily'].includes(state.mode)) {
    showEl('classic-input');
    $('kbd-game-hint').innerHTML = 'Type to search · <kbd>Enter</kbd> to guess · <kbd>↑↓</kbd> suggestions';
  } else if (state.mode === 'multichoice') {
    showEl('mc-options','grid');
    $('kbd-game-hint').innerHTML = 'Press <kbd>1</kbd>–<kbd>4</kbd> to choose';
  } else if (state.mode === 'reverse') {
    showEl('reverse-options','grid');
    $('kbd-game-hint').innerHTML = 'Press <kbd>1</kbd>–<kbd>4</kbd> to choose the flag';
  }

  showEl('timer-wrap', state.mode==='timeattack' ? 'block' : 'none');
  $('lives-label').textContent = 'Lives';
  $('right-hud-label').textContent = 'Round';
  updateHUD(); showScreen('game'); nextRound();
}

/* ── NEXT ROUND ── */
function nextRound() {
  clearTimer();
  state.locked = false;
  hideFeedback();
  if ($('guess-input')) $('guess-input').value = '';
  hideEl('suggestions');
  if ($('suggestions')) $('suggestions').innerHTML = '';

  if (state.mode === 'daily') {
    if (state.round-1 >= state.pool.length) { endGame(); return; }
    state.current = state.pool[state.round-1];
  } else {
    if (!state.pool.length) state.pool = buildPool();
    state.current = state.pool.pop();
  }

  const c = state.current;

  /* ── FLAG LOADING: reliable preload approach ── */
  if (state.mode === 'reverse') {
    $('flag-wrap').style.display = 'none';
  } else {
    $('flag-wrap').style.display = 'block';
    const img = $('flag-image');
    img.onload = null; img.onerror = null;
    img.classList.remove('loaded');
    img.removeAttribute('src');

    function loadFlag(url, fallbackFn) {
      const pre = new Image();
      pre.onload = () => { img.src = url; img.classList.add('loaded'); };
      pre.onerror = () => { if (fallbackFn) fallbackFn(); else { img.src = url; img.classList.add('loaded'); } };
      pre.src = url;
    }

    // Primary: flagcdn. Fallback: flagpedia
    loadFlag(
      `https://flagcdn.com/w640/${c.code}.png`,
      () => loadFlag(`https://flagpedia.net/data/flags/w580/${c.code}.png`)
    );
  }

  $('hint-text').textContent = state.mode==='reverse' ? `Find the flag of: ${c.name}` : buildHint(c);
  $('round-display').textContent = state.mode==='daily' ? `${state.round}/${DAILY_ROUNDS}` : state.round;

  if (state.mode === 'multichoice') buildMCOptions(c);
  if (state.mode === 'reverse') buildReverseOptions(c);

  // Start timer only after round is set up
  if (state.mode === 'timeattack') startTimer();

  if (['classic','streak','timeattack','daily'].includes(state.mode))
    setTimeout(() => $('guess-input') && $('guess-input').focus(), 80);

  updateStreakBar();
}

/* ── HINTS ── */
function buildHint(c) {
  if (state.difficulty==='hard') return '— No hints —';
  if (state.difficulty==='easy') return `Capital: ${c.capital}`;
  return `Region: ${c.region}`;
}

/* ── MULTI-CHOICE ── */
function buildMCOptions(correct) {
  const grid = $('mc-options'); grid.innerHTML = '';
  const decoys = COUNTRIES.filter(c=>c.name!==correct.name).sort(()=>Math.random()-0.5).slice(0,3);
  const options = [...decoys, correct].sort(()=>Math.random()-0.5);
  options.forEach((c,i) => {
    const btn = document.createElement('button');
    btn.className='mc-btn'; btn.textContent=`${i+1}. ${c.name}`; btn.tabIndex=2+i;
    btn.addEventListener('click', ()=>handleMCAnswer(c, btn, options));
    grid.appendChild(btn);
  });
}
function handleMCAnswer(chosen, btn, options) {
  if (state.locked) return; state.locked = true;
  const ok = chosen.name===state.current.name;
  $('mc-options').querySelectorAll('.mc-btn').forEach((b,i)=>{ b.disabled=true; if(options[i].name===state.current.name) b.classList.add('correct'); });
  if (!ok) btn.classList.add('wrong');
  processAnswer(ok);
}

/* ── REVERSE ── */
function buildReverseOptions(correct) {
  const grid = $('reverse-options'); grid.innerHTML = '';
  const decoys = COUNTRIES.filter(c=>c.name!==correct.name).sort(()=>Math.random()-0.5).slice(0,3);
  const options = [...decoys, correct].sort(()=>Math.random()-0.5);
  options.forEach((c,i) => {
    const btn = document.createElement('button');
    btn.className='reverse-flag-btn'; btn.tabIndex=2+i;
    const img = document.createElement('img');
    img.src=c.flagUrl; img.alt=`Option ${i+1}`; img.loading='lazy';
    btn.appendChild(img);
    btn.addEventListener('click', ()=>handleReverseAnswer(c, btn, options));
    grid.appendChild(btn);
  });
}
function handleReverseAnswer(chosen, btn, options) {
  if (state.locked) return; state.locked = true;
  const ok = chosen.name===state.current.name;
  $('reverse-options').querySelectorAll('.reverse-flag-btn').forEach((b,i)=>{ b.disabled=true; if(options[i].name===state.current.name) b.classList.add('correct'); });
  if (!ok) btn.classList.add('wrong');
  processAnswer(ok);
}

/* ── CLASSIC SUBMIT ── */
$('submit-btn').addEventListener('click', submitClassic);
$('guess-input').addEventListener('keydown', e => { if(e.key==='Enter') submitClassic(); });
function submitClassic() {
  if (state.locked) return;
  const guess = $('guess-input').value.trim().toLowerCase();
  if (!guess) return;
  state.locked = true; hideEl('suggestions');
  processAnswer(guess===state.current.name.toLowerCase());
}

/* ── SKIP ── */
$('skip-btn').addEventListener('click', () => {
  if (state.locked) return; state.locked = true; clearTimer();
  state.streak = 0; loseLife();
  showFeedback('wrong', `⟳ Skipped — it was ${state.current.name}`);
  updateHUD(); updateStreakBar(); scheduleNext();
});

/* ── PROCESS ANSWER ── */
function processAnswer(ok) {
  clearTimer();
  if (ok) {
    state.streak = Math.min(state.streak+1, 4);
    state.maxStreak = Math.max(state.maxStreak, state.streak);
    let pts = MULT[state.difficulty];
    if (state.mode==='streak') pts = Math.round(pts * STREAK_MULTS[state.streak]);
    let timeBonus = 0;
    if (state.mode==='timeattack') { timeBonus=Math.floor(state.timerLeft*0.5); pts+=timeBonus; }
    state.score+=pts; state.correct++; animateScore(); updateHUD();
    let msg=`✓ ${state.current.name} · +${pts} pt${pts!==1?'s':''}`;
    if (timeBonus>0) msg+=` (+${timeBonus} speed)`;
    if (state.mode==='streak' && state.streak>=2) msg+=` · ${STREAK_LABELS[state.streak]}`;
    showFeedback('correct', msg);
    if (state.streak>=3) spawnConfetti();
  } else {
    state.streak = 0; loseLife();
    showFeedback('wrong', `✗ It was ${state.current.name}`);
    updateHUD();
  }
  updateStreakBar(); scheduleNext();
}

function loseLife() { if (state.mode!=='daily') state.lives--; }

function scheduleNext() {
  const done = (state.lives<=0 && state.mode!=='daily') || (state.mode==='daily' && state.round>=DAILY_ROUNDS);
  setTimeout(() => {
    if (done) { endGame(); return; }
    $('flag-wrap').style.display = 'block'; state.round++; nextRound();
  }, 1500);
}

/* ── TIMER ── */
function startTimer() {
  clearTimer(); // always clear before starting
  state.timerTotal = TIMER_BY_DIFF[state.difficulty];
  state.timerLeft  = state.timerTotal;
  renderTimerBar();
  state.timerInterval = setInterval(() => {
    state.timerLeft = Math.max(0, state.timerLeft-1);
    renderTimerBar();
    if (state.timerLeft <= 0) {
      clearTimer();
      if (state.locked) return;
      state.locked = true; state.streak = 0; loseLife();
      showFeedback('wrong', `⏱ Time's up! It was ${state.current.name}`);
      updateHUD(); updateStreakBar(); scheduleNext();
    }
  }, 1000);
}
function clearTimer() {
  if (state.timerInterval!==null) { clearInterval(state.timerInterval); state.timerInterval=null; }
}
function renderTimerBar() {
  const bar=$('timer-bar'); if (!bar) return;
  const pct = state.timerTotal>0 ? (state.timerLeft/state.timerTotal)*100 : 0;
  bar.style.width=pct+'%';
  bar.className='timer-inner'+(pct<25?' danger':pct<50?' warning':'');
}

/* ── HUD ── */
function updateHUD() {
  $('score-display').textContent=state.score;
  [$('l1'),$('l2'),$('l3')].forEach((d,i)=>d&&d.classList.toggle('lost',i>=state.lives));
}
function updateStreakBar() {
  const bar=$('streak-bar'); if (!bar) return;
  if (state.streak>=2) { bar.textContent=(STREAK_LABELS[state.streak]||'🔥🔥🔥 ×3')+' STREAK'; bar.style.opacity='1'; }
  else { bar.textContent=''; bar.style.opacity='0'; }
}

/* ── FEEDBACK ── */
function showFeedback(type, msg) { const el=$('feedback'); el.className=`feedback ${type} show`; el.textContent=msg; }
function hideFeedback() { const el=$('feedback'); if(el){el.className='feedback';el.textContent='';} }

/* ── SCORE ANIM ── */
function animateScore() {
  const el=$('score-display'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  setTimeout(()=>el.classList.remove('pop'),450);
}

/* ── SUGGESTIONS ── */
$('guess-input').addEventListener('input', () => {
  const q=$('guess-input').value.trim().toLowerCase(), box=$('suggestions');
  if (q.length<2) { box.style.display='none'; return; }
  const src = state.region==='all' ? COUNTRIES : COUNTRIES.filter(c=>c.region===state.region);
  const matches = src.filter(c=>c.name.toLowerCase().includes(q)).slice(0,7);
  if (!matches.length) { box.style.display='none'; return; }
  box.innerHTML=matches.map(c=>`<div class="suggestion" role="option">${c.name}</div>`).join('');
  box.style.display='block';
  box.querySelectorAll('.suggestion').forEach(el=>{
    el.addEventListener('mousedown', e=>{ e.preventDefault(); $('guess-input').value=el.textContent; box.style.display='none'; submitClassic(); });
  });
});
document.addEventListener('click', e=>{ if(!e.target.closest('.input-wrap')) hideEl('suggestions'); });

/* ── GAME OVER ── */
function endGame() {
  clearTimer();
  const lb=getLeaderboard(), prevBest=lb.length?lb[0].score:0, isNew=state.score>prevBest;
  saveScore({ name:state.playerName, score:state.score, mode:state.mode, difficulty:state.difficulty, correct:state.correct, rounds:state.round-1, maxStreak:state.maxStreak, date:new Date().toLocaleDateString() });
  $('go-score').textContent=state.score;
  $('go-correct').textContent=state.correct;
  $('go-rounds').textContent=state.round-1;
  $('go-diff').textContent=state.difficulty.charAt(0).toUpperCase()+state.difficulty.slice(1);
  $('go-best').textContent=isNew?state.score:prevBest;
  const nr=$('new-record'); isNew?(nr.classList.add('show'),spawnConfetti()):nr.classList.remove('show');
  const names={classic:'Classic',multichoice:'Multi-Choice',timeattack:'Time Attack',streak:'Streak',reverse:'Reverse',daily:'Daily Challenge'};
  $('go-eyebrow').textContent=names[state.mode]||'Game Over';
  $('go-streak').textContent=state.maxStreak>=3?`🔥 Best streak: ${state.maxStreak}`:'';
  showScreen('gameover');
}

/* ── SHARE ── */
function shareResult() {
  const emojis={classic:'🏳️',multichoice:'🔢',timeattack:'⚡',streak:'🔥',reverse:'↩️',daily:'📅'};
  const text=[`${emojis[state.mode]||'🌍'} FLAGLE — ${state.mode.toUpperCase()}`,`Score: ${state.score}  |  ${state.correct}/${state.round-1} correct`,`Difficulty: ${state.difficulty}`,state.maxStreak>=3?`🔥 Best streak: ${state.maxStreak}`:null,'','flagle.game'].filter(l=>l!==null).join('\n');
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(()=>{ const t=$('share-toast'); t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2500); }).catch(()=>prompt('Copy:',text));
  else prompt('Copy:',text);
}


/* ── INIT ── */
showScreen('landing');
