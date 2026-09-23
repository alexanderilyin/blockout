// UI for the Blockout prototypes: one engine, driven by the variant named on
// <body data-variant="...">. Single player (you vs the CPU) and Practice only.
(function () {
  'use strict';

  const Fr = window.Fraction;
  const B = window.ProtoBoards;
  const V = window.ProtoVariants.byId(document.body.dataset.variant);

  const COLORS = ['#e4572e', '#2e86de'];
  const NAMES = ['You', 'CPU'];
  const CPU_STEP_MS = window.PROTO_FAST ? 30 : 1000; // PROTO_FAST: quick CPU for automated checks
  const ROLL_MS = 550;
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const SETTINGS_KEY = `blockout.proto.${V.id}`;
  const isFrac = V.answer === 'frac';

  // ---------------------------------------------------------------- helpers

  const $ = (id) => document.getElementById(id);
  function make(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  // "3/4 + 1/8" with stacked fractions
  const fracHTML = (text) => esc(text).replace(/(\d+)\/(\d+)/g, '<span class="fr"><span>$1</span><span>$2</span></span>');
  const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmtScore = (f) => Fr.mixed(f);

  function loadSettings() {
    const d = { mode: 'cpu', level: 'easy', count: 10, practiceLevel: 'learn', families: V.practice.defaults };
    try {
      return { ...d, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
    } catch (e) {
      return d;
    }
  }
  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  // ---------------------------------------------------------------- page

  document.title = `${V.name}: ${V.title} · Blockout prototype`;
  document.body.insertAdjacentHTML('afterbegin', `
  <svg xmlns="http://www.w3.org/2000/svg" style="display: none" aria-hidden="true">
    <symbol id="i-arrow-left" viewBox="0 0 24 24"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></symbol>
    <symbol id="i-dices" viewBox="0 0 24 24"><rect width="12" height="12" x="2" y="10" rx="2" ry="2" /><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" /><path d="M6 18h.01" /><path d="M10 14h.01" /><path d="M15 6h.01" /><path d="M18 9h.01" /></symbol>
    <symbol id="i-rotate-cw" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></symbol>
    <symbol id="i-delete" viewBox="0 0 24 24"><path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" /><path d="m12 9 6 6" /><path d="m18 9-6 6" /></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></symbol>
    <symbol id="i-chevron-right" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></symbol>
    <symbol id="i-circle-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></symbol>
    <symbol id="i-user" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></symbol>
    <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></symbol>
    <symbol id="i-lightbulb" viewBox="0 0 24 24"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></symbol>
    <symbol id="i-hand" viewBox="0 0 24 24"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" /><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></symbol>
  </svg>

  <main id="start-screen" class="screen">
    <div class="start-card">
      <a class="back-link" href="index.html">${icon('arrow-left')} All prototypes</a>
      <h1 class="logo">BLOCK<span>OUT</span></h1>
      <p class="variant-name"><span class="op-badge">${esc(V.op)}</span> ${esc(V.name)} · <strong>${esc(V.title)}</strong></p>
      <p class="tagline">${esc(V.tagline)}</p>
      <form id="setup-form" autocomplete="off">
        <div class="mode-picker two" role="radiogroup" aria-label="Game mode">
          <button type="button" class="mode-card" data-mode="cpu" role="radio">
            <span class="mode-icon">${icon('user')}</span>
            <span class="mode-title">Single player</span>
            <span class="mode-sub">You vs the CPU</span>
          </button>
          <button type="button" class="mode-card" data-mode="practice" role="radio">
            <span class="mode-icon">${icon('target')}</span>
            <span class="mode-title">Practice</span>
            <span class="mode-sub">Drill the facts</span>
          </button>
        </div>
        <div class="field" id="level-field">
          <span>Difficulty</span>
          <div class="segmented" id="level" data-setting="difficulty">
            ${Object.entries(V.levels).map(([id, l]) => `<button type="button" data-level="${id}">${esc(l.label)} <small>${fracHTML(l.sub)}</small></button>`).join('')}
          </div>
        </div>
        <div id="practice-setup" class="setup-section" hidden>
          <div class="field">
            <span>Questions</span>
            <div class="segmented" id="practice-count">
              <button type="button" data-count="10">10</button>
              <button type="button" data-count="20">20</button>
            </div>
          </div>
          <div class="field">
            <span>Level</span>
            <div class="segmented" id="practice-level">
              <button type="button" data-plevel="learn">🌱 Learn</button>
              <button type="button" data-plevel="expert">🧠 Expert</button>
            </div>
            <p class="setting-help" id="practice-level-help"></p>
          </div>
          <div class="field">
            <span>Practice</span>
            <div class="table-chips" id="families" role="group" aria-label="Facts to practice">
              ${V.practice.families.map((f) => `<button type="button" data-family="${f.id}">${fracHTML(f.label)}</button>`).join('')}
            </div>
            <p class="setting-help" id="families-help"></p>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-big" id="start-btn">Start game</button>
      </form>
      <div class="menu-actions one">
        <button type="button" class="btn btn-small" id="howto-btn">${icon('circle-help')} How to play &amp; the idea</button>
      </div>
    </div>
  </main>

  <main id="game-screen" class="screen" hidden>
    <header class="game-header">
      <button type="button" class="btn btn-small menu-btn" id="quit-btn" aria-label="Back to menu" title="Back to menu">${icon('arrow-left')}</button>
      <h1 class="logo small">BLOCK<span>OUT</span></h1>
      <div class="header-right">
        <div class="progress">
          <div class="progress-text" id="progress-text"></div>
          <div class="progress-bar"><span id="progress-fill"></span></div>
        </div>
      </div>
    </header>
    <div class="game-layout">
      <section class="board-wrap"><svg id="board" role="img" aria-label="Game board"></svg></section>
      <aside class="side">
        <div class="turn-panel" id="turn-panel">
          <div class="turn-label" id="turn-label"></div>
          <div class="dice" id="dice"></div>
          <div class="turn-msg" id="turn-msg" aria-live="polite"></div>
          <div class="math" id="math" hidden>
            <div class="timer" id="timer" hidden>
              <div class="timer-bar"><span id="timer-fill"></span></div>
              <span class="timer-num" id="timer-num"></span>
            </div>
            <div class="math-q"><span id="math-q"></span> = <span class="answer-box" id="answer-box" aria-live="polite"></span></div>
            <div class="math-feedback" id="math-feedback" aria-live="polite"></div>
            <div class="keypad${isFrac ? ' frac' : ''}" id="keypad">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-key="${n}">${n}</button>`).join('')}
              <button type="button" data-key="back" class="back" aria-label="Delete">${icon('delete')}</button>
              <button type="button" data-key="0">0</button>
              <button type="button" data-key="check" class="check" aria-label="Check answer">${icon('check')}</button>
              ${isFrac ? '<button type="button" data-key="slash" class="slash" id="slash-key"></button>' : ''}
            </div>
            <button type="button" class="btn btn-small" id="hint-btn">${icon('lightbulb')} Show me how</button>
          </div>
          <ol class="steps" id="steps" hidden></ol>
          <div class="turn-actions">
            <button type="button" class="btn btn-primary" id="roll-btn">${icon('dices')} Roll</button>
            <button type="button" class="btn btn-primary" id="place-btn" hidden>${icon('hand')} Place here</button>
            <button type="button" class="btn" id="rotate-btn" hidden>${icon('rotate-cw')} Rotate</button>
            <button type="button" class="btn btn-primary" id="next-btn" hidden></button>
          </div>
        </div>
        <div class="scores" id="scores"></div>
      </aside>
    </div>
  </main>

  <div class="overlay" id="howto" hidden>
    <div class="dialog howto-dialog" role="dialog" aria-modal="true" aria-labelledby="howto-title">
      <h2 id="howto-title">${esc(V.title)}</h2>
      <p class="concept">${fracHTML(V.concept)}</p>
      <h3>How to play</h3>
      <ul>${V.howto.map((h) => `<li>${fracHTML(h)}</li>`).join('')}</ul>
      <p class="keys">Keys: <kbd>Space</kbd> roll · <kbd>R</kbd> rotate · type your answer${isFrac ? ', <kbd>/</kbd> for the bottom number,' : ''} then <kbd>Enter</kbd></p>
      <div class="dialog-actions"><button type="button" class="btn btn-primary" id="howto-done">Got it</button></div>
    </div>
  </div>

  <div class="overlay" id="over" hidden>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="over-title">
      <h2 id="over-title"></h2>
      <p class="result-sub" id="over-sub"></p>
      <ul class="result-list" id="over-list"></ul>
      <div id="over-extra"></div>
      <div class="dialog-actions">
        <button type="button" class="btn" id="over-menu">Menu</button>
        <button type="button" class="btn btn-primary" id="over-again">Play again</button>
      </div>
    </div>
  </div>`);

  const el = {
    start: $('start-screen'),
    game: $('game-screen'),
    board: $('board'),
    turnPanel: $('turn-panel'),
    turnLabel: $('turn-label'),
    dice: $('dice'),
    msg: $('turn-msg'),
    math: $('math'),
    mathQ: $('math-q'),
    answer: $('answer-box'),
    feedback: $('math-feedback'),
    keypad: $('keypad'),
    hint: $('hint-btn'),
    steps: $('steps'),
    roll: $('roll-btn'),
    place: $('place-btn'),
    rotate: $('rotate-btn'),
    next: $('next-btn'),
    scores: $('scores'),
    timer: $('timer'),
    timerFill: $('timer-fill'),
    timerNum: $('timer-num'),
    progressText: $('progress-text'),
    progressFill: $('progress-fill'),
  };

  // ---------------------------------------------------------------- start screen

  const settings = loadSettings();
  if (!V.levels[settings.level]) settings.level = 'easy';
  settings.families = settings.families.filter((id) => V.practice.families.some((f) => f.id === id));

  function renderSetup() {
    for (const b of document.querySelectorAll('.mode-card')) {
      const on = b.dataset.mode === settings.mode;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-checked', on);
    }
    const practice = settings.mode === 'practice';
    $('practice-setup').hidden = !practice;
    $('level-field').hidden = practice;
    const sel = (sel, attr, value) => document.querySelectorAll(sel).forEach((b) => b.classList.toggle('selected', b.dataset[attr] === String(value)));
    sel('#level button', 'level', settings.level);
    sel('#practice-count button', 'count', settings.count);
    sel('#practice-level button', 'plevel', settings.practiceLevel);
    for (const b of document.querySelectorAll('#families button')) b.setAttribute('aria-pressed', settings.families.includes(b.dataset.family));
    $('practice-level-help').textContent =
      settings.practiceLevel === 'learn'
        ? 'Learn: no timer. A wrong answer lets you try again, and “Show me how” walks through it.'
        : `Expert: ${V.practice.seconds} seconds a question, one try, no help.`;
    const n = practiceFacts().length;
    $('families-help').textContent = settings.families.length ? `${n} different questions.` : 'Pick at least one.';
    $('start-btn').textContent = practice ? 'Start practice' : 'Start game';
    $('start-btn').disabled = practice && !settings.families.length;
    saveSettings();
  }

  document.querySelector('.mode-picker').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (b) (settings.mode = b.dataset.mode), renderSetup();
  });
  $('level').addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (b) (settings.level = b.dataset.level), renderSetup();
  });
  $('practice-count').addEventListener('click', (e) => {
    const b = e.target.closest('[data-count]');
    if (b) (settings.count = Number(b.dataset.count)), renderSetup();
  });
  $('practice-level').addEventListener('click', (e) => {
    const b = e.target.closest('[data-plevel]');
    if (b) (settings.practiceLevel = b.dataset.plevel), renderSetup();
  });
  $('families').addEventListener('click', (e) => {
    const b = e.target.closest('[data-family]');
    if (!b) return;
    const id = b.dataset.family;
    settings.families = settings.families.includes(id) ? settings.families.filter((f) => f !== id) : [...settings.families, id];
    renderSetup();
  });
  $('setup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    start();
  });
  $('howto-btn').addEventListener('click', () => ($('howto').hidden = false));
  $('howto-done').addEventListener('click', () => ($('howto').hidden = true));
  $('howto').addEventListener('click', (e) => e.target === $('howto') && ($('howto').hidden = true));

  function practiceFacts() {
    const seen = new Map();
    for (const f of V.practice.families) {
      if (!settings.families.includes(f.id)) continue;
      for (const spec of f.facts()) seen.set(V.task(spec).label, spec);
    }
    return [...seen.values()];
  }

  // ---------------------------------------------------------------- game state

  let game = null;
  let token = 0; // bumps on quit, so pending CPU timers stop

  function start() {
    token++;
    const practice = settings.mode === 'practice';
    game = {
      practice,
      level: settings.level,
      board: practice ? (V.practice.board ? V.practice.board() : null) : V.newBoard(settings.level),
      scores: [Fr.ZERO, Fr.ZERO],
      logs: [[], []],
      player: 0,
      phase: 'roll',
      turn: null,
      turned: false,
      hover: null,
      // practice
      facts: practice ? practiceFacts() : null,
      asked: 0,
      firstTry: 0,
      missed: [],
      times: [],
      expert: practice && settings.practiceLevel === 'expert',
    };
    if (!practice) game.pool = V.pool(game.level).map((spec) => V.task(spec, game.level));
    el.start.hidden = true;
    el.game.hidden = false;
    $('over').hidden = true;
    beginTurn();
  }

  function quit() {
    token++;
    stopTimer();
    game = null;
    el.game.hidden = true;
    $('over').hidden = true;
    el.start.hidden = false;
    renderSetup();
  }
  $('quit-btn').addEventListener('click', quit);
  $('over-menu').addEventListener('click', quit);
  $('over-again').addEventListener('click', start);

  // ---------------------------------------------------------------- turns

  function resetPanel() {
    el.math.hidden = true;
    el.steps.hidden = true;
    el.steps.innerHTML = '';
    el.feedback.textContent = '';
    el.feedback.className = 'math-feedback';
    el.msg.textContent = '';
    el.msg.className = 'turn-msg';
    for (const b of [el.roll, el.place, el.rotate, el.next]) b.hidden = true;
    game.hover = null;
    game.turned = false;
    stopTimer();
  }

  function beginTurn() {
    resetPanel();
    const p = game.player;
    el.turnPanel.style.setProperty('--turn-color', COLORS[p]);
    if (game.practice) return nextQuestion();
    el.turnLabel.textContent = p === 0 ? 'Your turn' : 'CPU’s turn';
    renderDice(null);
    render();
    if (!game.pool.some((t) => B.fits(game.board, t.piece))) return gameOver();
    if (p === 0) {
      game.phase = 'roll';
      el.roll.hidden = false;
      el.roll.focus({ preventScroll: true });
    } else cpuTurn();
  }

  function deal() {
    return pick(game.pool.filter((t) => B.fits(game.board, t.piece)));
  }

  async function rollDice(task) {
    const my = token;
    const faces = game.practice ? [task] : game.pool;
    const stop = Date.now() + ROLL_MS;
    el.dice.classList.add('rolling');
    while (Date.now() < stop) {
      renderDice(pick(faces).dice);
      await wait(70);
      if (my !== token) return false;
    }
    el.dice.classList.remove('rolling');
    renderDice(task.dice);
    return true;
  }

  el.roll.addEventListener('click', humanRoll);
  async function humanRoll() {
    if (!game || game.phase !== 'roll') return;
    game.phase = 'rolling';
    el.roll.hidden = true;
    const task = deal();
    if (!(await rollDice(task))) return;
    startTask(task);
  }

  // A human has a task in hand: answer first (division) or place first.
  function startTask(task) {
    game.turn = { task, placement: null, q: null, steps: null, rec: null, tries: 0, t0: 0 };
    if (V.answerFirst) {
      game.turn.q = V.question(task, game.board, null);
      game.turn.steps = V.explain(task, game.board, null);
      askQuestion();
    } else startPlacing();
  }

  function startPlacing() {
    game.phase = 'place';
    const t = game.turn.task;
    const rotatable = game.board.kind === 'grid' && t.piece.w !== t.piece.h;
    el.rotate.hidden = !rotatable;
    el.msg.className = 'turn-msg';
    el.msg.textContent =
      game.board.kind === 'bars'
        ? game.board.mode === 'take' ? 'Tap a bar to take your piece off it.' : 'Tap a bar to slide your piece in.'
        : game.board.mode === 'clear' ? `Knock out a line of ${t.piece.w} block${t.piece.w === 1 ? '' : 's'}.` : 'Place your piece on the board.';
    if (rotatable) el.msg.textContent += ' R turns it.';
    render();
    bringIntoView(el.board);
  }

  // Phones stack the board above the panel: bring whichever you need next back on screen.
  function bringIntoView(elm) {
    const r = elm.getBoundingClientRect();
    if (r.bottom < 60 || r.top > window.innerHeight - 60) elm.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function commitPlacement(placement) {
    const turn = game.turn;
    game.phase = 'placed';
    turn.placement = placement;
    if (!V.answerFirst) {
      turn.q = V.question(turn.task, game.board, placement);
      turn.steps = V.explain(turn.task, game.board, placement);
    }
    turn.points = V.points(turn.task, game.board, placement);
    turn.rec = B.place(game.board, turn.task.piece, placement, game.player, V.answerFirst ? turn.correct : null);
    turn.rec.points = turn.points;
    game.hover = null;
    el.place.hidden = true;
    el.rotate.hidden = true;
    render();
    if (V.answerFirst) finishHumanTurn();
    else askQuestion();
  }

  // ---------------------------------------------------------------- answering

  let entry = { num: '', den: '', slot: 'num' };

  function askQuestion() {
    game.phase = 'answer';
    const turn = game.turn;
    entry = { num: '', den: '', slot: 'num' };
    el.msg.textContent = '';
    el.math.hidden = false;
    el.mathQ.innerHTML = fracHTML(turn.q.text);
    el.feedback.textContent = '';
    el.feedback.className = 'math-feedback';
    el.hint.hidden = game.expert;
    el.hint.disabled = false;
    el.keypad.querySelectorAll('button').forEach((b) => (b.disabled = false));
    renderEntry();
    bringIntoView(el.keypad);
    turn.t0 = performance.now();
    if (game.expert) startTimer(V.practice.seconds);
  }

  function renderEntry() {
    el.answer.className = 'answer-box' + (isFrac ? ' frac-answer' : '');
    if (!isFrac) {
      el.answer.textContent = entry.num;
      return;
    }
    el.answer.innerHTML = `<span class="fslot${entry.slot === 'num' ? ' active' : ''}" data-slot="num">${esc(entry.num)}</span><span class="fbar"></span><span class="fslot${entry.slot === 'den' ? ' active' : ''}" data-slot="den">${esc(entry.den)}</span>`;
    $('slash-key').innerHTML = entry.slot === 'num' ? 'Bottom number ↓' : 'Top number ↑';
  }

  el.answer.addEventListener('click', (e) => {
    const slot = e.target.closest('[data-slot]');
    if (slot && game && game.phase === 'answer') (entry.slot = slot.dataset.slot), renderEntry();
  });

  function press(key) {
    if (!game || game.phase !== 'answer') return;
    if (key === 'check') return submit();
    if (key === 'slash') {
      if (isFrac) entry.slot = entry.slot === 'num' ? 'den' : 'num';
    } else if (key === 'back') {
      if (!entry[entry.slot] && entry.slot === 'den') entry.slot = 'num';
      else entry[entry.slot] = entry[entry.slot].slice(0, -1);
    } else if (/^\d$/.test(key)) {
      if (entry[entry.slot].length >= 3) return;
      entry[entry.slot] += key;
    }
    renderEntry();
    // Whole-number answers check themselves once enough digits are in
    if (!isFrac && /^\d$/.test(key)) {
      const want = String(game.turn.q.answer.n);
      if (entry.num.length >= want.length) submit();
    }
  }

  el.keypad.addEventListener('click', (e) => {
    const b = e.target.closest('[data-key]');
    if (b) press(b.dataset.key);
  });

  function submit() {
    const turn = game.turn;
    const parsed = Fr.parseAnswer(entry.num, isFrac ? entry.den : '');
    if (!parsed) {
      el.answer.classList.add('wrong');
      setTimeout(() => el.answer.classList.remove('wrong'), 400);
      return;
    }
    turn.tries++;
    const right = Fr.eq(parsed.value, turn.q.answer);
    if (turn.tries === 1) turn.firstTry = right;
    if (right) {
      stopTimer();
      el.answer.classList.add('right');
      el.feedback.className = 'math-feedback good';
      el.feedback.innerHTML = parsed.simplest || !isFrac ? pick(['Right!', 'Yes!', 'Nice!', 'Correct!']) : `Right! In simplest form that’s ${fracHTML(Fr.str(turn.q.answer))}`;
      return answered(turn.firstTry);
    }
    // Wrong
    el.answer.classList.add('wrong');
    setTimeout(() => el.answer.classList.remove('wrong'), 400);
    el.feedback.className = 'math-feedback try';
    if (game.practice && !game.expert) {
      el.feedback.textContent = 'Not quite. Try again!';
      if (turn.tries >= 2) showSteps(turn.steps);
      entry = { num: '', den: '', slot: 'num' };
      setTimeout(renderEntry, 400);
      return;
    }
    stopTimer();
    el.feedback.innerHTML = `It’s ${fracHTML(Fr.str(turn.q.answer))}`;
    answered(false);
  }

  function timeUp() {
    const turn = game.turn;
    turn.tries++;
    turn.firstTry = false;
    el.answer.classList.add('timeout');
    el.feedback.className = 'math-feedback try';
    el.feedback.innerHTML = `Time’s up! It’s ${fracHTML(Fr.str(turn.q.answer))}`;
    answered(false);
  }

  el.hint.addEventListener('click', () => {
    if (!game || !game.turn) return;
    game.turn.usedHint = true;
    showSteps(game.turn.steps);
    el.hint.disabled = true;
  });

  function showSteps(steps, big = true) {
    el.steps.hidden = false;
    el.steps.innerHTML = '';
    steps.forEach((s, i) => {
      const li = make('li', i === steps.length - 1 && big ? 'big' : '');
      li.innerHTML = fracHTML(s);
      el.steps.append(li);
    });
  }

  function answered(correct) {
    const turn = game.turn;
    turn.correct = correct;
    game.phase = 'answered';
    el.keypad.querySelectorAll('button').forEach((b) => (b.disabled = true));
    el.hint.hidden = true;
    const ms = performance.now() - turn.t0;
    if (game.practice) {
      game.times.push(ms);
      if (turn.firstTry) game.firstTry++;
      else game.missed.push(turn.task.label);
    }
    if (V.answerFirst) {
      // Division: now build the rectangle you just worked out
      setTimeout(() => game && game.turn === turn && startPlacing(), correct ? 500 : 900);
      if (!correct) showSteps(turn.steps);
      return;
    }
    turn.rec.correct = correct;
    finishHumanTurn();
  }

  function finishHumanTurn() {
    const turn = game.turn;
    const correct = turn.correct;
    if (V.answerFirst) turn.rec.correct = correct;
    if (!game.practice) {
      if (correct) game.scores[0] = Fr.add(game.scores[0], turn.points);
      game.logs[0].push({ label: turn.task.label, correct });
    } else game.asked++;
    celebrate(turn);
    render();
    const wrongInGame = !correct && !game.practice;
    if (wrongInGame) showSteps(turn.steps);
    if (game.practice) {
      const next = () => (game.asked >= settings.count ? practiceDone() : beginTurn());
      // got there in the end (Learn): stay on the working until they're ready
      if (!correct && !game.expert) return showNext(game.asked >= settings.count ? 'Finish' : 'Next question', next);
      setTimeout(() => game && game.turn === turn && next(), correct ? 800 : 1800);
      return;
    }
    if (correct) setTimeout(() => game && game.turn === turn && nextPlayer(), 900);
    else showNext('Next', nextPlayer);
  }

  // Filling (or emptying) a whole bar exactly
  function celebrate(turn) {
    const b = game.board;
    if (b.kind !== 'bars' || !turn.rec) return;
    const bar = b.bars[turn.rec.bar];
    if ((b.mode === 'take' && bar.amount === 0) || (b.mode === 'fill' && bar.amount === b.units)) {
      el.msg.className = 'turn-msg blockout';
      el.msg.textContent = b.mode === 'take' ? 'Blockout! That bar is empty.' : 'Blockout! That bar is exactly 1 whole.';
    }
  }

  function showNext(label, fn) {
    el.next.innerHTML = `${esc(label)} ${icon('chevron-right')}`;
    el.next.hidden = false;
    el.next.onclick = () => {
      el.next.hidden = true;
      fn();
    };
    el.next.focus({ preventScroll: true });
  }

  function nextPlayer() {
    game.player = 1 - game.player;
    beginTurn();
  }

  // ---------------------------------------------------------------- CPU

  async function cpuTurn() {
    const my = token;
    const alive = () => my === token && game;
    game.phase = 'cpu';
    await wait(400);
    if (!alive()) return;
    const task = deal();
    if (!(await rollDice(task))) return;
    const placement = B.cpuChoose(game.board, task.piece);
    const q = V.question(task, game.board, placement);
    const steps = V.explain(task, game.board, placement);
    const points = V.points(task, game.board, placement);
    const put = () => {
      game.turn = { task, rec: B.place(game.board, task.piece, placement, 1, null) };
      game.turn.rec.points = points;
      render();
    };
    if (!V.answerFirst) {
      await wait(400);
      if (!alive()) return;
      put();
    }
    el.steps.hidden = false;
    el.steps.innerHTML = '';
    for (let i = 0; i < steps.length; i++) {
      await wait(CPU_STEP_MS);
      if (!alive()) return;
      const li = make('li', i === steps.length - 1 ? 'big' : '');
      li.innerHTML = fracHTML(steps[i]);
      el.steps.append(li);
    }
    if (V.answerFirst) {
      await wait(500);
      if (!alive()) return;
      put();
    }
    game.turn.rec.correct = true;
    game.scores[1] = Fr.add(game.scores[1], points);
    game.logs[1].push({ label: task.label, correct: true, q });
    celebrate(game.turn);
    render();
    showNext('My turn', nextPlayer);
  }

  // ---------------------------------------------------------------- practice

  function nextQuestion() {
    const n = game.asked + 1;
    el.turnLabel.textContent = `Question ${n} of ${settings.count}`;
    const last = game.turn && game.turn.task.label;
    let pool = game.facts.filter((spec) => V.task(spec).label !== last);
    if (!pool.length) pool = game.facts;
    let spec;
    if (V.practice.boardFor) {
      spec = pick(pool);
      game.board = V.practice.boardFor(spec);
    } else {
      let fitting = pool.filter((sp) => B.fits(game.board, V.task(sp).piece));
      if (!fitting.length) {
        game.board = V.practice.board();
        el.msg.textContent = 'Fresh board!';
        fitting = pool.filter((sp) => B.fits(game.board, V.task(sp).piece));
      }
      spec = pick(fitting);
    }
    const task = V.task(spec);
    renderDice(task.dice);
    render();
    startTask(task);
  }

  function practiceDone() {
    game.phase = 'over';
    const n = settings.count;
    const avg = game.times.length ? game.times.reduce((a, b) => a + b, 0) / game.times.length / 1000 : 0;
    $('over-title').textContent = game.firstTry === n ? 'Perfect practice!' : 'Practice done!';
    $('over-sub').textContent = `${game.firstTry} of ${n} right first time · ${avg.toFixed(1)} s a question`;
    $('over-list').innerHTML = '';
    const extra = $('over-extra');
    extra.innerHTML = '';
    if (game.missed.length) {
      extra.append(make('p', 'missed-title', 'Worth another look:'));
      const chips = make('div', 'missed');
      for (const label of [...new Set(game.missed)]) {
        const chip = make('span', 'missed-chip');
        chip.innerHTML = fracHTML(label);
        chips.append(chip);
      }
      extra.append(chips);
    }
    $('over-again').textContent = 'Practice again';
    $('over').hidden = false;
  }

  function gameOver() {
    game.phase = 'over';
    const [me, cpu] = game.scores;
    const c = Fr.cmp(me, cpu);
    $('over-title').textContent = c > 0 ? 'You win!' : c < 0 ? 'The CPU wins' : 'It’s a tie!';
    $('over-sub').textContent = game.board.kind === 'grid' && game.board.mode === 'clear' ? 'The board is clear.' : 'Nothing else fits.';
    const list = $('over-list');
    list.innerHTML = '';
    const top = Math.max(1e-9, ...game.scores.map((s) => s.n / s.d));
    game.scores.forEach((s, i) => {
      const li = make('li');
      li.style.setProperty('--c', COLORS[i]);
      li.innerHTML = `<span>${NAMES[i]}</span><span class="result-pts">${fracHTML(fmtScore(s))} ${V.unit}</span><span class="result-bar"><span style="width:${(100 * s.n) / s.d / top}%"></span></span>`;
      list.append(li);
    });
    $('over-extra').innerHTML = '';
    $('over-again').textContent = 'Play again';
    $('over').hidden = false;
  }

  // ---------------------------------------------------------------- expert timer

  let timer = null;
  function startTimer(seconds) {
    stopTimer();
    const end = performance.now() + seconds * 1000;
    el.timer.hidden = false;
    const tick = () => {
      const left = Math.max(0, end - performance.now());
      el.timerFill.style.width = `${(100 * left) / (seconds * 1000)}%`;
      el.timerNum.textContent = `${Math.ceil(left / 1000)}s`;
      el.timer.classList.toggle('low', left < 4000);
      if (left <= 0) {
        stopTimer();
        if (game && game.phase === 'answer') timeUp();
      }
    };
    tick();
    timer = setInterval(tick, 100);
  }
  function stopTimer() {
    clearInterval(timer);
    timer = null;
    el.timer.hidden = true;
  }

  // ---------------------------------------------------------------- dice

  function renderDice(dice) {
    el.dice.innerHTML = '';
    const list = dice || (V.id === 'subtraction' || V.id === 'fraction-subtract' ? [null] : [null, null]);
    for (const d of list) {
      const die = make('div', 'die');
      if (!d) die.classList.add('blank');
      else if (d.type === 'pips' && d.sides <= 6) {
        for (let i = 0; i < 9; i++) die.append(make('span', PIPS[d.v].includes(i) ? 'pip' : ''));
      } else if (d.type === 'pips') {
        die.classList.add('numbered');
        die.append(make('span', 'die-num', d.v));
      } else if (d.type === 'total') {
        die.classList.add('numbered', 'total');
        die.append(make('span', 'die-num', d.v));
        die.title = `${d.v} squares`;
      } else if (d.type === 'frac') {
        die.classList.add('numbered', 'frac-die');
        die.innerHTML = fracHTML(Fr.str(d.f));
      }
      el.dice.append(die);
    }
  }

  // ---------------------------------------------------------------- board drawing (SVG)

  const S = 30; // one grid square
  const BAR_W = 600;
  const BAR_H = 42;
  const BAR_GAP = 12;
  const BAR_LABEL = 90;
  // SVG units per screen pixel, so labels stay readable however small the board is drawn
  let px = 1;
  function measure(vbW, vbH) {
    const r = el.board.getBoundingClientRect();
    px = r.width && r.height ? Math.max(vbW / r.width, vbH / r.height) : 1;
  }

  function currentPiece() {
    const p = game.turn && game.turn.task.piece;
    if (!p || game.board.kind !== 'grid') return p;
    return game.turned ? { ...p, w: p.h, h: p.w, turned: true } : { ...p, turned: false };
  }

  function render() {
    if (!game) return;
    renderScores();
    renderProgress();
    if (game.board.kind === 'grid') drawGrid();
    else drawBars();
  }

  function renderProgress() {
    if (game.practice) {
      el.progressText.textContent = `${game.firstTry} right first time`;
      el.progressFill.style.width = `${(100 * game.asked) / settings.count}%`;
      return;
    }
    const pct = Math.round(100 * B.progress(game.board));
    el.progressText.textContent = game.board.kind === 'grid' && game.board.mode === 'clear'
      ? `${B.gridCount(game.board, B.STONE)} blocks left`
      : `Board ${pct}% full`;
    el.progressFill.style.width = `${pct}%`;
  }

  function renderScores() {
    el.scores.innerHTML = '';
    if (game.practice) {
      const card = make('div', 'score-card active');
      card.style.setProperty('--c', COLORS[0]);
      card.innerHTML = `<div class="score-head"><span class="score-name">${settings.practiceLevel === 'expert' ? '🧠 Expert' : '🌱 Learn'}</span><span class="score-pts">${game.firstTry}/${game.asked}</span></div>`;
      el.scores.append(card);
      return;
    }
    game.scores.forEach((s, i) => {
      const card = make('div', 'score-card' + (game.player === i ? ' active' : ''));
      card.style.setProperty('--c', COLORS[i]);
      const log = game.logs[i].slice(-8).map((l) => `<li class="${l.correct ? '' : 'miss'}">${fracHTML(l.label)}</li>`).join('');
      card.innerHTML = `<div class="score-head"><span class="score-name">${NAMES[i]}</span><span class="score-pts">${fracHTML(fmtScore(s))} <small>${V.unit}</small></span></div><ul class="score-log">${log}</ul>`;
      el.scores.append(card);
    });
  }

  const colorOf = (rec) => (rec.correct === false ? 'var(--board-wrong)' : COLORS[rec.owner]);

  function drawGrid() {
    const b = game.board;
    const W = b.cols * S;
    const H = b.rows * S;
    measure(W + 4, H + 4);
    const out = [`<rect class="bg" x="0" y="0" width="${W}" height="${H}" />`];
    // stones
    if (b.mode === 'clear') {
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          if (b.cells[r * b.cols + c] === B.STONE) out.push(`<rect class="stone" x="${c * S + 2}" y="${r * S + 2}" width="${S - 4}" height="${S - 4}" rx="5" />`);
        }
      }
    }
    // piece fills
    for (const rec of b.pieces) out.push(pieceFill(rec, b));
    // grid lines
    let d = '';
    for (let c = 1; c < b.cols; c++) d += `M${c * S} 0V${H}`;
    for (let r = 1; r < b.rows; r++) d += `M0 ${r * S}H${W}`;
    out.push(`<path class="grid${b.block ? ' fine' : ''}" d="${d}" />`);
    if (b.mode === 'clear') out.push(`<path class="five" d="M${5 * S} 0V${H}" />`);
    // piece details on top of the grid
    for (const rec of b.pieces) out.push(pieceDetail(rec, b));
    // wholes
    if (b.block) {
      let t = '';
      for (let c = b.block; c < b.cols; c += b.block) t += `M${c * S} 0V${H}`;
      for (let r = b.block; r < b.rows; r += b.block) t += `M0 ${r * S}H${W}`;
      out.push(`<path class="block" d="${t}" />`);
    }
    out.push(`<rect class="edge" x="0" y="0" width="${W}" height="${H}" />`);
    // ghost
    if (game.phase === 'place' && game.hover) out.push(ghostGrid(game.hover, b));
    el.board.setAttribute('viewBox', `-2 -2 ${W + 4} ${H + 4}`);
    el.board.innerHTML = out.join('');
  }

  function pieceFill(rec, b) {
    const x = rec.x * S;
    const y = rec.y * S;
    const w = rec.w * S;
    const h = rec.h * S;
    const cls = rec.correct == null ? ' pending' : '';
    if (b.mode === 'clear') return `<rect class="cleared${cls}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${colorOf(rec)}" />`;
    const parts = rec.piece.parts;
    if (parts) {
      // two dice, two tones: the first part solid, the second lighter
      const along = rec.turned ? 'h' : 'w';
      const first = parts[0] * S;
      const a = along === 'w' ? `x="${x}" y="${y}" width="${first}" height="${h}"` : `x="${x}" y="${y}" width="${w}" height="${first}"`;
      const bb = along === 'w' ? `x="${x + first}" y="${y}" width="${w - first}" height="${h}"` : `x="${x}" y="${y + first}" width="${w}" height="${h - first}"`;
      return `<g class="piece${cls}"><rect ${a} fill="${colorOf(rec)}" /><rect ${bb} fill="${colorOf(rec)}" class="part2" /></g>`;
    }
    return `<rect class="piece${cls}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${colorOf(rec)}" />`;
  }

  function pieceDetail(rec, b) {
    const x = rec.x * S;
    const y = rec.y * S;
    const w = rec.w * S;
    const h = rec.h * S;
    const out = [];
    if (b.mode === 'clear') return `<rect class="piece-edge${rec.correct == null ? ' pending' : ''}" x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" stroke="${colorOf(rec)}" />`;
    const piece = rec.piece;
    if (piece.parts) {
      const first = piece.parts[0] * S;
      if (rec.turned) {
        out.push(`<path class="divider" d="M${x} ${y + first}H${x + w}" />`);
        out.push(label(x + w / 2, y + first / 2, piece.parts[0], true, w), label(x + w / 2, y + first + (h - first) / 2, piece.parts[1], true, w));
      } else {
        out.push(`<path class="divider" d="M${x + first} ${y}V${y + h}" />`);
        out.push(label(x + first / 2, y + h / 2, piece.parts[0], true, first), label(x + first + (w - first) / 2, y + h / 2, piece.parts[1], true, w - first));
      }
    }
    if (piece.ticks) {
      // fraction multiplication: the rectangle cut into its parts
      const [tx, ty] = rec.turned ? [piece.ticks[1], piece.ticks[0]] : piece.ticks;
      let d = '';
      for (let c = tx; c < rec.w; c += tx) d += `M${x + c * S} ${y}V${y + h}`;
      for (let r = ty; r < rec.h; r += ty) d += `M${x} ${y + r * S}H${x + w}`;
      out.push(`<path class="ticks" d="${d}" />`);
      if (rec.correct && rec.points) out.push(label(x + w / 2, y + h / 2, Fr.str(rec.points), Math.min(w, h) >= 2 * S, w));
    } else if (!piece.parts && rec.correct && rec.points) {
      out.push(label(x + w / 2, y + h / 2, Fr.str(rec.points), rec.w * rec.h >= 2, w));
    }
    out.push(`<rect class="piece-edge${rec.correct == null ? ' pending' : ''}" x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" />`);
    return out.join('');
  }

  function label(cx, cy, text, show = true, room = Infinity) {
    const size = Math.min(15 * px, 0.62 * S);
    if (!show || String(text).length * size * 0.62 > room) return '';
    return `<text class="label" x="${cx}" y="${cy}" font-size="${size}">${esc(text)}</text>`;
  }

  function ghostGrid(p, b) {
    const piece = currentPiece();
    const rec = { ...p, piece, turned: game.turned, owner: game.player, correct: true };
    const cls = p.valid ? 'ghost ok' : 'ghost bad';
    const out = [`<g class="${cls}">`];
    if (p.valid) out.push(pieceFill(rec, b));
    // multiplying fractions: show how the whole under the ghost is cut up
    if (piece.ticks && b.block) {
      const [tx, ty] = game.turned ? [piece.ticks[1], piece.ticks[0]] : piece.ticks;
      const bx = Math.floor(Math.max(0, p.x) / b.block) * b.block;
      const by = Math.floor(Math.max(0, p.y) / b.block) * b.block;
      let d = '';
      for (let c = tx; c < b.block; c += tx) d += `M${(bx + c) * S} ${by * S}V${(by + b.block) * S}`;
      for (let r = ty; r < b.block; r += ty) d += `M${bx * S} ${(by + r) * S}H${(bx + b.block) * S}`;
      out.push(`<path class="whole-cuts" d="${d}" />`);
    }
    out.push(`<rect class="ghost-edge" x="${p.x * S + 1.5}" y="${p.y * S + 1.5}" width="${p.w * S - 3}" height="${p.h * S - 3}" />`, '</g>');
    return out.join('');
  }

  function drawBars() {
    const b = game.board;
    const n = b.bars.length;
    const H = n * (BAR_H + BAR_GAP) - BAR_GAP;
    const u = BAR_W / b.units;
    measure(BAR_W + BAR_LABEL + 4, H + 4);
    const out = [];
    const side = Math.min(16 * px, BAR_H * 0.55);
    b.bars.forEach((bar, i) => {
      const y = i * (BAR_H + BAR_GAP);
      out.push(`<rect class="bar-bg" x="0" y="${y}" width="${BAR_W}" height="${BAR_H}" rx="6" />`);
      if (b.mode === 'take') out.push(`<rect class="stone" x="0" y="${y}" width="${bar.amount * u}" height="${BAR_H}" rx="6" />`);
      for (const seg of bar.segments) out.push(barSegment(seg, y, u, b));
      out.push(`<path class="half" d="M${BAR_W / 2} ${y}v7M${BAR_W / 2} ${y + BAR_H}v-7" />`);
      out.push(`<rect class="bar-edge" x="0" y="${y}" width="${BAR_W}" height="${BAR_H}" rx="6" />`);
      const amount = Fr.F(bar.amount, b.units);
      const full = b.mode === 'fill' ? bar.amount === b.units : bar.amount === 0;
      const text = b.mode === 'take' ? (full ? '0 ★' : Fr.str(amount)) : full ? '1 ★' : '';
      out.push(`<text class="bar-label${full ? ' full' : ''}" x="${BAR_W + 10}" y="${y + BAR_H / 2}" font-size="${side}">${esc(text)}</text>`);
    });
    if (game.phase === 'place' && game.hover != null) out.push(ghostBar(game.hover, u, b));
    el.board.setAttribute('viewBox', `-2 -2 ${BAR_W + BAR_LABEL + 4} ${H + 4}`);
    el.board.innerHTML = out.join('');
  }

  function barSegment(seg, y, u, b, ghost = false) {
    const x0 = seg.start * u;
    const color = ghost ? COLORS[game.player] : colorOf(seg);
    const cls = seg.correct == null && !ghost ? ' pending' : '';
    const out = [];
    const piece = seg.piece;
    if (b.mode === 'take') {
      out.push(`<rect class="taken${cls}" x="${x0}" y="${y}" width="${seg.len * u}" height="${BAR_H}" fill="${color}" />`);
    } else {
      let x = x0;
      piece.parts.forEach((part, k) => {
        out.push(`<rect class="seg${k ? ' part2' : ''}${cls}" x="${x}" y="${y}" width="${part.len * u}" height="${BAR_H}" fill="${color}" />`);
        // a part that doesn't come out in whole chunks (division, at Hard): shade the leftover
        const whole = Math.floor(part.len / part.tick) * part.tick;
        if (whole < part.len) out.push(`<rect class="leftover" x="${x + whole * u}" y="${y}" width="${(part.len - whole) * u}" height="${BAR_H}" />`);
        let d = '';
        for (let t = part.tick; t < part.len; t += part.tick) d += `M${x + t * u} ${y}v${BAR_H}`;
        if (d) out.push(`<path class="ticks" d="${d}" />`);
        x += part.len * u;
      });
    }
    // what the piece was
    let x = x0;
    piece.parts.forEach((part, k) => {
      if (k) out.push(`<path class="divider" d="M${x} ${y}v${BAR_H}" />`);
      out.push(barLabel(x + (part.len * u) / 2, y, part.label, part.len * u));
      x += part.len * u;
    });
    out.push(`<rect class="piece-edge${cls}" x="${x0 + 1}" y="${y + 1}" width="${seg.len * u - 2}" height="${BAR_H - 2}" rx="3" />`);
    return out.join('');
  }

  function barLabel(cx, y, text, width) {
    const size = Math.min(13 * px, BAR_H * 0.4);
    const [n, d] = String(text || '').split('/');
    if (!text || Math.max(n.length, (d || '').length) * size * 0.62 + 4 > width) return '';
    const mid = y + BAR_H / 2;
    if (!d) return `<text class="label" x="${cx}" y="${mid}" font-size="${size}">${esc(n)}</text>`;
    const half = size * 0.62;
    return `<text class="label frac" x="${cx}" y="${mid - half}" font-size="${size}">${esc(n)}</text><path class="label-bar" d="M${cx - half} ${mid}h${2 * half}" /><text class="label frac" x="${cx}" y="${mid + half + 1}" font-size="${size}">${esc(d)}</text>`;
  }

  function ghostBar(i, u, b) {
    const piece = game.turn.task.piece;
    const bar = b.bars[i];
    const room = B.barRoom(b, i);
    const ok = room >= piece.len;
    const y = i * (BAR_H + BAR_GAP);
    const start = b.mode === 'take' ? bar.amount - piece.len : bar.amount;
    if (!ok) {
      const x = b.mode === 'take' ? 0 : bar.amount * u;
      return `<rect class="ghost-edge bad" x="${x}" y="${y}" width="${piece.len * u}" height="${BAR_H}" rx="3" />`;
    }
    return `<g class="ghost ok">${barSegment({ start, len: piece.len, piece, owner: game.player, correct: true }, y, u, b, true)}<rect class="ghost-edge" x="${start * u + 1.5}" y="${y + 1.5}" width="${piece.len * u - 3}" height="${BAR_H - 3}" rx="3" /></g>`;
  }

  // ---------------------------------------------------------------- placing with the pointer

  function svgPoint(e) {
    const pt = el.board.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(el.board.getScreenCTM().inverse());
  }

  // Where the piece would go with the pointer at e (null when off the board)
  function placementAt(e) {
    const b = game.board;
    const pt = svgPoint(e);
    if (b.kind === 'bars') {
      const i = Math.floor((pt.y + BAR_GAP / 2) / (BAR_H + BAR_GAP));
      return i >= 0 && i < b.bars.length ? i : null;
    }
    const c = Math.floor(pt.x / S);
    const r = Math.floor(pt.y / S);
    if (c < 0 || r < 0 || c >= b.cols || r >= b.rows) return null;
    const piece = currentPiece();
    let x = c - Math.floor((piece.w - 1) / 2);
    let y = r - Math.floor((piece.h - 1) / 2);
    // keep it inside the board, and inside the whole under the pointer
    const [x0, y0, x1, y1] = b.block
      ? [Math.floor(c / b.block) * b.block, Math.floor(r / b.block) * b.block, (Math.floor(c / b.block) + 1) * b.block, (Math.floor(r / b.block) + 1) * b.block]
      : [0, 0, b.cols, b.rows];
    x = Math.max(x0, Math.min(x, x1 - piece.w));
    y = Math.max(y0, Math.min(y, y1 - piece.h));
    return { x, y, w: piece.w, h: piece.h, valid: B.gridFitsAt(b, x, y, piece.w, piece.h) };
  }

  const sameSpot = (a, b) => a != null && b != null && (typeof a === 'number' ? a === b : a.x === b.x && a.y === b.y && a.w === b.w);
  const validHover = () => {
    const h = game.hover;
    if (h == null) return false;
    return game.board.kind === 'bars' ? B.barRoom(game.board, h) >= game.turn.task.piece.len : h.valid;
  };

  el.board.addEventListener('pointermove', (e) => {
    if (!game || game.phase !== 'place' || e.pointerType !== 'mouse') return;
    const p = placementAt(e);
    if (sameSpot(p, game.hover)) return;
    game.hover = p;
    render();
  });
  el.board.addEventListener('pointerleave', (e) => {
    if (!game || game.phase !== 'place' || e.pointerType !== 'mouse') return;
    game.hover = null;
    render();
  });
  // Mouse: click places. Touch: first tap shows where it would go, tap again (or "Place here") to place.
  el.board.addEventListener('pointerup', (e) => {
    if (!game || game.phase !== 'place') return;
    const p = placementAt(e);
    if (p == null) return;
    if (e.pointerType === 'mouse' || sameSpot(p, game.hover)) {
      game.hover = p;
      if (validHover()) return placeHover();
    }
    game.hover = p;
    el.place.hidden = !validHover();
    render();
  });
  el.place.addEventListener('click', () => game && game.phase === 'place' && validHover() && placeHover());

  function placeHover() {
    const b = game.board;
    const h = game.hover;
    const placement = b.kind === 'bars' ? { bar: h } : { x: h.x, y: h.y, w: h.w, h: h.h, turned: game.turned };
    commitPlacement(placement);
  }

  function rotate() {
    if (!game || game.phase !== 'place' || el.rotate.hidden) return;
    game.turned = !game.turned;
    if (game.hover && game.board.kind === 'grid') {
      const piece = currentPiece();
      const { x, y } = game.hover;
      const b = game.board;
      const nx = Math.max(0, Math.min(x, b.cols - piece.w));
      const ny = Math.max(0, Math.min(y, b.rows - piece.h));
      game.hover = { x: nx, y: ny, w: piece.w, h: piece.h, valid: B.gridFitsAt(b, nx, ny, piece.w, piece.h) };
      el.place.hidden = el.place.hidden || !game.hover.valid;
    }
    render();
  }
  el.rotate.addEventListener('click', rotate);

  window.addEventListener('resize', () => game && render());

  // ---------------------------------------------------------------- keys

  document.addEventListener('keydown', (e) => {
    if (!game || !$('howto').hidden) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (game.phase === 'answer') {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') press('check');
      else if (e.key === '/' && isFrac) press('slash');
      else if (e.key === 'Escape') (entry = { num: '', den: '', slot: 'num' }), renderEntry();
      else return;
      e.preventDefault();
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      if (game.phase === 'roll') humanRoll();
      else if (!el.next.hidden) el.next.click();
      else return;
      e.preventDefault();
    } else if (e.key === 'r' || e.key === 'R') rotate();
  });

  renderSetup();
  // For poking at a prototype from the console (and automated checks)
  window.ProtoGame = { state: () => game, piece: () => game && currentPiece() };
})();
