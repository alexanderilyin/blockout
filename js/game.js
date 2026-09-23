(function () {
  'use strict';

  const Core = window.BlockoutCore;
  const Progress = window.BlockoutProgress;
  const Invite = window.BlockoutInvite;
  const seededRandom = Invite.seededRandom;

  const COLORS = ['#e4572e', '#2e86de', '#2a9d5c', '#8e5bd6'];
  const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
  const PIPS = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  // How long each computer action takes (ms): every explanation step,
  // every square it draws and every number it counts.
  const CPU_STEP_MS = { slow: 2000, normal: 1000, fast: 500 };
  const COUNT_STEP = 850; // ms between skip-counting steps when helping a human
  const SETTINGS_KEY = 'blockout.settings';
  const DEFAULT_SETTINGS = {
    firstInCorner: false,
    cpuSpeed: 'normal',
    placeMode: 'draw',
    diceMode: 'virtual',
    cpuEnd: 'auto', // 'auto': next turn starts by itself; 'button': wait for "My turn"
    showProgress: false, // "Board: X of Y filled" meter in the header
    answerTime: '0', // seconds to answer the multiplication; '0' = no timer
    difficulty: 'easy', // easy d6, medium d8, hard d12
    cpuSteps: 'show', // 'show': CPU explains step by step; 'instant': CPU plays straight away
    autoRoll: 'manual', // 'manual': press Roll dice; 'auto': the dice roll by themselves
    fitRolls: 'end', // "no room": only roll what fits 'end' (near the end), 'always' or 'never'
    diceStyle: 'classic', // 'golden' once the golden dice are bought
    // Times-table grid cells: 'icon' (✓ ~ !) or 'time' (best time), per status
    timesMastered: 'icon',
    timesLearning: 'icon',
    timesPractice: 'icon',
    theme: 'auto', // 'auto' follows the device; 'light' or 'dark' forces one (free, not in the shop)
  };
  // Board sizes other than the small one are bought in the shop.
  const BOARD_UNLOCK = { 12: null, 16: 'board16', 20: 'board20', custom: 'boardCustom' };
  const PROGRESS_KEY = 'blockout.progress';
  const PASS_DELAY = 1600;
  const AUTO_PLACE_MS = 900; // how long an auto-placed rectangle is previewed
  const AUTO_ROLL_MS = 700; // pause before auto roll, so "Your turn" can be read first
  const TRY_AGAIN = ['Not quite — try again!', 'Almost! Have another go.', 'Hmm, not that one. Try again!'];

  const $ = (id) => document.getElementById(id);
  const el = {
    startScreen: $('start-screen'),
    gameScreen: $('game-screen'),
    modeCards: document.querySelectorAll('.mode-card'),
    singleSetup: $('single-setup'),
    multiSetup: $('multi-setup'),
    singleName: $('single-name'),
    playerCount: $('player-count'),
    nameInputs: $('name-inputs'),
    boardSize: $('board-size'),
    customSize: $('custom-size'),
    customSizeInput: $('custom-size-input'),
    customSizeEcho: $('custom-size-echo'),
    setupForm: $('setup-form'),
    menuBtn: $('menu-btn'),
    progress: $('progress'),
    progressText: $('progress-text'),
    progressBar: $('progress-bar'),
    boardWrap: $('board-wrap'),
    canvas: $('board'),
    turnPanel: $('turn-panel'),
    turnLabel: $('turn-label'),
    dieA: $('die-a'),
    dieB: $('die-b'),
    turnMsg: $('turn-msg'),
    rollBtn: $('roll-btn'),
    rotateBtn: $('rotate-btn'),
    math: $('math'),
    mathQ: $('math-q'),
    answerBox: $('answer-box'),
    countTrail: $('count-trail'),
    mathFeedback: $('math-feedback'),
    keypad: $('keypad'),
    helpBtn: $('help-btn'),
    steps: $('steps'),
    diceEntry: $('dice-entry'),
    diePicks: document.querySelectorAll('.die-pick'),
    useDiceBtn: $('use-dice'),
    continueBtn: $('continue-btn'),
    timer: $('timer'),
    timerFill: $('timer-fill'),
    timerNum: $('timer-num'),
    stats: $('stats'),
    detailsBtn: $('details-btn'),
    scores: $('scores'),
    gameOver: $('game-over'),
    resultTitle: $('result-title'),
    resultSub: $('result-sub'),
    resultList: $('result-list'),
    againBtn: $('again-btn'),
    toMenuBtn: $('to-menu-btn'),
    settingsBtn: $('settings-btn'),
    historyBtn: $('history-btn'),
    historyDialog: $('history'),
    historyBody: $('history-body'),
    historyDone: $('history-done'),
    resetHistory: $('reset-history'),
    settingsDialog: $('settings'),
    walletAmount: $('wallet-amount'),
    gameSettingsBtn: $('game-settings-btn'),
    practiceSetup: $('practice-setup'),
    practiceName: $('practice-name'),
    practiceCount: $('practice-count'),
    practicePreview: $('practice-preview'),
    practiceTables: $('practice-tables'),
    practiceLevel: $('practice-level'),
    practiceLevelHelp: $('practice-level-help'),
    difficultyField: $('difficulty-field'),
    boardSizeField: $('board-size-field'),
    startBtn: $('start-btn'),
    practiceScreen: $('practice-screen'),
    practiceMenuBtn: $('practice-menu-btn'),
    practiceSettingsBtn: $('practice-settings-btn'),
    prCounter: $('pr-counter'),
    prStreak: $('pr-streak'),
    prBar: $('pr-bar'),
    prArray: $('pr-array'),
    prTimer: $('pr-timer'),
    prTimerFill: $('pr-timer-fill'),
    prTimerNum: $('pr-timer-num'),
    prQ: $('pr-q'),
    prAnswer: $('pr-answer'),
    prTrail: $('pr-trail'),
    prFeedback: $('pr-feedback'),
    prKeypad: $('pr-keypad'),
    prHelp: $('pr-help'),
    practiceDone: $('practice-done'),
    pdSub: $('pd-sub'),
    pdRewards: $('pd-rewards'),
    pdBody: $('pd-body'),
    pdDetailsBtn: $('pd-details-btn'),
    pdShopBtn: $('pd-shop-btn'),
    resultsShopBtn: $('results-shop-btn'),
    pdAgain: $('pd-again'),
    pdMenu: $('pd-menu'),
    settingsNote: $('settings-note'),
    toasts: $('toasts'),
    shopBtn: $('shop-btn'),
    shopDialog: $('shop'),
    shopBody: $('shop-body'),
    shopWallet: $('shop-wallet'),
    shopDone: $('shop-done'),
    achievementsBtn: $('achievements-btn'),
    achievementsDialog: $('achievements'),
    achievementsBody: $('achievements-body'),
    achievementsDone: $('achievements-done'),
    rewards: $('rewards'),
    inviteBtn: $('invite-btn'),
    inviteMake: $('invite-make'),
    inviteCodeInput: $('invite-code-input'),
    inviteCodeOpen: $('invite-code-open'),
    inviteCodeError: $('invite-code-error'),
    invitePlayers: $('invite-players'),
    inviteNote: $('invite-note'),
    inviteBoard: $('invite-board'),
    inviteCustomField: $('invite-custom-field'),
    inviteCustom: $('invite-custom'),
    inviteSeed: $('invite-seed'),
    inviteCreate: $('invite-create'),
    inviteResult: $('invite-result'),
    inviteLink: $('invite-link'),
    inviteCode: $('invite-code'),
    inviteLocalWarning: $('invite-local-warning'),
    inviteTry: $('invite-try'),
    inviteQrWrap: $('invite-qr-wrap'),
    inviteQr: $('invite-qr'),
    inviteQrSave: $('invite-qr-save'),
    inviteQrPrint: $('invite-qr-print'),
    inviteDone: $('invite-done'),
    inviteOpen: $('invite-open'),
    inviteOpenNote: $('invite-open-note'),
    inviteOpenSummary: $('invite-open-summary'),
    inviteOpenNameField: $('invite-open-name-field'),
    inviteOpenName: $('invite-open-name'),
    inviteStart: $('invite-start'),
    inviteCancel: $('invite-cancel'),
    settingsDone: $('settings-done'),
    cornerRuleHint: $('corner-rule-hint'),
  };
  const ctx = el.canvas.getContext('2d');

  // ---------------------------------------------------------------- setup

  // types[i] is 'human' or 'cpu' for each multiplayer slot.
  const setup = { mode: 'single', count: 2, size: 12, names: DEFAULT_NAMES.slice(), types: ['human', 'human', 'human', 'human'] };

  // ---------------------------------------------------------------- progress (wallet, unlocks, achievements)

  const progress = loadProgress();

  function loadProgress() {
    try {
      return Progress.normalize(JSON.parse(localStorage.getItem(PROGRESS_KEY)));
    } catch (_) {
      return Progress.createProgress();
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (_) {
      // not fatal: progress just won't persist
    }
    renderWallet();
  }

  function renderWallet() {
    el.walletAmount.textContent = formatPoints(progress.wallet);
  }

  // 10000 → "10,000" (in the reader's locale).
  function formatPoints(n) {
    return Number(n).toLocaleString();
  }

  // Show newly earned achievements as toasts; returns them for the caller.
  function celebrate(earned) {
    for (const a of earned) toast(`${a.icon} ${a.minor ? '' : 'Achievement: '}${a.name}`, `+${a.reward} points`);
    // one full-screen celebration (bigger for several), not for minor ones like fact speed
    const major = earned.filter((a) => !a.minor).length;
    if (major) confettiFullScreen(major);
    return earned;
  }

  // ---- confetti: paper bits that fly, then fall and flutter. Every toast gets a
  // burst from itself; achievements also get a full-screen celebration.
  // Drawn on a see-through canvas that ignores clicks; skipped for reduced motion.
  const CONFETTI_COLORS = ['#e4572e', '#2e86de', '#2a9d5c', '#8e5bd6', '#f2c94c', '#ff8fab'];
  const confetti = { canvas: null, ctx: null, parts: [], frame: null, last: 0 };

  // Make sure the canvas exists and matches the window; false when motion is reduced.
  function confettiReady() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (!confetti.canvas) {
      confetti.canvas = document.createElement('canvas');
      confetti.canvas.className = 'confetti';
      confetti.canvas.setAttribute('aria-hidden', 'true');
      document.body.append(confetti.canvas);
      confetti.ctx = confetti.canvas.getContext('2d');
    }
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(innerWidth * dpr);
    const h = Math.round(innerHeight * dpr);
    if (confetti.canvas.width !== w || confetti.canvas.height !== h) {
      confetti.canvas.width = w;
      confetti.canvas.height = h;
    }
    confetti.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function addPiece(x, y, angleDeg, speed, maxAge = 200) {
    const angle = (angleDeg * Math.PI) / 180;
    confetti.parts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      spin: Math.random() * Math.PI,
      vspin: (Math.random() - 0.5) * 0.4,
      wobble: Math.random() * Math.PI * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      round: Math.random() < 0.3,
      age: 0,
      maxAge,
    });
  }

  function startConfetti() {
    if (!confetti.frame) {
      confetti.last = performance.now();
      confetti.frame = requestAnimationFrame(stepConfetti);
    }
  }

  // A burst shooting up out of an element (mostly up, leaning right).
  function confettiFrom(element, strength = 1) {
    if (!confettiReady()) return;
    const box = element.getBoundingClientRect();
    const count = Math.min(90 + 40 * (strength - 1), 200);
    for (let i = 0; i < count; i++) {
      addPiece(box.left + Math.random() * box.width, box.top + box.height * 0.3, -90 + (Math.random() - 0.35) * 110, 7 + Math.random() * 9);
    }
    startConfetti();
  }

  // Full screen: a shower from the top across the whole width, plus a cannon
  // in each bottom corner firing towards the middle.
  function confettiFullScreen(strength = 1) {
    if (!confettiReady()) return;
    const w = innerWidth;
    const h = innerHeight;
    const shower = Math.min(Math.round((w / 6) * (0.8 + 0.3 * strength)), 420);
    for (let i = 0; i < shower; i++) {
      // start above the screen at different heights so it keeps raining for a while
      addPiece(Math.random() * w, -20 - Math.random() * h * 0.9, 90 + (Math.random() - 0.5) * 30, 1 + Math.random() * 3, 420);
    }
    const perCannon = Math.min(70 + 30 * (strength - 1), 150);
    const reach = Math.sqrt(h) * 0.75; // strong enough to reach the upper half on any screen
    for (let i = 0; i < perCannon; i++) {
      addPiece(0, h, -60 + (Math.random() - 0.5) * 30, reach * (0.7 + Math.random() * 0.5), 300);
      addPiece(w, h, -120 + (Math.random() - 0.5) * 30, reach * (0.7 + Math.random() * 0.5), 300);
    }
    startConfetti();
  }

  function stepConfetti(now) {
    const dt = Math.min(2, (now - confetti.last) / 16.7); // in 60fps frames, capped after tab switches
    confetti.last = now;
    const g = confetti.ctx;
    g.clearRect(0, 0, innerWidth, innerHeight);
    confetti.parts = confetti.parts.filter((p) => (p.y < innerHeight + 20 || p.vy < 0) && p.age < p.maxAge);
    for (const p of confetti.parts) {
      p.age += dt;
      p.vy += 0.28 * dt; // gravity
      p.vx *= Math.pow(0.985, dt); // air
      p.vy = Math.min(p.vy, 6); // paper falls slowly
      p.wobble += 0.15 * dt;
      p.x += (p.vx + Math.sin(p.wobble) * 0.8) * dt;
      p.y += p.vy * dt;
      p.spin += p.vspin * dt;
      g.save();
      g.globalAlpha = Math.min(1, (p.maxAge - p.age) / 40);
      g.translate(p.x, p.y);
      g.rotate(p.spin);
      g.fillStyle = p.color;
      if (p.round) {
        g.beginPath();
        g.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        g.fill();
      } else {
        g.scale(1, Math.cos(p.wobble)); // flipping paper
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      g.restore();
    }
    if (confetti.parts.length) confetti.frame = requestAnimationFrame(stepConfetti);
    else {
      confetti.frame = null;
      g.clearRect(0, 0, innerWidth, innerHeight);
    }
  }

  const BONUS_TOASTS = { first: '✨', speedy: '⚡', streak: '🔥' };

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Small pop-up message in the corner that disappears by itself.
  function toast(title, detail = '') {
    const box = document.createElement('div');
    box.className = 'toast';
    box.setAttribute('role', 'status');
    const strong = document.createElement('strong');
    strong.textContent = title;
    box.append(strong);
    if (detail) {
      const small = document.createElement('span');
      small.textContent = detail;
      box.append(small);
    }
    el.toasts.append(box);
    // Keep at most 4 on screen: the oldest goes first.
    const all = el.toasts.querySelectorAll('.toast:not(.leaving)');
    if (all.length > 4) all[0].remove();
    setTimeout(() => box.classList.add('leaving'), 3600);
    setTimeout(() => box.remove(), 4000);
    confettiFrom(box); // every toast gets a little burst
    return box;
  }

  // ---------------------------------------------------------------- settings

  const settings = loadSettings();

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (saved) return { ...DEFAULT_SETTINGS, ...saved };
    } catch (_) {
      // storage unavailable or corrupt: fall back to defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_) {
      // not fatal: settings just won't persist
    }
  }

  function cpuStep() {
    return CPU_STEP_MS[(game || settings).cpuSpeed] || CPU_STEP_MS.normal;
  }

  // Shop item that unlocks a setting's choice; null when it's free (the default).
  function unlockFor(key, value) {
    if (key === 'theme' || String(value) === String(DEFAULT_SETTINGS[key])) return null;
    if (key === 'difficulty') return `difficulty.${value}`;
    if (key === 'cpuSteps') return 'cpuInstant';
    if (key === 'diceStyle') return 'goldenDice';
    if (key === 'answerTime') return `answerTime${value}`; // each length is its own unlock
    return key;
  }

  function isAllowed(key, value) {
    return Progress.isUnlocked(progress, unlockFor(key, value));
  }

  // Anything saved before it was locked (or not yet bought) falls back to the default.
  function enforceLocks() {
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (!isAllowed(key, settings[key])) settings[key] = DEFAULT_SETTINGS[key];
    }
  }
  enforceLocks();

  // A Lucide icon from the sprite in index.html, e.g. icon('lock').
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#i-${name}`);
    svg.append(use);
    return svg;
  }

  // Mark a button as locked with a "🔒 price" badge, or clear it.
  function setLockBadge(btn, itemId) {
    const locked = !Progress.isUnlocked(progress, itemId);
    btn.classList.toggle('locked', locked);
    btn.dataset.unlock = locked ? itemId : '';
    let badge = btn.querySelector('.lock-badge');
    if (locked && !badge) {
      badge = document.createElement('span');
      badge.className = 'lock-badge';
      btn.append(badge);
    }
    if (badge && !locked) badge.remove();
    if (badge && locked) badge.replaceChildren(icon('lock'), ` ${formatPoints(Progress.shopItem(itemId).price)}`);
  }

  function syncSettingsUI() {
    for (const group of document.querySelectorAll('.segmented[data-setting]')) {
      const key = group.dataset.setting;
      for (const btn of group.querySelectorAll('button')) {
        btn.classList.toggle('selected', btn.dataset.value === String(settings[key]));
        setLockBadge(btn, unlockFor(key, btn.dataset.value));
      }
    }
    el.cornerRuleHint.hidden = !settings.firstInCorner;
  }

  // Setting buttons live in the Settings dialog and (difficulty) on the main menu.
  function onSettingClick(e) {
    const btn = e.target.closest('.segmented[data-setting] button');
    if (!btn) return;
    if (btn.dataset.unlock) return openShop(btn.dataset.unlock, btn);
    const key = btn.parentElement.dataset.setting;
    const raw = btn.dataset.value;
    settings[key] = raw === 'true' ? true : raw === 'false' ? false : raw;
    saveSettings();
    syncSettingsUI();
    updatePracticePreview();
  }

  el.settingsDialog.addEventListener('click', (e) => {
    if (e.target === el.settingsDialog) return el.settingsDone.click(); // backdrop
    onSettingClick(e);
    applyTheme();
  });

  function applyTheme(redraw = true) {
    const root = document.documentElement;
    if (settings.theme === 'light' || settings.theme === 'dark') root.dataset.theme = settings.theme;
    else delete root.dataset.theme;
    if (settings.diceStyle === 'golden') root.dataset.dice = 'golden';
    else delete root.dataset.dice;
    if (redraw) drawBoard();
  }
  applyTheme(false); // the board doesn't exist yet during setup
  // In Auto, redraw the board when the device switches between light and dark.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => drawBoard());
  el.setupForm.addEventListener('click', onSettingClick);

  let settingsOpener = null; // button to return focus to

  function openSettings(opener) {
    settingsOpener = opener;
    const inGame = !el.gameScreen.hidden && game && game.phase !== 'over';
    el.settingsNote.hidden = !inGame;
    if (inGame) {
      el.settingsNote.textContent = game.invite
        ? 'You’re playing an invite, so its rules stay the same until the game ends. Theme changes apply now.'
        : 'Theme, CPU speed and the progress bar change now. Other changes start from the next turn. The corner rule applies to new games.';
    }
    syncSettingsUI();
    el.settingsDialog.hidden = false;
    el.settingsDone.focus();
  }

  el.settingsBtn.addEventListener('click', () => openSettings(el.settingsBtn));
  el.gameSettingsBtn.addEventListener('click', () => openSettings(el.gameSettingsBtn));
  el.settingsDone.addEventListener('click', () => {
    el.settingsDialog.hidden = true;
    applySettingsNow();
    if (settingsOpener) settingsOpener.focus();
  });

  // Settings changed during a game (not an invite): these are safe to switch at once.
  function applySettingsNow() {
    if (!game || game.invite || game.phase === 'over') return;
    game.cpuSpeed = settings.cpuSpeed;
    game.cpuEnd = settings.cpuEnd;
    game.showProgress = settings.showProgress;
    render();
  }

  // ...and these wait for the start of the next turn, so a move is never changed halfway.
  function applySettingsForTurn() {
    if (!game || game.invite) return;
    applySettingsNow();
    game.placeMode = settings.placeMode;
    game.diceMode = settings.diceMode;
    game.autoRoll = settings.autoRoll === 'auto';
    game.cpuInstant = settings.cpuSteps === 'instant';
    game.answerTime = Number(settings.answerTime) || 0;
    game.fitMode = settings.fitRolls;
  }
  el.settingsDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') el.settingsDone.click();
  });
  syncSettingsUI();

  function selectIn(container, button) {
    container.querySelectorAll('button').forEach((b) => b.classList.toggle('selected', b === button));
  }

  // Single player is free; Multiplayer, 3/4 players and Practice are shop unlocks.
  const MODE_UNLOCK = { single: null, multi: 'multiplayer', practice: 'practice' };
  const PLAYERS_UNLOCK = { 2: null, 3: 'players3', 4: 'players4' };

  function syncModeLocks() {
    el.modeCards.forEach((card) => setLockBadge(card, MODE_UNLOCK[card.dataset.mode]));
    for (const btn of el.playerCount.querySelectorAll('button')) setLockBadge(btn, PLAYERS_UNLOCK[btn.dataset.count]);
  }
  syncModeLocks();

  el.modeCards.forEach((card) => {
    card.addEventListener('click', () => {
      if (card.dataset.unlock) return openShop(card.dataset.unlock, card);
      setup.mode = card.dataset.mode;
      el.modeCards.forEach((c) => {
        c.classList.toggle('selected', c === card);
        c.setAttribute('aria-checked', String(c === card));
      });
      el.singleSetup.hidden = setup.mode !== 'single';
      el.multiSetup.hidden = setup.mode !== 'multi';
      el.practiceSetup.hidden = setup.mode !== 'practice';
      el.boardSizeField.hidden = setup.mode === 'practice'; // practice has no board
      el.startBtn.textContent = setup.mode === 'practice' ? 'Start practice' : 'Start game';
      updatePracticePreview();
    });
  });

  el.playerCount.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.unlock) return openShop(btn.dataset.unlock, btn);
    saveNameInputs();
    setup.count = Number(btn.dataset.count);
    selectIn(el.playerCount, btn);
    renderNameInputs();
  });

  const CUSTOM_MIN = 6;
  const CUSTOM_MAX = 30;

  function syncBoardLocks() {
    for (const btn of el.boardSize.querySelectorAll('button')) setLockBadge(btn, BOARD_UNLOCK[btn.dataset.size]);
  }
  syncBoardLocks();

  el.boardSize.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.unlock) return openShop(btn.dataset.unlock, btn);
    selectIn(el.boardSize, btn);
    const custom = btn.dataset.size === 'custom';
    el.customSize.hidden = !custom;
    setup.size = custom ? readCustomSize() : Number(btn.dataset.size);
  });

  function clampCustom(n) {
    n = Math.round(Number(n));
    return Number.isFinite(n) ? Math.max(CUSTOM_MIN, Math.min(n, CUSTOM_MAX)) : 14;
  }

  // Current custom size (clamped), mirrored next to the input.
  function readCustomSize() {
    const size = clampCustom(el.customSizeInput.value);
    el.customSizeEcho.textContent = size;
    return size;
  }

  function setCustomSize(size) {
    el.customSizeInput.value = clampCustom(size);
    setup.size = readCustomSize();
  }

  el.customSizeInput.addEventListener('input', () => {
    if (el.customSizeInput.value !== '') setup.size = readCustomSize();
  });
  el.customSizeInput.addEventListener('change', () => setCustomSize(readCustomSize()));
  el.customSize.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-step]');
    if (btn) setCustomSize(readCustomSize() + Number(btn.dataset.step));
  });

  function saveNameInputs() {
    el.nameInputs.querySelectorAll('input').forEach((input, i) => {
      if (setup.types[i] === 'human') setup.names[i] = input.value;
    });
  }

  // CPU slots are numbered in order: CPU 1, CPU 2, …
  function cpuName(index) {
    const nth = setup.types.slice(0, index + 1).filter((t) => t === 'cpu').length;
    return `CPU ${nth}`;
  }

  function renderNameInputs() {
    el.nameInputs.innerHTML = '';
    for (let i = 0; i < setup.count; i++) {
      const isCpu = setup.types[i] === 'cpu';
      const row = document.createElement('div');
      row.className = 'name-row';
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = COLORS[i];
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 14;
      input.value = isCpu ? cpuName(i) : setup.names[i];
      input.disabled = isCpu;
      input.setAttribute('aria-label', `Player ${i + 1} name`);
      const kind = document.createElement('button');
      kind.type = 'button';
      kind.className = 'kind-toggle' + (isCpu ? ' cpu' : '');
      kind.dataset.index = i;
      kind.textContent = isCpu ? '🤖 CPU' : '👤 Human';
      kind.setAttribute('aria-label', `Player ${i + 1}: ${isCpu ? 'CPU' : 'human'}. Click to switch.`);
      row.append(swatch, input, kind);
      el.nameInputs.append(row);
    }
  }
  renderNameInputs();

  el.nameInputs.addEventListener('click', (e) => {
    const btn = e.target.closest('.kind-toggle');
    if (!btn) return;
    saveNameInputs();
    const i = Number(btn.dataset.index);
    setup.types[i] = setup.types[i] === 'cpu' ? 'human' : 'cpu';
    renderNameInputs();
  });

  el.setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (setup.mode === 'practice') {
      startPractice(el.practiceName.value.trim() || 'You', practiceRoundSize, [...practiceTables], practiceLevel === 'expert');
      return;
    }
    saveNameInputs();
    if (!el.customSize.hidden) setCustomSize(readCustomSize());
    let players;
    if (setup.mode === 'single') {
      players = [
        { name: el.singleName.value.trim() || 'You', cpu: false },
        { name: 'CPU', cpu: true },
      ];
    } else {
      players = setup.names.slice(0, setup.count).map((name, i) =>
        setup.types[i] === 'cpu'
          ? { name: cpuName(i), cpu: true }
          : { name: name.trim() || DEFAULT_NAMES[i], cpu: false }
      );
    }
    startGame(players, setup.size, setup.mode);
  });

  // ---------------------------------------------------------------- game state

  let game = null;
  let gameId = 0; // bumped on every new game so pending timers from an old game do nothing

  // invite: a decoded invite, whose settings and dice seed apply to this game only.
  function startGame(playerDefs, size, mode, invite = null) {
    cancelContinue();
    stopTimer();
    stopPracticeTimer();
    practice = null;
    el.practiceScreen.hidden = true;
    el.practiceDone.hidden = true;
    gameId++;
    const cfg = { ...settings, ...(invite ? invite.s : {}) };
    const rng = invite && invite.r !== undefined ? seededRandom(invite.r) : Math.random;
    game = {
      invite,
      rng,
      cpuSpeed: cfg.cpuSpeed,
      cpuEnd: cfg.cpuEnd,
      showProgress: cfg.showProgress,
      id: gameId,
      size,
      mode, // 'single' (you vs the CPU) or 'multi'
      board: Core.createBoard(size, { firstInCorner: cfg.firstInCorner }),
      difficulty: cfg.difficulty,
      sides: Core.DIFFICULTY_SIDES[cfg.difficulty] || 6,
      cpuInstant: cfg.cpuSteps === 'instant',
      autoRoll: cfg.autoRoll === 'auto',
      fitMode: cfg.fitRolls,
      players: playerDefs.map((p, i) => ({
        ...p,
        color: COLORS[i],
        score: 0, // squares + bonus
        squares: 0,
        bonus: 0,
        streak: 0, // first-try answers in a row
        bestStreak: 0,
        log: [],
        answered: 0,
        firstTry: 0,
        stats: { placed: 0, biggest: null, wrong: 0, helped: 0, timeouts: 0, passes: 0, times: [], missed: [] },
      })),
      answerTime: Number(cfg.answerTime) || 0, // seconds, 0 = untimed
      startedAt: Date.now(),
      turns: 0,
      current: 0,
      passes: 0,
      dice: null,
      rotated: false,
      phase: 'roll', // roll | rolling | place | answer | cpu | over
      hover: null, // { c, r } cell under pointer
      cpuPreview: null,
      lastRect: null,
      placeMode: cfg.placeMode, // 'draw': drag out the rectangle; 'click': click to drop it
      diceMode: cfg.diceMode, // 'virtual': the app rolls; 'real': players roll real dice and enter them
      picked: [null, null], // real-dice values entered so far
      drag: null, // { c0, r0, c1, r1 } while a human is drawing
      pending: null, // human rectangle waiting for its points to be worked out
      counting: null, // { rect, byRows, shown, group } while skip-counting on the board
    };
    game.diceBag = Core.createDice(size, rng, game.sides); // loaded to suit board and difficulty
    buildDicePicks(game.sides);
    el.startScreen.hidden = true;
    el.gameOver.hidden = true;
    el.gameScreen.hidden = false;
    renderDie(el.dieA, null);
    renderDie(el.dieB, null);
    resizeBoard();
    beginTurn();
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // Resolves after ms, or never if the game has changed in the meantime.
  function waitInGame(ms) {
    const id = gameId;
    return wait(ms).then(() => (id === gameId ? true : new Promise(() => {})));
  }

  function currentPlayer() {
    return game.players[game.current];
  }

  function currentDims() {
    if (!game.dice) return null;
    const [a, b] = game.dice;
    return game.rotated ? [b, a] : [a, b];
  }

  function beginTurn() {
    applySettingsForTurn();
    const p = currentPlayer();
    game.turns++;
    stopTimer();
    game.dice = null;
    game.rotated = false;
    game.hover = null;
    game.cpuPreview = null;
    game.drag = null;
    game.pending = null;
    game.counting = null;
    el.math.hidden = true;
    el.steps.hidden = true;
    el.steps.innerHTML = '';
    renderDie(el.dieA, null);
    renderDie(el.dieB, null);
    if (p.cpu) {
      game.phase = 'cpu';
      setMsg(`${p.name} is rolling…`);
      render();
      runComputerTurn();
    } else {
      game.phase = 'roll';
      const first = Core.mustUseCorner(game.board);
      const corner = first ? ' Your first rectangle goes in the top-left corner.' : '';
      if (game.diceMode === 'real') {
        game.picked = [null, null];
        renderDicePicks();
        setMsg(`Roll your two dice, then tap the numbers you got.${corner}`);
      } else if (game.autoRoll) {
        setMsg(`Rolling the dice…${corner}`);
      } else {
        setMsg(first ? `Roll the dice!${corner}` : 'Roll the dice!');
      }
      render();
      // Real dice are rolled at the table, so auto roll only applies to app dice.
      if (game.autoRoll && game.diceMode !== 'real') waitInGame(AUTO_ROLL_MS).then(humanRoll);
    }
  }

  async function rollDice() {
    game.phase = 'rolling';
    render();
    el.dieA.classList.add('rolling');
    el.dieB.classList.add('rolling');
    for (let i = 0; i < 8; i++) {
      renderDie(el.dieA, Core.rollDie(Math.random, game.sides));
      renderDie(el.dieB, Core.rollDie(Math.random, game.sides));
      await waitInGame(55);
    }
    el.dieA.classList.remove('rolling');
    el.dieB.classList.remove('rolling');
    game.dice = Core.rollForBoard(game.board, game.diceBag, game.rng, game.fitMode);
    renderDie(el.dieA, game.dice[0]);
    renderDie(el.dieB, game.dice[1]);
    return game.dice;
  }

  async function humanRoll() {
    if (!game || game.phase !== 'roll' || currentPlayer().cpu || game.diceMode === 'real') return;
    const [a, b] = await rollDice();
    await startPlacing(a, b);
  }

  // ---- real dice: the player enters what they rolled

  function pickDie(index, value) {
    if (!game || game.phase !== 'roll' || game.diceMode !== 'real') return;
    game.picked[index] = value;
    renderDicePicks();
  }

  // Keyboard entry: a digit fills the first empty die (or the second if both are set).
  function typeDie(value) {
    const i = game.picked[0] === null ? 0 : 1;
    pickDie(i, value);
  }

  function clearLastDie() {
    if (game.picked[1] !== null) pickDie(1, null);
    else pickDie(0, null);
  }

  async function useRealDice() {
    if (!game || game.phase !== 'roll' || game.diceMode !== 'real') return;
    const [a, b] = game.picked;
    if (!a || !b) return;
    game.dice = [a, b];
    await startPlacing(a, b);
  }

  function renderDicePicks() {
    el.diePicks.forEach((row, i) => {
      for (const btn of row.querySelectorAll('button')) {
        const on = Number(btn.dataset.value) === game.picked[i];
        btn.classList.toggle('selected', on);
        btn.setAttribute('aria-pressed', String(on));
      }
    });
    renderDie(el.dieA, game.picked[0]);
    renderDie(el.dieB, game.picked[1]);
    el.useDiceBtn.disabled = !(game.picked[0] && game.picked[1]);
  }

  async function startPlacing(a, b) {
    const options = Core.validPlacements(game.board, a, b);
    if (options.length === 0) {
      await pass(a, b);
      return;
    }
    if (game.placeMode === 'auto') {
      await autoPlace(a, b);
      return;
    }
    // Start in an orientation that actually fits somewhere.
    if (!options.some((o) => o.w === a && o.h === b)) game.rotated = true;
    game.phase = 'place';
    setMsg(placeInstructions());
    render();
  }

  // Auto mode: put the rectangle in a snug spot (same strategy as the
  // computer), show it briefly, then go straight to the maths.
  async function autoPlace(a, b) {
    game.phase = 'busy';
    const move = Core.chooseComputerMove(game.board, a, b);
    setMsg(`You rolled ${a} and ${b}. Placing your ${a} by ${b} rectangle…`);
    game.cpuPreview = move;
    render();
    await waitInGame(AUTO_PLACE_MS);
    game.cpuPreview = null;
    startAnswer(placeRect(move.x, move.y, move.w, move.h));
  }

  function placeInstructions() {
    const [a, b] = game.dice;
    const shape = `a ${a} by ${b} rectangle`;
    const corner = Core.mustUseCorner(game.board);
    if (game.placeMode === 'draw') {
      return corner
        ? `You rolled ${a} and ${b}. Draw ${shape}: start on the top-left square and drag.`
        : `You rolled ${a} and ${b}. Draw ${shape}: press on a square and drag.`;
    }
    return corner
      ? `You rolled ${a} and ${b}. Click the board to draw ${shape} in the corner.`
      : `You rolled ${a} and ${b}. Click the board to draw ${shape}.${a !== b ? ' Press R to rotate.' : ''}`;
  }

  async function pass(a, b) {
    const p = currentPlayer();
    game.phase = p.cpu ? 'cpu' : 'rolling';
    p.log.push({ pass: true, a, b });
    p.stats.passes++;
    game.passes++;
    const who = game.mode === 'single' && !p.cpu ? 'You pass' : `${p.name} passes`;
    setMsg(`No room for a ${a} × ${b} anywhere. ${who}.`);
    render();
    if (p.cpu) await finishComputerTurn(cpuStep());
    else await waitInGame(PASS_DELAY);
    endTurn();
  }

  // Draw the rectangle on the board. Its points are awarded once the maths is done.
  function placeRect(x, y, w, h) {
    const [a, b] = game.dice;
    const rect = Core.place(game.board, x, y, w, h, game.current);
    rect.a = a;
    rect.b = b;
    rect.solved = false;
    game.lastRect = rect;
    game.passes = 0;
    return rect;
  }

  function awardPoints(rect, firstTry, bonus = 0) {
    const p = currentPlayer();
    rect.solved = true;
    p.squares += rect.area;
    p.bonus += bonus;
    p.score = p.squares + p.bonus;
    p.answered++;
    if (firstTry) p.firstTry++;
    p.stats.placed++;
    if (!p.stats.biggest || rect.area > p.stats.biggest.area) p.stats.biggest = rect;
    p.log.push({ a: rect.a, b: rect.b, area: rect.area, bonus, star: !p.cpu && firstTry });
  }

  // ---- human: work out the points

  function startAnswer(rect) {
    game.pending = { rect, entry: '', attempts: 0, helped: false, miss: null, startedAt: performance.now(), pausedMs: 0 };
    game.phase = 'answer';
    setMsg('How many squares did you just draw?');
    el.mathQ.textContent = `${rect.a} × ${rect.b}`;
    el.answerBox.textContent = '';
    el.answerBox.className = 'answer-box';
    el.countTrail.textContent = '';
    el.mathFeedback.textContent = '';
    el.mathFeedback.className = 'math-feedback';
    el.math.hidden = false;
    setKeypadEnabled(true);
    el.helpBtn.disabled = false;
    render();
    startTimer();
    if (window.innerWidth <= 820) el.math.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setKeypadEnabled(on) {
    el.keypad.querySelectorAll('button').forEach((b) => (b.disabled = !on));
  }

  function typeKey(key) {
    const pend = game && game.phase === 'answer' && game.pending;
    if (!pend) return;
    if (key === 'check') return checkAnswer();
    if (key === 'clear') pend.entry = '';
    else if (key === 'back') pend.entry = pend.entry.slice(0, -1);
    else if (pend.entry.length < 3) pend.entry = (pend.entry === '0' ? '' : pend.entry) + key;
    el.answerBox.textContent = pend.entry;
    el.answerBox.className = 'answer-box';
    // The right answer submits itself, and so does anything bigger than it (more
    // digits can only make it bigger, so it's already wrong). Smaller wrong
    // numbers wait for ✓, since you might not be done typing.
    if (Number(pend.entry) >= pend.rect.area) checkAnswer();
  }

  async function checkAnswer() {
    const pend = game.pending;
    if (!pend || pend.entry === '') return;
    const { rect } = pend;
    if (Number(pend.entry) === rect.area) {
      stopTimer();
      const p = currentPlayer();
      const ms = performance.now() - pend.startedAt - pend.pausedMs;
      const firstTry = pend.attempts === 0;
      p.stats.times.push(ms);
      p.streak = firstTry ? p.streak + 1 : 0;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      const bonus = Progress.answerBonus({ firstTry, ms, streak: p.streak });
      game.phase = 'busy';
      setKeypadEnabled(false);
      el.helpBtn.disabled = true;
      el.answerBox.className = 'answer-box right';
      el.mathFeedback.className = 'math-feedback good';
      const squares = `+${rect.area} ${rect.area === 1 ? 'square' : 'squares'}`;
      el.mathFeedback.textContent = firstTry ? `Correct! ${squares} 🎉` : `You got it! ${squares}`;
      // Each bonus pops up on its own, like an achievement.
      for (const part of bonus.parts) toast(`${BONUS_TOASTS[part.label.split(' ')[0]]} ${capitalize(part.label)}`, `+${part.points} bonus points`);
      awardPoints(rect, firstTry, bonus.total);
      Progress.recordAnswer(progress, p.name, {
        a: rect.a,
        b: rect.b,
        firstTry,
        correct: true,
        wrongAnswers: pend.miss ? pend.miss.answers : [],
        ms,
      });
      celebrate(Progress.awardAchievements(progress, { event: 'answer', correct: true, firstTry, ms, streak: p.streak, a: rect.a, b: rect.b, facts: playerFacts(p.name), size: unlockedTableSize() }));
      saveProgress();
      game.pending = null;
      render();
      await waitInGame(1400);
      endTurn();
      return;
    }
    currentPlayer().streak = 0;
    pend.attempts++;
    noteMiss(pend, { answer: Number(pend.entry) });
    pend.entry = '';
    currentPlayer().stats.wrong++;
    el.answerBox.className = 'answer-box';
    void el.answerBox.offsetWidth; // restart the shake animation
    el.answerBox.className = 'answer-box wrong';
    el.answerBox.textContent = '';
    el.mathFeedback.className = 'math-feedback try';
    el.mathFeedback.textContent = TRY_AGAIN[(pend.attempts - 1) % TRY_AGAIN.length];
    if (pend.attempts >= 2 && !pend.helped) {
      el.mathFeedback.textContent = "Let's count them together!";
      helpCount();
    }
  }

  async function helpCount() {
    const pend = game.pending;
    if (!pend || pend.helped || game.counting) return;
    pend.helped = true;
    currentPlayer().stats.helped++;
    el.helpBtn.disabled = true;
    const { rect } = pend;
    const plan = countPlan(rect);
    const totals = [];
    const helpStarted = performance.now(); // the timer is paused while counting
    await skipCount(rect, plan, COUNT_STEP, (total) => {
      totals.push(total);
      const units = plan.steps === 1 ? plan.unit : `${plan.unit}s`;
      el.countTrail.textContent = `${plan.steps} ${units} of ${plan.group}: ${totals.join(', ')}`;
    });
    pend.pausedMs += performance.now() - helpStarted;
    if (game.pending === pend) {
      el.mathFeedback.className = 'math-feedback';
      el.mathFeedback.textContent = `So what is ${rect.a} × ${rect.b}?`;
    }
  }

  // A fact goes on the "to practise" list the first time it's missed in a turn.
  // Record a missed fact once per turn, with every wrong answer given for it.
  // Entries look like { fact: '6 × 7', answers: [48, 36], timeout: false }.
  function noteMiss(pend, { answer = null, timeout = false } = {}) {
    if (!pend.miss) {
      pend.miss = { fact: `${pend.rect.a} × ${pend.rect.b}`, answers: [], timeout: false };
      currentPlayer().stats.missed.push(pend.miss);
    }
    if (answer !== null) pend.miss.answers.push(answer);
    if (timeout) pend.miss.timeout = true;
  }

  // ---- answer timer (paused while "Help me count" is animating)

  let timer = null; // { total, remaining, last, interval }

  function startTimer() {
    stopTimer();
    el.timer.hidden = !game.answerTime;
    if (!game.answerTime) return;
    const id = gameId;
    const total = game.answerTime * 1000;
    timer = { total, remaining: total, last: performance.now() };
    renderTimer();
    timer.interval = setInterval(() => {
      if (!timer || id !== gameId) return stopTimer();
      const now = performance.now();
      // Paused while "Help me count" is animating or Settings is open.
      if (!game.counting && el.settingsDialog.hidden) timer.remaining -= now - timer.last;
      timer.last = now;
      renderTimer();
      if (timer.remaining <= 0) answerTimeout();
    }, 100);
  }

  function stopTimer() {
    if (timer) clearInterval(timer.interval);
    timer = null;
  }

  function renderTimer() {
    const left = Math.max(0, timer.remaining);
    el.timerNum.textContent = `${Math.ceil(left / 1000)}s`;
    el.timerFill.style.width = `${(left / timer.total) * 100}%`;
    el.timer.classList.toggle('low', left <= 5000);
  }

  // Out of time: show the answer, take the rectangle back off the board, no points.
  async function answerTimeout() {
    stopTimer();
    const pend = game.pending;
    if (!pend || game.phase !== 'answer') return;
    const p = currentPlayer();
    const { rect } = pend;
    game.phase = 'busy';
    game.pending = null;
    setKeypadEnabled(false);
    el.helpBtn.disabled = true;
    noteMiss(pend, { timeout: true });
    p.stats.timeouts++;
    p.streak = 0;
    Progress.recordAnswer(progress, p.name, { a: rect.a, b: rect.b, firstTry: false, correct: false, wrongAnswers: pend.miss.answers, timeout: true });
    saveProgress();
    p.log.push({ timeout: true, a: rect.a, b: rect.b });
    el.answerBox.textContent = rect.area;
    el.answerBox.className = 'answer-box timeout';
    el.mathFeedback.className = 'math-feedback try';
    el.mathFeedback.textContent = `⏰ Time's up! ${rect.a} × ${rect.b} = ${rect.area}. No points this turn.`;
    Core.removeRect(game.board, rect);
    game.lastRect = null;
    game.passes = 0; // the roll did fit, so this isn't a pass
    render();
    await waitInGame(3000);
    endTurn();
  }

  // ---- skip counting, shared by the help button and the computer's explanation

  // Count a × b as "a rows (or columns) of b", matching the order of the dice.
  function countPlan(rect) {
    const byRows = rect.w === rect.b;
    return { byRows, group: rect.b, steps: rect.a, unit: byRows ? 'row' : 'column' };
  }

  async function skipCount(rect, plan, stepMs, onStep) {
    game.counting = { rect, byRows: plan.byRows, group: plan.group, shown: 0 };
    render();
    for (let i = 1; i <= plan.steps; i++) {
      await waitInGame(stepMs);
      game.counting.shown = i;
      onStep(i * plan.group, i);
      render();
    }
    await waitInGame(stepMs);
  }

  // ---- computer: show the working step by step

  function addStep(html, big = false) {
    const li = document.createElement('li');
    li.innerHTML = html;
    if (big) li.className = 'big';
    el.steps.append(li);
    return li;
  }

  async function explainComputerMove(rect) {
    const plan = countPlan(rect);
    const { a, b, area } = rect;
    addStep(`I drew a <span class="num">${a}</span> by <span class="num">${b}</span> rectangle. How many squares is that?`);
    await waitInGame(cpuStep());
    if (a === 1 || b === 1) {
      const n = a === 1 ? b : a;
      addStep(`It's just 1 ${a === 1 ? 'row' : 'column'} of <span class="num">${n}</span>, so that's ${n}.`);
      await waitInGame(cpuStep());
    } else {
      addStep(
        `That's <span class="num">${plan.steps}</span> ${plan.unit}s of <span class="num">${plan.group}</span>. ` +
          `Let's count by ${plan.group}s:`
      );
      let trail = null; // created with its first number so it never shows up empty
      const totals = [];
      await skipCount(rect, plan, cpuStep(), (total) => {
        totals.push(total);
        trail = trail || addStep('');
        trail.innerHTML = totals.map((t) => `<span class="num">${t}</span>`).join(', ');
      });
    }
    game.counting = null;
    addStep(`${a} × ${b} = ${area}`, true);
    awardPoints(rect, true);
    render();
  }

  // ---- end of the computer's turn: carry on by itself, or wait for "My turn"

  let continueResolve = null;

  function gameEndsAfterThisTurn() {
    return game.passes >= game.players.length || Core.emptyCount(game.board) === 0;
  }

  async function finishComputerTurn(autoDelay) {
    if (game.cpuEnd !== 'button' || gameEndsAfterThisTurn()) {
      await waitInGame(autoDelay);
      return;
    }
    const next = game.players[(game.current + 1) % game.players.length];
    el.continueBtn.replaceChildren(
      game.mode === 'single' ? 'My turn ' : next.cpu ? `${next.name} ` : `${next.name}'s turn `,
      icon('chevron-right')
    );
    el.continueBtn.hidden = false;
    el.continueBtn.focus({ preventScroll: true });
    await new Promise((resolve) => (continueResolve = resolve));
  }

  function pressContinue() {
    if (!continueResolve) return;
    const resolve = continueResolve;
    continueResolve = null;
    el.continueBtn.hidden = true;
    resolve();
  }

  function cancelContinue() {
    continueResolve = null; // the abandoned turn just never resumes
    el.continueBtn.hidden = true;
  }

  function endTurn() {
    if (game.passes >= game.players.length || Core.emptyCount(game.board) === 0) {
      finishGame();
      return;
    }
    game.current = (game.current + 1) % game.players.length;
    beginTurn();
  }

  // Instant CPU turns: roll, place and score straight away, no explanation.
  const INSTANT_CPU_MS = 250; // just long enough for the board to redraw between turns

  async function runInstantComputerTurn() {
    const p = currentPlayer();
    const [a, b] = (game.dice = Core.rollForBoard(game.board, game.diceBag, game.rng, game.fitMode));
    renderDie(el.dieA, a);
    renderDie(el.dieB, b);
    const move = Core.chooseComputerMove(game.board, a, b);
    if (move) {
      const rect = placeRect(move.x, move.y, move.w, move.h);
      awardPoints(rect, true);
      setMsg(`${p.name} rolled ${a} and ${b}: ${a} × ${b} = ${rect.area}.`);
    } else {
      p.log.push({ pass: true, a, b });
      p.stats.passes++;
      game.passes++;
      setMsg(`${p.name} rolled ${a} and ${b}: no room, so it passes.`);
    }
    render();
    await waitInGame(INSTANT_CPU_MS);
    endTurn();
  }

  async function runComputerTurn() {
    if (game.cpuInstant) return runInstantComputerTurn();
    await waitInGame(cpuStep());
    const [a, b] = await rollDice();
    const move = Core.chooseComputerMove(game.board, a, b);
    if (!move) {
      await pass(a, b);
      return;
    }
    setMsg('');
    el.steps.hidden = false;
    addStep(`I rolled a <span class="num">${a}</span> and a <span class="num">${b}</span>.`);
    await waitInGame(cpuStep());
    if (game.placeMode === 'draw') {
      const where = game.board.rects.length ? 'snug against the others' : 'in a corner';
      addStep(
        `I’ll draw it ${where}: <span class="num">${move.w}</span> across ` +
          `and <span class="num">${move.h}</span> down.`
      );
      await drawComputerRect(move);
    } else {
      addStep(`I’ll put my rectangle here, ${game.board.rects.length ? 'snug against the others' : 'in a corner'}…`);
      game.cpuPreview = move;
      render();
    }
    await waitInGame(cpuStep());
    game.cpuPreview = null;
    const rect = placeRect(move.x, move.y, move.w, move.h);
    render();
    await explainComputerMove(rect);
    await finishComputerTurn(cpuStep());
    endTurn();
  }

  // Grow the computer's rectangle: the first row one square at a time (at
  // double speed), then one whole row per step.
  async function drawComputerRect(move) {
    for (let w = 1; w <= move.w; w++) {
      game.cpuPreview = { ...move, w, h: 1 };
      render();
      await waitInGame(cpuStep() / 2);
    }
    for (let h = 2; h <= move.h; h++) {
      game.cpuPreview = { ...move, h };
      render();
      await waitInGame(cpuStep());
    }
  }

  function finishGame() {
    game.phase = 'over';
    game.dice = null;
    render();
    const ranked = game.players
      .map((p, i) => ({ ...p, index: i }))
      .sort((p, q) => q.score - p.score);
    const top = ranked[0].score;
    const winners = ranked.filter((p) => p.score === top);
    const isSingle = game.mode === 'single';
    recordGame(new Set(winners.map((p) => p.index)));

    if (winners.length > 1) el.resultTitle.textContent = "It's a tie!";
    else if (isSingle) el.resultTitle.textContent = winners[0].cpu ? 'CPU wins!' : 'You win! 🎉';
    else el.resultTitle.textContent = `${winners[0].name} wins!${winners[0].cpu ? '' : ' 🎉'}`;

    const empty = Core.emptyCount(game.board);
    el.resultSub.textContent =
      empty === 0 ? 'The board is completely full!' : `Nobody could fit a rectangle. ${empty} squares left empty.`;

    el.resultList.innerHTML = '';
    for (const p of ranked) {
      const li = document.createElement('li');
      li.style.setProperty('--c', p.color);
      const name = document.createElement('span');
      name.className = 'result-name';
      name.textContent = p.name;
      const pts = document.createElement('span');
      pts.className = 'result-pts';
      pts.textContent = `${p.score} pts`;
      // Bar length relative to the top score, so the gap is easy to see.
      const bar = document.createElement('span');
      bar.className = 'result-bar';
      const fill = document.createElement('span');
      fill.style.width = `${top ? (p.score / top) * 100 : 0}%`;
      bar.append(fill);
      li.append(name, pts, bar);
      el.resultList.append(li);
    }
    renderRewards(winners, empty);
    showShopNudge(el.resultsShopBtn);
    renderStats();
    setDetailsOpen(false);
    el.gameOver.hidden = false;
    el.gameOver.querySelector('.dialog').scrollTop = 0;
    el.againBtn.focus();
  }

  // Human players' points go into the shared wallet, and game achievements are
  // checked. Shows "+N points" and any new achievements on the end screen.
  function renderRewards(winners, empty) {
    el.rewards.innerHTML = '';
    const humans = game.players.filter((p) => !p.cpu);
    if (!humans.length) return;
    const points = humans.reduce((sum, p) => sum + p.score, 0);
    Progress.addPoints(progress, points);
    progress.counters.games++;
    const humanWon = winners.length === 1 && !winners[0].cpu;
    const asked = (p) => p.answered + p.stats.timeouts;
    const perfect = humans.some((p) => asked(p) >= 5 && p.firstTry === asked(p));
    const earned = Progress.awardAchievements(progress, {
      event: 'game',
      games: progress.counters.games,
      wonVsCpu: game.mode === 'single' && humanWon,
      humanWon,
      full: empty === 0,
      perfect,
      difficulty: game.difficulty,
      bestScore: Math.max(...humans.map((p) => p.score)),
    });
    saveProgress();

    el.rewards.append(make('div', 'reward-points', `🪙 +${points} points · wallet: ${progress.wallet}`));
    for (const a of earned) {
      const row = make('div', 'reward-achievement');
      row.append(make('span', 'achievement-icon', a.icon), make('span', null, `New achievement: ${a.name}`), make('span', 'achievement-reward', `+${a.reward}`));
      el.rewards.append(row);
    }
  }

  // ---- end-of-game stats

  function make(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Games saved before wrong answers were recorded store plain '6 × 7' strings.
  function normalizeMiss(miss) {
    return typeof miss === 'string' ? { fact: miss, answers: [], timeout: false } : miss;
  }

  // Merge misses of the same fact: how often, which wrong answers, how many time-outs.
  function groupMisses(misses, keyOf) {
    const groups = new Map();
    for (const raw of misses) {
      const miss = normalizeMiss(raw);
      const key = keyOf(miss.fact);
      const g = groups.get(key) || { fact: key, count: 0, answers: [], timeouts: 0 };
      g.count++;
      g.answers.push(...miss.answers);
      if (miss.timeout) g.timeouts++;
      groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => b.count - a.count);
  }

  // "6 × 7 = 42 (×2)" with "said 48, 36 · ⏰ ran out of time" underneath.
  function renderPractice(name, color, groups, noneText) {
    const block = make('div', 'practice');
    block.style.setProperty('--c', color);
    block.append(make('div', 'practice-name', name));
    if (!groups.length) {
      block.append(make('span', 'practice-none', noneText));
      return block;
    }
    const list = make('div', 'facts');
    for (const g of groups) {
      const [a, b] = g.fact.split('×').map((n) => Number(n.trim()));
      const item = make('div', 'fact');
      item.append(make('span', 'fact-eq', `${g.fact} = ${a * b}${g.count > 1 ? ` (×${g.count})` : ''}`));
      const details = [];
      const said = [...new Set(g.answers)].slice(0, 5);
      if (said.length) details.push(`said ${said.join(', ')}`);
      if (g.timeouts) details.push(g.timeouts > 1 ? `⏰ ran out of time ×${g.timeouts}` : '⏰ ran out of time');
      if (g.rate) details.push(g.rate);
      if (details.length) item.append(make('span', 'fact-said', details.join(' · ')));
      list.append(item);
    }
    block.append(list);
    return block;
  }

  // ---- lifetime times-table grid

  // Biggest times table the player can reach: 6 (Easy), 8 (Medium) or 12 (Hard).
  function unlockedTableSize() {
    if (Progress.isUnlocked(progress, 'difficulty.hard')) return 12;
    if (Progress.isUnlocked(progress, 'difficulty.medium')) return 8;
    return 6;
  }

  // "2.1s", or "12s" once it's 10 seconds or more, to fit in a grid cell.
  function shortTime(ms) {
    const secs = ms / 1000;
    return secs < 10 ? `${secs.toFixed(1)}s` : `${Math.round(secs)}s`;
  }

  const FACT_STATUS = {
    mastered: { mark: '✓', label: 'Mastered' },
    learning: { mark: '~', label: 'Learning' },
    practice: { mark: '!', label: 'Needs practice' },
    unseen: { mark: '', label: 'Not seen yet' },
  };

  // Which statuses show a best time instead of the icon (Settings → Times-table grid).
  const TIMES_SETTING = { mastered: 'timesMastered', learning: 'timesLearning', practice: 'timesPractice' };

  function showsTime(status) {
    return TIMES_SETTING[status] && settings[TIMES_SETTING[status]] === 'time';
  }

  function renderFactLegend() {
    const legend = make('div', 'fact-legend');
    for (const [status, { mark, label }] of Object.entries(FACT_STATUS)) {
      const item = make('span', 'fact-legend-item');
      item.append(make('span', `fact-cell ${status}`, mark), document.createTextNode(label));
      legend.append(item);
    }
    return legend;
  }

  // Rows and columns 1..N (6, or up to 12 once bigger dice are in play); hover a cell for details.
  // Single player and practice play as "You" (personal accounts will replace this).
  function isDefaultPlayer(name) {
    return Progress.playerKey(name) === 'you';
  }

  function renderFactGrid(name, facts) {
    const seenMax = Math.max(0, ...Object.keys(facts).flatMap((k) => k.split('×').map((n) => Number(n.trim()))));
    const unlocked = unlockedTableSize();
    const max = Math.max(6, seenMax > 8 ? 12 : seenMax > 6 ? 8 : 6, unlocked);
    const wrap = make('div', 'fact-grid-wrap');
    if (name) wrap.append(make('div', 'practice-name', name)); // no label for the default "You"
    const grid = make('div', 'fact-grid');
    grid.style.setProperty('--n', max + 1);
    grid.append(make('span', 'fact-head', '×'));
    for (let c = 1; c <= max; c++) grid.append(make('span', 'fact-head', String(c)));
    for (let r = 1; r <= max; r++) {
      grid.append(make('span', 'fact-head', String(r)));
      for (let c = 1; c <= max; c++) {
        const f = facts[Progress.factKey(r, c)];
        const status = Progress.factStatus(f);
        const best = Progress.factBestMs(f);
        // Best time instead of the icon when that's switched on for this status.
        const timed = showsTime(status) && best !== null;
        const cell = make('span', `fact-cell ${status}${timed ? ' timed' : ''}`, timed ? shortTime(best) : FACT_STATUS[status].mark);
        cell.title = f
          ? `${r} × ${c} = ${r * c}: ${FACT_STATUS[status].label}. ${f.firstTry} of ${f.asked} right first time` +
            (f.wrong ? `, ${f.wrong} wrong` : '') +
            (f.timeouts ? `, ${f.timeouts} timed out` : '') +
            (best !== null ? `, best ${(best / 1000).toFixed(1)} s` : '') +
            (f.timed ? `, avg ${(f.totalMs / f.timed / 1000).toFixed(1)} s` : '')
          : `${r} × ${c} = ${r * c}: not seen yet`;
        grid.append(cell);
      }
    }
    wrap.append(grid);
    return wrap;
  }

  function renderStats() {
    const dash = '—';
    const secs = (ms) => `${(ms / 1000).toFixed(1)} s`;
    const human = (fn) => (p) => (p.cpu ? dash : fn(p));
    const asked = (p) => p.answered + p.stats.timeouts;
    const rows = [
      ['Points', (p) => p.score],
      ['Squares', (p) => p.squares],
      ['Bonus points', human((p) => p.bonus)],
      ['Best streak', human((p) => p.bestStreak)],
      ['Rectangles drawn', (p) => p.stats.placed],
      ['Biggest rectangle', (p) => (p.stats.biggest ? `${p.stats.biggest.a} × ${p.stats.biggest.b} = ${p.stats.biggest.area}` : dash)],
      ['Right on first try', human((p) => (asked(p) ? `${p.firstTry} of ${asked(p)}` : dash))],
      ['Wrong answers', human((p) => p.stats.wrong)],
      ['Used “Help me count”', human((p) => p.stats.helped)],
      game.answerTime ? ['Ran out of time', human((p) => p.stats.timeouts)] : null,
      ['Average answer time', human((p) => (p.stats.times.length ? secs(p.stats.times.reduce((s, t) => s + t, 0) / p.stats.times.length) : dash))],
      ['Fastest answer', human((p) => (p.stats.times.length ? secs(Math.min(...p.stats.times)) : dash))],
      ['Passes', (p) => p.stats.passes],
    ].filter(Boolean);

    el.stats.innerHTML = '';

    // Game summary
    const total = game.size * game.size;
    const filled = total - Core.emptyCount(game.board);
    const elapsed = Math.round((Date.now() - game.startedAt) / 1000);
    const time = elapsed >= 60 ? `${Math.floor(elapsed / 60)} min ${elapsed % 60} s` : `${elapsed} s`;
    el.stats.append(
      make('p', 'stats-summary', `⏱ ${time} · ${game.turns} turns · ${filled} of ${total} squares filled (${Math.round((filled / total) * 100)}%)`)
    );

    // Per-player table
    const wrap = make('div', 'stats-table-wrap');
    const table = make('table', 'stats-table');
    const head = table.createTHead().insertRow();
    head.append(make('th'));
    for (const p of game.players) {
      const th = make('th');
      th.style.setProperty('--c', p.color);
      th.append(make('span', 'dot'), document.createTextNode(p.name));
      head.append(th);
    }
    const body = table.createTBody();
    for (const [label, value] of rows) {
      const tr = body.insertRow();
      tr.append(make('th', null, label));
      for (const p of game.players) tr.append(make('td', null, String(value(p))));
    }
    wrap.append(table);
    el.stats.append(wrap);

    // Facts to practise
    const humans = game.players.filter((p) => !p.cpu);
    if (humans.some((p) => asked(p) > 0)) {
      el.stats.append(make('h3', 'stats-heading', 'Facts to practice'));
      for (const p of humans) {
        const none = asked(p) ? 'Nothing to practice. Every answer right first time! 🌟' : 'No answers this game.';
        el.stats.append(renderPractice(p.name, p.color, groupMisses(p.stats.missed, (f) => f), none));
      }
    }
  }

  // ---------------------------------------------------------------- all-time stats

  // Finished games are kept in this browser only, newest last.
  const HISTORY_KEY = 'blockout.history';
  const HISTORY_LIMIT = 200;

  function loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_LIMIT)));
    } catch (_) {
      // not fatal: stats just won't persist
    }
  }

  function recordGame(winnerIndexes) {
    const tie = winnerIndexes.size > 1;
    const history = loadHistory();
    history.push({
      at: Date.now(),
      size: game.size,
      duration: Date.now() - game.startedAt,
      turns: game.turns,
      difficulty: game.difficulty,
      vsComputer: game.mode === 'single', // "vs CPU" record counts single-player games only
      players: game.players.map((p, i) => ({
        name: p.name,
        cpu: Boolean(p.cpu),
        score: p.score,
        bonus: p.bonus,
        result: winnerIndexes.has(i) ? (tie ? 'tie' : 'win') : 'loss',
        answered: p.answered,
        firstTry: p.firstTry,
        timeouts: p.stats.timeouts,
        times: p.stats.times.map(Math.round),
        missed: p.stats.missed,
      })),
    });
    saveHistory(history);
  }

  // Practice rounds share the history list, marked kind: 'practice'.
  function recordPracticeRound(pr) {
    const history = loadHistory();
    history.push({
      kind: 'practice',
      at: Date.now(),
      duration: Date.now() - pr.startedAt,
      name: pr.name,
      size: pr.max,
      level: pr.expert ? 'expert' : 'learn',
      tables: pr.tables,
      count: pr.count,
      firstTry: pr.firstTry,
      times: pr.times,
      points: pr.points,
    });
    saveHistory(history);
  }

  function formatDuration(ms) {
    const mins = Math.round(ms / 60000);
    if (mins < 1) return `${Math.round(ms / 1000)} s`;
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)} h ${mins % 60} min`;
  }

  function renderHistory() {
    const history = loadHistory();
    const body = el.historyBody;
    body.innerHTML = '';
    const factPlayers = Object.values(progress.facts).filter((p) => Object.keys(p.facts).length);
    el.resetHistory.hidden = !history.length && !factPlayers.length;
    if (!history.length && !factPlayers.length) {
      body.append(make('p', 'history-empty', 'No games or practice yet. Play one and your stats will show up here!'));
      return;
    }
    const games = history.filter((g) => g.kind !== 'practice');
    const rounds = history.filter((g) => g.kind === 'practice');
    if (history.length) renderGameHistory(body, games, rounds);

    // Lifetime times tables for everyone who has answered anything, in games or practice
    const names = new Map();
    for (const g of games) for (const p of g.players) if (!p.cpu) names.set(Progress.playerKey(p.name), p.name);
    for (const p of factPlayers) if (!names.has(Progress.playerKey(p.name))) names.set(Progress.playerKey(p.name), p.name);
    body.append(make('h3', 'stats-heading', 'Times tables'));
    body.append(renderFactLegend());
    for (const name of names.values()) {
      const facts = playerFacts(name);
      const label = isDefaultPlayer(name) ? '' : name; // "You" needs no label
      body.append(renderFactGrid(label, facts));
      const toPractice = Object.entries(facts)
        .filter(([, f]) => f.wrong + f.timeouts > 0)
        .sort(([, a], [, b]) => b.wrong + b.timeouts - (a.wrong + a.timeouts))
        .slice(0, 8)
        .map(([fact, f]) => ({ fact, count: f.wrong + f.timeouts, answers: f.said, timeouts: f.timeouts, rate: `${f.firstTry} of ${f.asked} right first time` }));
      const none = Object.keys(facts).length ? 'Nothing missed so far! 🌟' : 'No answers yet.';
      body.append(renderPractice(label ? `${label}: facts to practice` : 'Facts to practice', 'var(--line)', toPractice, none));
    }

    if (games.length) renderRecentGames(body, games);
  }

  // Tiles and the per-player table (finished games only).
  const DIFFICULTY_NAMES = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };
  const avgTime = (times) => (times.length ? `${(times.reduce((x, t) => x + t, 0) / times.length / 1000).toFixed(1)} s` : '—');
  const percent = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : '—');

  // A table whose first column is a two-line label (bold title, muted details).
  function statsTable(headings, rows) {
    const wrap = make('div', 'stats-table-wrap');
    const table = make('table', 'stats-table by-type');
    const head = table.createTHead().insertRow();
    for (const label of headings) head.append(make('th', null, label));
    const tbody = table.createTBody();
    for (const row of rows) {
      const tr = tbody.insertRow();
      const th = make('th');
      th.append(make('span', 'row-title', row.title), make('span', 'row-sub', row.sub));
      tr.append(th);
      for (const v of row.values) tr.append(make('td', null, String(v)));
    }
    wrap.append(table);
    return wrap;
  }

  // Tiles, then one row per game type (mode · board · difficulty) and per practice type.
  function renderGameHistory(body, games, rounds) {
    const vs = games
      .filter((g) => g.vsComputer && g.players.some((p) => !p.cpu))
      .map((g) => g.players.find((p) => !p.cpu).result);
    const count = (r) => vs.filter((x) => x === r).length;
    const tiles = make('div', 'tiles');
    const tile = (value, label) => {
      const t = make('div', 'tile');
      t.append(make('span', 'tile-value', value), make('span', 'tile-label', label));
      return t;
    };
    tiles.append(
      tile(`${games.length}${rounds.length ? ` + ${rounds.length}` : ''}`, rounds.length ? 'games + practice rounds' : 'games played'),
      tile(formatDuration([...games, ...rounds].reduce((s, g) => s + g.duration, 0)), 'time played'),
      tile(vs.length ? `${count('win')}–${count('loss')}–${count('tie')}` : '—', 'vs CPU (W–L–T)')
    );
    body.append(tiles);

    if (games.length) {
      const groups = new Map();
      for (const g of games) {
        const mode = g.vsComputer ? 'single' : 'multi';
        const difficulty = g.difficulty || 'easy'; // older games were all 6-sided dice
        const key = `${mode}|${g.size}|${difficulty}`;
        const row = groups.get(key) || { mode, size: g.size, difficulty, games: 0, wins: 0, best: 0, asked: 0, firstTry: 0, times: [] };
        row.games++;
        const humans = g.players.filter((p) => !p.cpu);
        if (humans.some((p) => p.result === 'win')) row.wins++;
        for (const p of humans) {
          row.best = Math.max(row.best, p.score);
          row.asked += p.answered + p.timeouts;
          row.firstTry += p.firstTry;
          row.times.push(...p.times);
        }
        groups.set(key, row);
      }
      const rows = [...groups.values()]
        .sort((a, b) => (a.mode === b.mode ? 0 : a.mode === 'single' ? -1 : 1) || a.size - b.size || DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty])
        .map((r) => ({
          title: r.mode === 'single' ? 'Single player' : 'Multiplayer',
          sub: `${r.size}×${r.size} · ${DIFFICULTY_NAMES[r.difficulty]}`,
          values: [r.games, r.wins, r.best, percent(r.firstTry, r.asked), avgTime(r.times)],
        }));
      body.append(make('h3', 'stats-heading', 'Games'));
      body.append(statsTable(['', 'Games', 'Wins', 'Best score', 'Right 1st try', 'Avg answer'], rows));
    }

    if (rounds.length) {
      const groups = new Map();
      for (const r of rounds) {
        const key = `${r.size}|${r.level}`;
        const row = groups.get(key) || { size: r.size, level: r.level, rounds: 0, best: null, asked: 0, firstTry: 0, times: [] };
        row.rounds++;
        if (!row.best || r.firstTry / r.count > row.best.firstTry / row.best.count) row.best = r;
        row.asked += r.count;
        row.firstTry += r.firstTry;
        row.times.push(...r.times);
        groups.set(key, row);
      }
      const rows = [...groups.values()]
        .sort((a, b) => a.size - b.size || (a.level === b.level ? 0 : a.level === 'learn' ? -1 : 1))
        .map((r) => ({
          title: 'Practice',
          sub: `up to ×${r.size} · ${r.level === 'expert' ? 'Expert' : 'Learn'}`,
          values: [r.rounds, `${r.best.firstTry}/${r.best.count}`, percent(r.firstTry, r.asked), avgTime(r.times)],
        }));
      body.append(make('h3', 'stats-heading', 'Practice'));
      body.append(statsTable(['', 'Rounds', 'Best round', 'Right 1st try', 'Avg answer'], rows));
    }
  }

  function renderRecentGames(body, history) {
    body.append(make('h3', 'stats-heading', 'Recent games'));
    const recent = make('ol', 'recent');
    for (const g of history.slice(-10).reverse()) {
      const li = make('li');
      const when = new Date(g.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      li.append(make('span', 'meta', `${when} · ${g.size}×${g.size}`));
      li.append(document.createTextNode(g.players.map((p) => `${p.name} ${p.score}`).join(' – ')));
      const won = g.players.filter((p) => p.result === 'win');
      li.append(document.createTextNode(' · '));
      li.append(make('span', 'winner', won.length ? `🏆 ${won[0].name}` : 'Tie'));
      recent.append(li);
    }
    body.append(recent);
  }

  function openHistory() {
    renderHistory();
    el.historyDialog.hidden = false;
    el.historyDialog.querySelector('.dialog').scrollTop = 0;
    el.historyDone.focus();
  }

  function closeHistory() {
    el.historyDialog.hidden = true;
    el.historyBtn.focus();
  }

  el.historyBtn.addEventListener('click', openHistory);

  // How to play popup
  const howto = $('howto');
  $('howto-btn').addEventListener('click', () => {
    howto.hidden = false;
    howto.querySelector('.dialog').scrollTop = 0;
    $('howto-done').focus();
  });
  $('howto-done').addEventListener('click', () => {
    howto.hidden = true;
    $('howto-btn').focus();
  });
  howto.addEventListener('click', (e) => {
    if (e.target === howto) howto.hidden = true;
  });
  howto.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') howto.hidden = true;
  });
  el.historyDone.addEventListener('click', closeHistory);
  el.historyDialog.addEventListener('click', (e) => {
    if (e.target === el.historyDialog) closeHistory();
  });
  el.historyDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeHistory();
  });
  el.resetHistory.addEventListener('click', () => {
    if (!confirm('Delete all game history and times-table stats on this device? Points, unlocks and achievements are kept. This cannot be undone.')) return;
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (_) {
      // nothing saved anyway
    }
    progress.facts = {};
    saveProgress();
    renderHistory();
  });

  // ---------------------------------------------------------------- shop

  const BUY_REASONS = {
    points: (r) => `Need ${formatPoints(r.missing)} more`,
    requires: (r) => `Unlock ${Progress.shopItem(r.requires).name.split(':')[0]} first`,
  };

  function renderShop(highlight) {
    el.shopWallet.textContent = formatPoints(progress.wallet);
    el.shopBody.innerHTML = '';
    let group = null;
    for (const item of Progress.SHOP) {
      if (item.group !== group) {
        group = item.group;
        el.shopBody.append(make('h3', 'stats-heading', group));
      }
      const row = make('div', 'shop-item' + (item.id === highlight ? ' highlight' : ''));
      row.append(make('span', 'shop-name', item.name));
      const owned = Progress.isUnlocked(progress, item.id);
      if (owned) {
        row.classList.add('owned');
        const owned = make('span', 'shop-owned');
        owned.append(icon('check'), ' Unlocked');
        row.append(owned);
      } else {
        const check = Progress.canBuy(progress, item.id);
        const btn = make('button', 'btn btn-small' + (check.ok ? ' btn-primary' : ''), `🪙 ${formatPoints(item.price)}`);
        btn.type = 'button';
        btn.dataset.buy = item.id;
        btn.disabled = !check.ok;
        row.append(btn);
        if (!check.ok) row.append(make('span', 'shop-why', BUY_REASONS[check.reason](check)));
      }
      el.shopBody.append(row);
    }
  }

  // What was tapped to open the shop, so buying it switches that exact choice on.
  let shopSource = null; // { item, el }

  function openShop(highlight, sourceEl = null) {
    shopSource = highlight && sourceEl ? { item: highlight, el: sourceEl } : null;
    renderShop(highlight);
    el.shopDialog.hidden = false;
    const target = highlight && el.shopBody.querySelector('.shop-item.highlight');
    if (target) target.scrollIntoView({ block: 'center' });
    else el.shopDialog.querySelector('.dialog').scrollTop = 0;
    el.shopDone.focus({ preventScroll: true });
  }

  function closeShop() {
    el.shopDialog.hidden = true;
  }

  el.shopBtn.addEventListener('click', () => openShop());
  el.shopDone.addEventListener('click', closeShop);
  el.resultsShopBtn.addEventListener('click', () => openShop());
  el.pdShopBtn.addEventListener('click', () => openShop());
  el.shopDialog.addEventListener('click', (e) => {
    if (e.target === el.shopDialog) return closeShop();
    const btn = e.target.closest('[data-buy]');
    if (!btn) return;
    const item = Progress.shopItem(btn.dataset.buy);
    if (!Progress.buy(progress, item.id).ok) return;
    toast(`🔓 Unlocked: ${item.name}`, `-${formatPoints(item.price)} points`);
    celebrate(Progress.awardAchievements(progress, { event: 'buy' }));
    saveProgress();
    renderShop(item.id);
    syncSettingsUI();
    syncBoardLocks();
    syncModeLocks();
    updatePracticePreview();
    if (!el.gameOver.hidden) showShopNudge(el.resultsShopBtn);
    if (!el.practiceDone.hidden) showShopNudge(el.pdShopBtn);
    activatePurchase(item);
  });

  // ---- "you can afford something" button on the results screens

  function affordableCount() {
    return Progress.SHOP.filter((item) => Progress.canBuy(progress, item.id).ok).length;
  }

  function showShopNudge(btn) {
    const n = affordableCount();
    btn.hidden = n === 0;
    if (n) btn.replaceChildren(icon('shopping-cart'), ` Shop · ${n} new ${n === 1 ? 'unlock' : 'unlocks'}`);
  }

  // ---- switch a purchase on straight away

  // Click a control (even inside a closed dialog) as if the player had tapped it.
  function tap(selector) {
    const target = document.querySelector(selector);
    if (target && !target.dataset.unlock) target.click();
  }

  const setOption = (key, value) => () => tap(`[data-setting="${key}"] [data-value="${value}"]`);

  // Bought straight from the shop list: switch on the obvious choice. Items with
  // more than one choice and no clear favourite (CPU speed, placing) are left alone.
  const ACTIVATE = {
    multiplayer: () => tap('[data-mode="multi"]'),
    players3: () => (tap('[data-mode="multi"]'), tap('#player-count [data-count="3"]')),
    players4: () => (tap('[data-mode="multi"]'), tap('#player-count [data-count="4"]')),
    practice: () => tap('[data-mode="practice"]'),
    practiceExpert: () => (tap('[data-mode="practice"]'), tap('#practice-level [data-level="expert"]')),
    board16: () => tap('#board-size [data-size="16"]'),
    board20: () => tap('#board-size [data-size="20"]'),
    boardCustom: () => tap('#board-size [data-size="custom"]'),
    'difficulty.medium': setOption('difficulty', 'medium'),
    'difficulty.hard': setOption('difficulty', 'hard'),
    diceMode: setOption('diceMode', 'real'),
    autoRoll: setOption('autoRoll', 'auto'),
    fitRolls: setOption('fitRolls', 'always'),
    answerTime30: setOption('answerTime', '30'),
    answerTime10: setOption('answerTime', '10'),
    answerTime5: setOption('answerTime', '5'),
    cpuInstant: setOption('cpuSteps', 'instant'),
    cpuEnd: setOption('cpuEnd', 'button'),
    showProgress: setOption('showProgress', 'true'),
    firstInCorner: setOption('firstInCorner', 'true'),
    timesMastered: setOption('timesMastered', 'time'),
    timesLearning: setOption('timesLearning', 'time'),
    timesPractice: setOption('timesPractice', 'time'),
    goldenDice: setOption('diceStyle', 'golden'),
  };

  function activatePurchase(item) {
    const source = shopSource;
    shopSource = null;
    if (source && source.item === item.id && source.el.isConnected) source.el.click(); // the exact thing tapped
    else if (ACTIVATE[item.id]) ACTIVATE[item.id]();
    applyTheme(false); // e.g. golden dice
  }
  el.shopDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeShop();
  });

  // ---------------------------------------------------------------- achievements

  function renderAchievements() {
    el.achievementsBody.innerHTML = '';
    const got = Progress.ACHIEVEMENTS.filter((a) => progress.achievements[a.id]).length;
    el.achievementsBody.append(make('p', 'stats-summary', `${got} of ${Progress.ACHIEVEMENTS.length} earned`));
    let list = null;
    let group = null;
    for (const a of Progress.ACHIEVEMENTS) {
      if (a.group === 'Fact speed') continue; // shown as a grid below
      if (a.group !== group) {
        group = a.group;
        const earnedHere = Progress.ACHIEVEMENTS.filter((x) => x.group === group && progress.achievements[x.id]).length;
        const total = Progress.ACHIEVEMENTS.filter((x) => x.group === group).length;
        el.achievementsBody.append(make('h3', 'stats-heading', `${group} · ${earnedHere} of ${total}`));
        if (group === 'Times tables') {
          el.achievementsBody.append(make('p', 'setting-help', `📗 Learner: every fact in the line is Learning or better. 🏅 Master: every fact is Mastered. Lines go up to your table size (${unlockedTableSize()} × ${unlockedTableSize()} now).`));
        }
        list = make('div', 'achievement-list');
        el.achievementsBody.append(list);
      }
      const when = progress.achievements[a.id];
      const row = make('div', 'achievement' + (when ? ' earned' : ''));
      const badge = make('span', 'achievement-icon', when ? a.icon : undefined);
      if (!when) badge.append(icon('lock'));
      row.append(badge);
      const text = make('div', 'achievement-text');
      text.append(make('strong', null, a.name), make('span', null, a.desc));
      row.append(text);
      row.append(
        make('span', 'achievement-reward', when ? new Date(when).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `+${a.reward}`)
      );
      list.append(row);
    }
    el.achievementsBody.append(renderFactSpeed());
  }

  // Fact speed: one cell per fact with the best tier earned (10, 5 or 1 seconds).
  function renderFactSpeed() {
    const box = make('div', 'fact-speed');
    const size = unlockedTableSize();
    const all = Progress.ACHIEVEMENTS.filter((a) => a.group === 'Fact speed');
    const earned = all.filter((a) => progress.achievements[a.id]);
    box.append(make('h3', 'stats-heading', `Fact speed · ${earned.length} of ${all.length}`));
    box.append(make('p', 'setting-help', `Master a fact and answer it fast. Each fact has three tiers: under 10, 5 and 1 seconds. Showing up to ${size} × ${size}.`));
    const counts = make('div', 'fact-legend');
    for (const t of Progress.FACT_SPEED_TIERS) {
      const n = earned.filter((a) => a.tier === t.secs).length;
      const item = make('span', 'fact-legend-item');
      item.append(make('span', `fact-cell speed-${t.secs}`, String(t.secs)), document.createTextNode(`Under ${t.secs} s: ${n}`));
      counts.append(item);
    }
    box.append(counts);
    const grid = make('div', 'fact-grid');
    grid.style.setProperty('--n', size + 1);
    grid.append(make('span', 'fact-head', '×'));
    for (let c = 1; c <= size; c++) grid.append(make('span', 'fact-head', String(c)));
    for (let r = 1; r <= size; r++) {
      grid.append(make('span', 'fact-head', String(r)));
      for (let c = 1; c <= size; c++) {
        const best = Progress.FACT_SPEED_TIERS.slice().reverse().find((t) => progress.achievements[`fact_${r}x${c}_${t.secs}`]);
        const cell = make('span', `fact-cell ${best ? `speed-${best.secs}` : 'unseen'}`, best ? String(best.secs) : '');
        cell.title = best ? `${r} × ${c}: under ${best.secs} s` : `${r} × ${c}: not earned yet`;
        grid.append(cell);
      }
    }
    box.append(grid);
    return box;
  }

  el.achievementsBtn.addEventListener('click', () => {
    renderAchievements();
    el.achievementsDialog.hidden = false;
    el.achievementsDialog.querySelector('.dialog').scrollTop = 0;
    el.achievementsDone.focus();
  });
  el.achievementsDone.addEventListener('click', () => (el.achievementsDialog.hidden = true));
  el.achievementsDialog.addEventListener('click', (e) => {
    if (e.target === el.achievementsDialog) el.achievementsDialog.hidden = true;
  });
  el.achievementsDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') el.achievementsDialog.hidden = true;
  });

  // ---------------------------------------------------------------- practice mode

  const PRACTICE_BASE_POINTS = 1; // per correct answer, before bonuses
  // For "what changed": moving right is progress (so a new fact landing in
  // "needs practice" shows as a step down, not an improvement).
  const STATUS_ORDER = { practice: 0, unseen: 1, learning: 2, mastered: 3 };
  let practiceRoundSize = 10;
  let practiceLevel = 'learn'; // 'expert' (shop unlock): no picture, no help button until 2 misses, ×2 bonus
  const EXPERT_BONUS = 2;
  const LEVEL_HELP = {
    learn: 'Learn: see each fact as a rectangle and get help counting.',
    expert: 'Expert: no picture and no help. First-try bonus points are doubled!',
  };

  function renderPracticeLevel() {
    if (!Progress.isUnlocked(progress, 'practiceExpert') && practiceLevel === 'expert') practiceLevel = 'learn';
    for (const btn of el.practiceLevel.querySelectorAll('button')) {
      btn.classList.toggle('selected', btn.dataset.level === practiceLevel);
      setLockBadge(btn, btn.dataset.level === 'expert' ? 'practiceExpert' : null);
    }
    el.practiceLevelHelp.textContent = LEVEL_HELP[practiceLevel];
  }

  el.practiceLevel.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.unlock) return openShop(btn.dataset.unlock, btn);
    practiceLevel = btn.dataset.level;
    renderPracticeLevel();
  });
  const practiceTables = new Set(); // chosen times tables; empty = the whole table
  let practice = null;
  let prTimer = null;

  function playerFacts(name) {
    return (progress.facts[Progress.playerKey(name)] || { facts: {} }).facts;
  }

  // Practice table size follows Difficulty: Easy 6, Medium 8, Hard 12.
  function practiceMax() {
    return Core.DIFFICULTY_SIDES[settings.difficulty] || 6;
  }

  // Chips ×1 … ×max (max comes from Difficulty); choices above max are dropped.
  function renderPracticeTables() {
    const max = practiceMax();
    for (const n of [...practiceTables]) if (n > max) practiceTables.delete(n);
    el.practiceTables.innerHTML = '';
    for (let n = 1; n <= max; n++) {
      const btn = make('button', null, `×${n}`);
      btn.type = 'button';
      btn.dataset.table = n;
      btn.setAttribute('aria-pressed', String(practiceTables.has(n)));
      btn.setAttribute('aria-label', `${n} times table`);
      el.practiceTables.append(btn);
    }
  }

  el.practiceTables.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-table]');
    if (!btn) return;
    const n = Number(btn.dataset.table);
    if (practiceTables.has(n)) practiceTables.delete(n);
    else practiceTables.add(n);
    updatePracticePreview();
  });

  // "×3 and ×4 (11 facts): 2 need practice, 5 learning, 4 not seen yet, 0 mastered."
  function tablesLabel(tables) {
    const list = [...tables].sort((a, b) => a - b).map((n) => `×${n}`);
    return list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0];
  }

  function updatePracticePreview() {
    if (el.practiceSetup.hidden) return;
    renderPracticeLevel();
    renderPracticeTables();
    const facts = playerFacts(el.practiceName.value.trim() || 'You');
    const max = practiceMax();
    const counts = { practice: 0, learning: 0, unseen: 0, mastered: 0 };
    let total = 0;
    for (let a = 1; a <= max; a++) {
      for (let b = 1; b <= max; b++) {
        if (practiceTables.size && !practiceTables.has(a) && !practiceTables.has(b)) continue;
        counts[Progress.factStatus(facts[Progress.factKey(a, b)])]++;
        total++;
      }
    }
    const what = practiceTables.size ? `${tablesLabel(practiceTables)} up to ${max} (${total} facts)` : `Your whole table, up to ${max} × ${max}`;
    el.practicePreview.textContent =
      `${what}: ${counts.practice} need practice, ${counts.learning} learning, ` +
      `${counts.unseen} not seen yet, ${counts.mastered} mastered.`;
  }
  el.practiceName.addEventListener('input', updatePracticePreview);
  el.practiceCount.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    practiceRoundSize = Number(btn.dataset.count);
    selectIn(el.practiceCount, btn);
  });

  function startPractice(name, count, tables = [], expert = false) {
    stopPracticeTimer();
    cancelContinue();
    stopTimer();
    gameId++; // cancels anything still waiting from a game
    game = null;
    const max = practiceMax();
    const facts = playerFacts(name);
    const queue = Progress.pickPracticeFacts(facts, max, count, Math.random, tables);
    const before = {};
    for (const [a, b] of queue) before[Progress.factKey(a, b)] = Progress.factStatus(facts[Progress.factKey(a, b)]);
    practice = { name, max, count, tables, expert, startedAt: Date.now(), times: [], queue, index: 0, requeued: new Set(), before, firstTry: 0, answered: 0, streak: 0, bestStreak: 0, points: 0, earned: [], current: null };
    el.startScreen.hidden = true;
    el.gameScreen.hidden = true;
    el.practiceDone.hidden = true;
    el.practiceScreen.hidden = false;
    nextPracticeQuestion();
  }

  function nextPracticeQuestion() {
    stopPracticeTimer();
    if (practice.index >= practice.queue.length) return finishPractice();
    const [a, b] = practice.queue[practice.index];
    // retry: a missed fact asked again at the end; it doesn't count towards the score
    practice.current = { a, b, area: a * b, retry: practice.index >= practice.count, entry: '', attempts: 0, wrong: [], helped: false, counting: false, startedAt: performance.now(), pausedMs: 0, done: false };
    const focus =
      (practice.tables.length ? ` · ${practice.tables.sort((x, y) => x - y).map((n) => `×${n}`).join(' ')}` : '') +
      (practice.expert ? ' · 🧠 Expert' : '');
    el.prCounter.textContent = `Question ${practice.index + 1} of ${practice.queue.length}${focus}`;
    el.prStreak.textContent = practice.streak >= 2 ? `🔥 ${practice.streak} in a row` : '';
    el.prBar.style.width = `${(practice.index / practice.queue.length) * 100}%`;
    el.prQ.textContent = `${a} × ${b}`;
    el.prAnswer.textContent = '';
    el.prAnswer.className = 'answer-box';
    el.prTrail.textContent = '';
    el.prFeedback.textContent = '';
    el.prFeedback.className = 'math-feedback';
    el.prHelp.disabled = false;
    el.prHelp.hidden = practice.expert; // Expert: no help button (the picture still helps after 2 misses)
    el.prKeypad.querySelectorAll('button').forEach((btn) => (btn.disabled = false));
    renderPracticeArray(a, b);
    el.prArray.hidden = practice.expert; // Expert: no picture to count
    startPracticeTimer();
  }

  // The fact as a rectangle: a rows of b squares, with a slot for each row's running total.
  function renderPracticeArray(a, b) {
    el.prArray.innerHTML = '';
    el.prArray.classList.remove('counting');
    el.prArray.style.setProperty('--cols', b);
    for (let r = 0; r < a; r++) {
      for (let c = 0; c < b; c++) {
        const cell = make('span', 'cell');
        cell.dataset.row = r;
        el.prArray.append(cell);
      }
      const total = make('span', 'row-total', String((r + 1) * b));
      total.dataset.row = r;
      el.prArray.append(total);
    }
  }

  function typePractice(key) {
    const q = practice && practice.current;
    if (!q || q.done || el.practiceScreen.hidden) return;
    if (key === 'check') return checkPractice();
    if (key === 'clear') q.entry = '';
    else if (key === 'back') q.entry = q.entry.slice(0, -1);
    else if (q.entry.length < 3) q.entry = (q.entry === '0' ? '' : q.entry) + key;
    el.prAnswer.textContent = q.entry;
    el.prAnswer.className = 'answer-box';
    if (Number(q.entry) >= q.area) checkPractice(); // right answers (and too-big ones) submit themselves
  }

  function practiceLocked(on) {
    el.prKeypad.querySelectorAll('button').forEach((btn) => (btn.disabled = on));
    el.prHelp.disabled = on;
  }

  // A missed fact comes back once, later in the round.
  function requeue(q) {
    const key = Progress.factKey(q.a, q.b);
    if (practice.requeued.has(key)) return;
    practice.requeued.add(key);
    practice.queue.push([q.a, q.b]);
  }

  async function checkPractice() {
    const q = practice.current;
    if (!q || q.done || q.entry === '') return;
    if (Number(q.entry) === q.area) {
      q.done = true;
      stopPracticeTimer();
      practiceLocked(true);
      const ms = performance.now() - q.startedAt - q.pausedMs;
      const firstTry = q.attempts === 0;
      practice.answered++;
      if (firstTry && !q.retry) practice.firstTry++;
      practice.times.push(Math.round(ms));
      practice.streak = firstTry ? practice.streak + 1 : 0;
      practice.bestStreak = Math.max(practice.bestStreak, practice.streak);
      const bonus = Progress.answerBonus({ firstTry, ms, streak: practice.streak });
      const multiplier = practice.expert ? EXPERT_BONUS : 1;
      const points = PRACTICE_BASE_POINTS + bonus.total * multiplier;
      practice.points += points;
      Progress.addPoints(progress, points);
      for (const part of bonus.parts) {
        const extra = practice.expert ? ` (×${EXPERT_BONUS} Expert)` : '';
        toast(`${BONUS_TOASTS[part.label.split(' ')[0]]} ${capitalize(part.label)}`, `+${part.points * multiplier} bonus points${extra}`);
      }
      Progress.recordAnswer(progress, practice.name, { a: q.a, b: q.b, firstTry, correct: true, wrongAnswers: q.wrong, ms });
      practice.earned.push(...celebrate(Progress.awardAchievements(progress, { event: 'answer', correct: true, firstTry, ms, streak: practice.streak, a: q.a, b: q.b, facts: playerFacts(practice.name), size: unlockedTableSize() })));
      saveProgress();
      el.prAnswer.className = 'answer-box right';
      el.prFeedback.className = 'math-feedback good';
      el.prFeedback.textContent = firstTry ? `Correct! +${points} points 🎉` : `You got it! +${points} point${points === 1 ? '' : 's'}`;
      el.prStreak.textContent = practice.streak >= 2 ? `🔥 ${practice.streak} in a row` : '';
      await waitInGame(1100);
      practice.index++;
      nextPracticeQuestion();
      return;
    }
    q.attempts++;
    q.wrong.push(Number(q.entry));
    q.entry = '';
    practice.streak = 0;
    el.prStreak.textContent = '';
    requeue(q);
    el.prAnswer.className = 'answer-box';
    void el.prAnswer.offsetWidth; // restart the shake
    el.prAnswer.className = 'answer-box wrong';
    el.prAnswer.textContent = '';
    el.prFeedback.className = 'math-feedback try';
    el.prFeedback.textContent = TRY_AGAIN[(q.attempts - 1) % TRY_AGAIN.length];
    // Learn: count it out after two misses. Expert: no help at all.
    if (q.attempts >= 2 && !q.helped && !practice.expert) {
      el.prFeedback.textContent = "Let's count them together!";
      practiceHelp();
    }
  }

  // Light up the rectangle one row at a time with running totals.
  async function practiceHelp() {
    const q = practice && practice.current;
    if (!q || q.done || q.helped || practice.expert) return; // Expert gets no help
    q.helped = true;
    q.counting = true;
    el.prHelp.disabled = true;
    el.prArray.hidden = false; // Expert hides it until now
    const started = performance.now();
    el.prArray.classList.add('counting');
    const totals = [];
    for (let r = 0; r < q.a; r++) {
      await waitInGame(COUNT_STEP);
      if (practice.current !== q) return;
      el.prArray.querySelectorAll(`.cell[data-row="${r}"]`).forEach((c) => c.classList.add('counted'));
      el.prArray.querySelector(`.row-total[data-row="${r}"]`).classList.add('shown');
      totals.push((r + 1) * q.b);
      el.prTrail.textContent = `${q.a} ${q.a === 1 ? 'row' : 'rows'} of ${q.b}: ${totals.join(', ')}`;
    }
    q.counting = false;
    q.pausedMs += performance.now() - started;
    if (!q.done) {
      el.prFeedback.className = 'math-feedback';
      el.prFeedback.textContent = `So what is ${q.a} × ${q.b}?`;
    }
  }

  // Answer timer from Settings; paused while counting or while Settings is open.
  // Only Expert practice is timed; Learn never shows a clock.
  function startPracticeTimer() {
    const secs = practice.expert ? Number(settings.answerTime) || 0 : 0;
    el.prTimer.hidden = !secs;
    if (!secs) return;
    const q = practice.current;
    const total = secs * 1000;
    prTimer = { total, remaining: total, last: performance.now() };
    const draw = () => {
      const left = Math.max(0, prTimer.remaining);
      el.prTimerNum.textContent = `${Math.ceil(left / 1000)}s`;
      el.prTimerFill.style.width = `${(left / total) * 100}%`;
      el.prTimer.classList.toggle('low', left <= 5000);
    };
    draw();
    prTimer.interval = setInterval(() => {
      if (!practice || practice.current !== q || q.done) return stopPracticeTimer();
      const now = performance.now();
      if (!q.counting && el.settingsDialog.hidden) prTimer.remaining -= now - prTimer.last;
      prTimer.last = now;
      draw();
      if (prTimer.remaining <= 0) practiceTimeout();
    }, 100);
  }

  function stopPracticeTimer() {
    if (prTimer) clearInterval(prTimer.interval);
    prTimer = null;
  }

  async function practiceTimeout() {
    stopPracticeTimer();
    const q = practice.current;
    if (!q || q.done) return;
    q.done = true;
    practiceLocked(true);
    practice.streak = 0;
    Progress.recordAnswer(progress, practice.name, { a: q.a, b: q.b, firstTry: false, correct: false, wrongAnswers: q.wrong, timeout: true });
    saveProgress();
    requeue(q);
    el.prAnswer.textContent = q.area;
    el.prAnswer.className = 'answer-box timeout';
    el.prFeedback.className = 'math-feedback try';
    el.prFeedback.textContent = `⏰ Time's up! ${q.a} × ${q.b} = ${q.area}. It'll come back later.`;
    await waitInGame(2200);
    practice.index++;
    nextPracticeQuestion();
  }

  function finishPractice() {
    stopPracticeTimer();
    el.prBar.style.width = '100%';
    const pr = practice;
    progress.counters.practiceRounds = (progress.counters.practiceRounds || 0) + 1;
    recordPracticeRound(pr);
    pr.earned.push(...celebrate(Progress.awardAchievements(progress, { event: 'practice' })));
    saveProgress();

    const retries = pr.queue.length - pr.count; // missed facts asked again
    el.pdSub.textContent =
      (pr.expert ? '🧠 Expert · ' : '') +
      `${pr.firstTry} of ${pr.count} right first time` +
      (retries ? ` · ${retries} ${retries === 1 ? 'fact' : 'facts'} retried` : '') +
      (pr.bestStreak >= 3 ? ` · best streak ${pr.bestStreak} 🔥` : '');
    el.pdRewards.innerHTML = '';
    el.pdRewards.append(make('div', 'reward-points', `🪙 +${pr.points} points · wallet: ${progress.wallet}`));
    for (const a of pr.earned) {
      const row = make('div', 'reward-achievement');
      row.append(make('span', 'achievement-icon', a.icon), make('span', null, `New achievement: ${a.name}`), make('span', 'achievement-reward', `+${a.reward}`));
      el.pdRewards.append(row);
    }

    // Which facts moved, e.g. "3 × 4: Needs practice → Learning"
    el.pdBody.innerHTML = '';
    const facts = playerFacts(pr.name);
    const changes = Object.entries(pr.before)
      .map(([fact, was]) => ({ fact, was, now: Progress.factStatus(facts[fact]) }))
      .filter((c) => c.was !== c.now)
      .sort((x, y) => STATUS_ORDER[y.now] - STATUS_ORDER[y.was] - (STATUS_ORDER[x.now] - STATUS_ORDER[x.was]));
    el.pdBody.append(make('h3', 'stats-heading', 'What changed'));
    if (!changes.length) el.pdBody.append(make('p', 'practice-none', 'No changes this time. Keep practicing and your facts will move up!'));
    for (const c of changes) {
      const row = make('div', 'practice-change');
      const up = STATUS_ORDER[c.now] > STATUS_ORDER[c.was];
      row.append(make('span', null, c.fact), make('span', up ? 'up' : 'down', `${FACT_STATUS[c.was].label} → ${FACT_STATUS[c.now].label}`));
      el.pdBody.append(row);
    }
    el.pdBody.append(make('h3', 'stats-heading centered', 'Times table'));
    el.pdBody.append(renderFactLegend());
    el.pdBody.append(renderFactGrid('', facts));

    setPracticeDetailsOpen(false);
    showShopNudge(el.pdShopBtn);
    el.practiceDone.hidden = false;
    el.practiceDone.querySelector('.dialog').scrollTop = 0;
    el.pdAgain.focus();
  }

  function leavePractice() {
    stopPracticeTimer();
    gameId++;
    practice = null;
    el.practiceDone.hidden = true;
    el.practiceScreen.hidden = true;
    el.startScreen.hidden = false;
    updatePracticePreview();
  }

  el.prKeypad.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) typePractice(btn.dataset.key);
  });
  el.prHelp.addEventListener('click', practiceHelp);
  el.pdAgain.addEventListener('click', () => startPractice(practice.name, practice.count, practice.tables, practice.expert));
  el.pdMenu.addEventListener('click', leavePractice);
  // "What changed" and the times table sit behind Show details, like the game results.
  function setPracticeDetailsOpen(open) {
    el.pdBody.hidden = !open;
    el.pdDetailsBtn.replaceChildren(icon('chart-column'), open ? ' Hide details' : ' Show details');
    el.pdDetailsBtn.setAttribute('aria-expanded', String(open));
  }
  el.pdDetailsBtn.addEventListener('click', () => setPracticeDetailsOpen(el.pdBody.hidden));
  el.practiceMenuBtn.addEventListener('click', () => {
    if (practice && practice.index < practice.queue.length && !confirm('Stop practicing and go back to the menu?')) return;
    leavePractice();
  });
  el.practiceSettingsBtn.addEventListener('click', () => openSettings(el.practiceSettingsBtn));
  document.addEventListener('keydown', (e) => {
    if (!practice || el.practiceScreen.hidden || !el.practiceDone.hidden) return;
    if (!el.settingsDialog.hidden || !el.shopDialog.hidden) return;
    if (e.target.closest('.overlay, input')) return; // e.g. Esc that just closed a dialog
    if (/^[0-9]$/.test(e.key)) typePractice(e.key);
    else if (e.key === 'Backspace') typePractice('back');
    else if (e.key === 'Escape') typePractice('clear');
    else if (e.key === 'Enter') typePractice('check');
    else return;
    e.preventDefault();
  });

  // ---------------------------------------------------------------- invites

  // Settings an invite can set from the "Make an invite" form (select id = invite-<key>).
  const INVITE_FORM_SETTINGS = ['difficulty', 'placeMode', 'answerTime', 'diceMode', 'autoRoll', 'fitRolls', 'cpuSteps'];
  const INVITE_LABELS = {
    difficulty: { easy: 'Easy (6-sided dice)', medium: 'Medium (8-sided dice)', hard: 'Hard (12-sided dice)' },
    placeMode: { draw: 'You draw each rectangle', click: 'Click to place rectangles', auto: 'Rectangles are placed for you' },
    diceMode: { virtual: null, real: 'Roll real dice and tap what you got' },
    cpuSteps: { show: null, instant: 'CPU plays instantly' },
    autoRoll: { manual: null, auto: 'Dice roll by themselves' },
    fitRolls: { end: null, always: 'Every roll fits on the board', never: 'Original rules: a roll may not fit, and you pass' },
  };

  // Players from the main-menu setup, in invite form.
  function invitePlayersFromSetup() {
    if (setup.mode === 'single') return [{ n: el.singleName.value.trim(), c: false }];
    saveNameInputs();
    return setup.names.slice(0, setup.count).map((name, i) => ({ n: setup.types[i] === 'cpu' ? '' : name.trim(), c: setup.types[i] === 'cpu' }));
  }

  function invitePlayerNames(inv) {
    let cpu = 0;
    return inv.p.map((p, i) => (p.c ? `CPU ${++cpu}` : p.n || DEFAULT_NAMES[i]));
  }

  function describeInvite(inv) {
    const s = { ...DEFAULT_SETTINGS, ...inv.s };
    const lines = [
      inv.m === 'single' ? 'You vs the CPU' : `Players: ${invitePlayerNames(inv).join(', ')}`,
      `Board: ${inv.b}×${inv.b}`,
      INVITE_LABELS.difficulty[s.difficulty],
      INVITE_LABELS.placeMode[s.placeMode],
    ];
    if (s.answerTime !== '0') lines.push(`${s.answerTime} seconds to answer each question`);
    for (const key of ['diceMode', 'autoRoll', 'fitRolls', 'cpuSteps']) if (INVITE_LABELS[key][s[key]]) lines.push(INVITE_LABELS[key][s[key]]);
    if (inv.r !== undefined) lines.push('Same dice rolls as everyone else with this invite');
    return lines;
  }

  function openInviteMaker() {
    const names = invitePlayersFromSetup();
    el.invitePlayers.textContent =
      setup.mode === 'single'
        ? `Single player: ${names[0].n || 'You'} vs the CPU`
        : `Multiplayer: ${invitePlayerNames({ p: names }).join(', ')}`;
    el.inviteCodeError.hidden = true;
    el.inviteResult.hidden = true;
    el.inviteMake.hidden = false;
    el.inviteMake.querySelector('.dialog').scrollTop = 0;
    el.inviteCodeInput.focus();
  }

  function closeInviteMaker() {
    el.inviteMake.hidden = true;
  }

  function buildInvite() {
    const board = el.inviteBoard.value === 'custom' ? clampCustom(el.inviteCustom.value) : Number(el.inviteBoard.value);
    const s = {};
    for (const key of INVITE_FORM_SETTINGS) {
      const value = $(`invite-${key}`).value;
      if (value !== String(DEFAULT_SETTINGS[key])) s[key] = value; // only what differs, to keep links short
    }
    const inv = { v: Invite.VERSION, m: setup.mode, b: board, p: invitePlayersFromSetup(), s };
    if (el.inviteNote.value.trim()) inv.t = el.inviteNote.value.trim();
    if (el.inviteSeed.checked) inv.r = Invite.newSeed();
    return Invite.validate(inv);
  }

  let madeInvite = null;

  el.inviteCreate.addEventListener('click', () => {
    madeInvite = buildInvite();
    if (!madeInvite) return;
    const token = Invite.encode(madeInvite);
    el.inviteCode.value = token;
    el.inviteLink.value = `${location.href.split('#')[0]}#invite=${token}`;
    const local = location.protocol === 'file:';
    el.inviteLocalWarning.hidden = !local;
    el.inviteQrWrap.hidden = local; // a file:// link can't be opened from another device
    if (!local) drawQr(el.inviteQr, el.inviteLink.value);
    el.inviteResult.hidden = false;
    el.inviteResult.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  // Black-on-white QR code, 8px per module with the standard 4-module quiet zone.
  function drawQr(canvas, text) {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const modules = qr.getModuleCount();
    const cell = 8;
    const quiet = 4;
    const size = (modules + quiet * 2) * cell;
    canvas.width = canvas.height = size;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, size, size);
    g.fillStyle = '#000000';
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (qr.isDark(r, c)) g.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
      }
    }
  }

  el.inviteQrSave.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = el.inviteQr.toDataURL('image/png');
    a.download = 'blockout-invite.png';
    a.click();
  });

  // A printable hand-out: QR code, the note and what the game will be.
  el.inviteQrPrint.addEventListener('click', () => {
    if (!madeInvite) return;
    const win = window.open('', '_blank');
    if (!win) return toast('⚠️ Could not open the print page', 'Allow pop-ups for this page, or use Save QR image.');
    const doc = win.document;
    doc.title = 'Blockout invite';
    const style = doc.createElement('style');
    style.textContent =
      'body{font-family:system-ui,sans-serif;text-align:center;padding:32px;color:#2b2a33}' +
      'img{width:320px;height:320px;image-rendering:pixelated}' +
      '.note{font-size:1.4rem;font-weight:800;margin:16px auto;max-width:480px}' +
      'ul{display:inline-block;text-align:left;line-height:1.6}';
    doc.head.append(style);
    const add = (tag, text, cls) => {
      const node = doc.createElement(tag);
      if (text) node.textContent = text;
      if (cls) node.className = cls;
      doc.body.append(node);
      return node;
    };
    add('h1', 'Blockout');
    if (madeInvite.t) add('p', `“${madeInvite.t}”`, 'note');
    const img = add('img');
    img.src = el.inviteQr.toDataURL('image/png');
    img.alt = 'QR code for the Blockout invite';
    add('p', 'Scan with a phone or tablet camera to start the game.');
    const list = add('ul');
    for (const line of describeInvite(madeInvite)) {
      const li = doc.createElement('li');
      li.textContent = line;
      list.append(li);
    }
    img.onload = () => win.print();
  });

  el.inviteBoard.addEventListener('change', () => {
    el.inviteCustomField.hidden = el.inviteBoard.value !== 'custom';
  });

  el.inviteMake.addEventListener('click', async (e) => {
    if (e.target === el.inviteMake) return closeInviteMaker();
    const copy = e.target.closest('[data-copy]');
    if (!copy) return;
    const field = $(copy.dataset.copy);
    try {
      await navigator.clipboard.writeText(field.value);
    } catch (_) {
      field.select();
      document.execCommand('copy'); // older browsers / file:// pages
    }
    copy.textContent = 'Copied!';
    setTimeout(() => (copy.textContent = 'Copy'), 1500);
  });

  el.inviteCodeOpen.addEventListener('click', () => {
    const token = Invite.tokenFrom(el.inviteCodeInput.value);
    const inv = token && Invite.decode(token);
    el.inviteCodeError.hidden = Boolean(inv);
    if (!inv) return;
    closeInviteMaker();
    showInvite(inv);
  });
  el.inviteCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.inviteCodeOpen.click();
  });
  el.inviteTry.addEventListener('click', () => {
    if (!madeInvite) return;
    closeInviteMaker();
    showInvite(madeInvite);
  });
  el.inviteBtn.addEventListener('click', openInviteMaker);
  el.inviteDone.addEventListener('click', closeInviteMaker);
  el.inviteMake.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeInviteMaker();
  });

  // ---- a child opens an invite

  let openedInvite = null;

  function showInvite(inv) {
    openedInvite = inv;
    el.inviteOpenNote.hidden = !inv.t;
    el.inviteOpenNote.textContent = inv.t ? `“${inv.t}”` : '';
    el.inviteOpenSummary.innerHTML = '';
    for (const line of describeInvite(inv)) el.inviteOpenSummary.append(make('li', null, line));
    el.inviteOpenNameField.hidden = inv.m !== 'single';
    el.inviteOpenName.value = inv.m === 'single' ? inv.p[0].n || el.singleName.value.trim() || '' : '';
    for (const d of document.querySelectorAll('.overlay')) if (d !== el.inviteOpen) d.hidden = true;
    el.inviteOpen.hidden = false;
    el.inviteStart.focus();
  }

  function clearInviteFromUrl() {
    if (location.hash.includes('invite=')) history.replaceState(null, '', location.pathname + location.search);
  }

  el.inviteStart.addEventListener('click', () => {
    const inv = openedInvite;
    if (!inv) return;
    el.inviteOpen.hidden = true;
    clearInviteFromUrl();
    const names = invitePlayerNames(inv);
    const players =
      inv.m === 'single'
        ? [
            { name: el.inviteOpenName.value.trim() || 'You', cpu: false },
            { name: 'CPU', cpu: true },
          ]
        : inv.p.map((p, i) => ({ name: names[i], cpu: p.c }));
    startGame(players, inv.b, inv.m, inv);
  });
  el.inviteCancel.addEventListener('click', () => {
    el.inviteOpen.hidden = true;
    clearInviteFromUrl();
  });

  // Links look like index.html#invite=CODE
  function checkUrlForInvite() {
    const token = Invite.tokenFrom(location.hash);
    if (!token) return;
    const inv = Invite.decode(token);
    if (inv) showInvite(inv);
    else {
      clearInviteFromUrl();
      toast('⚠️ That invite link is broken', 'Ask for a new one, or paste the code in 🔗 Invite.');
    }
  }
  window.addEventListener('hashchange', checkUrlForInvite);

  // ---------------------------------------------------------------- daily check-in

  renderWallet();
  {
    const visit = Progress.checkIn(progress);
    if (visit) {
      const streak = visit.streak > 1 ? ` · ${visit.streak} days in a row 🔥` : '';
      toast(`☀️ Daily check-in: +${visit.bonus} points`, `Welcome back!${streak}`);
      celebrate(Progress.awardAchievements(progress, { event: 'checkin', streak: visit.streak }));
      saveProgress();
    }
  }
  checkUrlForInvite();

  // ---------------------------------------------------------------- input

  el.rollBtn.addEventListener('click', humanRoll);
  el.useDiceBtn.addEventListener('click', useRealDice);
  el.continueBtn.addEventListener('click', pressContinue);
  el.detailsBtn.addEventListener('click', () => setDetailsOpen(el.stats.hidden));

  function setDetailsOpen(open) {
    el.stats.hidden = !open;
    el.detailsBtn.replaceChildren(icon('chart-column'), open ? ' Hide details' : ' Show details');
    el.detailsBtn.setAttribute('aria-expanded', String(open));
  }
  // One button per face; 8- and 12-sided dice get numbered faces.
  function buildDicePicks(sides) {
    el.diePicks.forEach((row, i) => {
      row.innerHTML = '';
      for (let v = 1; v <= sides; v++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'die mini';
        btn.dataset.value = v;
        row.append(btn);
        renderDie(btn, v, sides);
        btn.setAttribute('aria-label', `Die ${i + 1}: ${v}`);
      }
    });
  }

  el.diePicks.forEach((row, i) => {
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) pickDie(i, Number(btn.dataset.value));
    });
  });
  el.rotateBtn.addEventListener('click', rotate);
  el.helpBtn.addEventListener('click', helpCount);
  el.keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) typeKey(btn.dataset.key);
  });

  function rotate() {
    if (!game || game.phase !== 'place' || game.placeMode !== 'click' || Core.mustUseCorner(game.board)) return;
    game.rotated = !game.rotated;
    render();
  }

  document.addEventListener('keydown', (e) => {
    if (!game || el.gameScreen.hidden || !el.gameOver.hidden) return;
    if (!el.settingsDialog.hidden || !el.shopDialog.hidden) return; // a dialog is on top of the game
    if (e.target.closest('.overlay, input')) return; // e.g. Esc that just closed a dialog
    if (continueResolve && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      pressContinue();
    } else if (game.phase === 'answer') {
      if (/^[0-9]$/.test(e.key)) typeKey(e.key);
      else if (e.key === 'Backspace') typeKey('back');
      else if (e.key === 'Escape') typeKey('clear');
      else if (e.key === 'Enter') typeKey('check');
      else return;
      e.preventDefault();
    } else if (game.phase === 'roll' && game.diceMode === 'real' && !currentPlayer().cpu) {
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= game.sides) typeDie(Number(e.key));
      else if (e.key === 'Backspace') clearLastDie();
      else if (e.key === 'Enter') useRealDice();
      else return;
      e.preventDefault();
    } else if ((e.key === ' ' || e.key === 'Enter') && game.phase === 'roll') {
      e.preventDefault();
      humanRoll();
    } else if (e.key === 'r' || e.key === 'R') {
      rotate();
    }
  });

  // Cell under the pointer; null when outside the board unless clamp is set.
  function cellFromEvent(e, clamp = false) {
    const rect = el.canvas.getBoundingClientRect();
    const cell = rect.width / game.size;
    let c = Math.floor((e.clientX - rect.left) / cell);
    let r = Math.floor((e.clientY - rect.top) / cell);
    if (clamp) {
      c = Math.max(0, Math.min(c, game.size - 1));
      r = Math.max(0, Math.min(r, game.size - 1));
    } else if (c < 0 || r < 0 || c >= game.size || r >= game.size) {
      return null;
    }
    return { c, r };
  }

  // Top-left corner of the rectangle being previewed, centred on the pointer
  // and clamped inside the board.
  function previewOrigin(hover, w, h) {
    if (Core.mustUseCorner(game.board)) return { x: 0, y: 0 };
    const clamp = (v, max) => Math.max(0, Math.min(v, max));
    return {
      x: clamp(hover.c - Math.floor((w - 1) / 2), game.size - w),
      y: clamp(hover.r - Math.floor((h - 1) / 2), game.size - h),
    };
  }

  function humanPreview() {
    if (!game || game.phase !== 'place' || game.placeMode !== 'click' || !game.hover) return null;
    const [w, h] = currentDims();
    const { x, y } = previewOrigin(game.hover, w, h);
    return { x, y, w, h, valid: Core.isValidPlacement(game.board, x, y, w, h) };
  }

  // ---- draw mode: drag out the rectangle corner to corner

  function dragRect() {
    const { c0, r0, c1, r1 } = game.drag;
    return { x: Math.min(c0, c1), y: Math.min(r0, r1), w: Math.abs(c1 - c0) + 1, h: Math.abs(r1 - r0) + 1 };
  }

  // How the rectangle being drawn compares to the roll.
  function judgeDrawn({ x, y, w, h }) {
    const [a, b] = game.dice;
    const rightSize = (w === a && h === b) || (w === b && h === a);
    const fits = Core.fits(game.board, x, y, w, h);
    const corner = !Core.mustUseCorner(game.board) || (x === 0 && y === 0);
    return { rightSize, fits, corner, ok: rightSize && fits && corner };
  }

  function finishDrag() {
    const r = dragRect();
    game.drag = null;
    const [a, b] = game.dice;
    const verdict = judgeDrawn(r);
    if (verdict.ok) {
      startAnswer(placeRect(r.x, r.y, r.w, r.h));
      return;
    }
    let msg;
    if (!verdict.rightSize) {
      msg = `That's ${r.w} by ${r.h}, but you rolled ${a} and ${b}. Try again!`;
    } else if (!verdict.fits) {
      msg = 'Right size, but it bumps into another rectangle. Try a different spot!';
    } else {
      msg = 'Right size! But the first rectangle has to start in the top-left corner.';
    }
    setMsg(msg);
    el.turnMsg.classList.add('oops');
    render();
  }

  el.canvas.addEventListener('pointerdown', (e) => {
    if (!game || game.phase !== 'place' || game.placeMode !== 'draw') return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    e.preventDefault();
    el.canvas.setPointerCapture(e.pointerId);
    game.drag = { c0: cell.c, r0: cell.r, c1: cell.c, r1: cell.r };
    setMsg(placeInstructions());
    render();
  });

  el.canvas.addEventListener('pointerup', (e) => {
    if (!game || !game.drag || game.phase !== 'place') return;
    const cell = cellFromEvent(e, true);
    game.drag.c1 = cell.c;
    game.drag.r1 = cell.r;
    finishDrag();
  });

  el.canvas.addEventListener('pointercancel', () => {
    if (!game || !game.drag) return;
    game.drag = null;
    render();
  });

  el.canvas.addEventListener('pointermove', (e) => {
    if (!game || game.phase !== 'place') return;
    if (game.drag) {
      const cell = cellFromEvent(e, true);
      if (cell.c === game.drag.c1 && cell.r === game.drag.r1) return;
      game.drag.c1 = cell.c;
      game.drag.r1 = cell.r;
      render();
      return;
    }
    if (e.pointerType === 'touch') return;
    game.hover = cellFromEvent(e);
    render();
  });

  el.canvas.addEventListener('pointerleave', (e) => {
    if (!game || e.pointerType === 'touch') return;
    game.hover = null;
    render();
  });

  // ---- click mode
  // Mouse: click places. Touch: first tap previews, tapping inside the preview places.
  el.canvas.addEventListener('pointerdown', (e) => {
    if (!game || game.phase !== 'place' || game.placeMode !== 'click') return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    if (e.pointerType === 'touch') {
      const prev = humanPreview();
      const inside =
        prev && cell.c >= prev.x && cell.c < prev.x + prev.w && cell.r >= prev.y && cell.r < prev.y + prev.h;
      if (!inside || !prev.valid) {
        game.hover = cell;
        render();
        return;
      }
    } else {
      game.hover = cell;
    }
    const p = humanPreview();
    if (p && p.valid) startAnswer(placeRect(p.x, p.y, p.w, p.h));
    else render();
  });

  el.menuBtn.addEventListener('click', () => {
    if (game && game.phase !== 'over' && !confirm('Leave this game and go back to the menu?')) return;
    toMenu();
  });
  el.toMenuBtn.addEventListener('click', toMenu);
  el.againBtn.addEventListener('click', () => {
    startGame(
      game.players.map(({ name, cpu }) => ({ name, cpu })),
      game.size,
      game.mode,
      game.invite
    );
  });

  function toMenu() {
    cancelContinue();
    stopTimer();
    gameId++;
    game = null;
    el.gameOver.hidden = true;
    el.gameScreen.hidden = true;
    el.startScreen.hidden = false;
  }

  // ---------------------------------------------------------------- rendering

  function setMsg(text) {
    el.turnMsg.textContent = text;
    el.turnMsg.classList.remove('oops');
  }

  // Pips for a normal d6; 8- and 12-sided dice show the number.
  function renderDie(die, value, sides = game ? game.sides : 6) {
    die.innerHTML = '';
    die.classList.toggle('blank', !value);
    die.classList.toggle('numbered', Boolean(value) && sides > 6);
    die.setAttribute('aria-label', value ? `Die showing ${value}` : 'Die not rolled');
    if (!value) return;
    if (sides > 6) {
      const num = document.createElement('span');
      num.className = 'die-num';
      num.textContent = value;
      die.append(num);
      return;
    }
    const on = PIPS[value];
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('span');
      if (on.includes(i)) cell.className = 'pip';
      die.append(cell);
    }
  }

  function render() {
    if (!game) return;
    const p = currentPlayer();
    el.turnPanel.style.setProperty('--turn-color', p.color);
    el.turnLabel.textContent =
      game.phase === 'over' ? 'Game over' : game.mode === 'single' && !p.cpu ? 'Your turn' : `${p.name}'s turn`;
    el.rollBtn.disabled = game.phase !== 'roll';
    const realDice = game.diceMode === 'real';
    el.rollBtn.hidden = p.cpu || realDice || !['roll', 'rolling'].includes(game.phase);
    el.diceEntry.hidden = p.cpu || !realDice || game.phase !== 'roll';
    const dims = currentDims();
    el.rotateBtn.hidden = !(
      game.phase === 'place' &&
      game.placeMode === 'click' &&
      dims &&
      dims[0] !== dims[1] &&
      !Core.mustUseCorner(game.board)
    );
    el.progress.hidden = !game.showProgress;
    if (game.showProgress) renderProgress();
    el.canvas.style.cursor = game.phase === 'place' ? 'crosshair' : 'default';
    renderScores();
    drawBoard();
  }

  // "Board: 24 of 400 filled", with a bar split into each player's colour.
  function renderProgress() {
    const total = game.size * game.size;
    const filled = total - Core.emptyCount(game.board);
    el.progressText.innerHTML =
      `<span class="long">Board: ${filled} of ${total} filled</span>` +
      `<span class="short">${filled} / ${total} filled</span>`;
    el.progressBar.setAttribute('aria-valuemin', '0');
    el.progressBar.setAttribute('aria-valuemax', String(total));
    el.progressBar.setAttribute('aria-valuenow', String(filled));
    const perPlayer = game.players.map(() => 0);
    for (const rect of game.board.rects) perPlayer[rect.player] += rect.area;
    // Reuse the segments so their widths animate as the board fills.
    if (el.progressBar.children.length !== game.players.length) {
      el.progressBar.innerHTML = '';
      for (let i = 0; i < game.players.length; i++) el.progressBar.append(document.createElement('span'));
    }
    game.players.forEach((p, i) => {
      const seg = el.progressBar.children[i];
      seg.style.width = `${(perPlayer[i] / total) * 100}%`;
      seg.style.background = p.color;
    });
  }

  function renderScores() {
    el.scores.innerHTML = '';
    game.players.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'score-card' + (i === game.current && game.phase !== 'over' ? ' active' : '');
      card.style.setProperty('--c', p.color);

      const head = document.createElement('div');
      head.className = 'score-head';
      const name = document.createElement('span');
      name.className = 'score-name';
      name.textContent = p.name;
      const pts = document.createElement('span');
      pts.className = 'score-pts';
      pts.textContent = p.score;
      head.append(name, pts);
      card.append(head);

      if (p.log.length) {
        const log = document.createElement('ul');
        log.className = 'score-log';
        for (const entry of p.log) {
          const li = document.createElement('li');
          if (entry.pass) {
            li.className = 'pass';
            li.textContent = `${entry.a}×${entry.b} pass`;
          } else if (entry.timeout) {
            li.className = 'timeout';
            li.textContent = `${entry.a}×${entry.b} ⏰`;
          } else {
            li.textContent = `${entry.a}×${entry.b}=${entry.area}${entry.bonus ? ` +${entry.bonus}` : ''}`;
            if (entry.star) li.className = 'star';
          }
          log.append(li);
        }
        card.append(log);
      }
      el.scores.append(card);
    });
  }

  let cssSize = 0;

  function resizeBoard() {
    if (!game) return;
    const wrapStyle = getComputedStyle(el.boardWrap);
    const pad = parseFloat(wrapStyle.paddingLeft) + parseFloat(wrapStyle.paddingRight);
    const available = el.boardWrap.clientWidth - pad;
    const narrow = window.innerWidth <= 820;
    // Leave room for the header, and on phones for the dice panel below the board.
    const maxByHeight = window.innerHeight - (narrow ? 300 : 110);
    cssSize = Math.max(200, Math.floor(Math.min(available, maxByHeight, 760)));
    const dpr = window.devicePixelRatio || 1;
    el.canvas.style.width = el.canvas.style.height = `${cssSize}px`;
    el.canvas.width = el.canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBoard();
  }
  window.addEventListener('resize', resizeBoard);

  // Board colours come from the CSS theme, so the canvas follows light/dark mode.
  let pal = {};
  function readPalette() {
    const css = getComputedStyle(document.documentElement);
    const v = (name) => css.getPropertyValue(name).trim();
    pal = {
      bg: v('--board-bg'),
      grid: v('--board-grid'),
      hint: v('--board-hint'),
      edge: v('--board-edge'),
      fade: v('--board-fade'),
      wrong: v('--board-wrong'),
      bad: v('--bad'),
      tagBg: v('--invert-bg'),
      tagInk: v('--invert-ink'),
    };
  }

  function drawBoard() {
    if (!game || !cssSize) return;
    readPalette();
    const n = game.size;
    const cell = cssSize / n;
    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, cssSize, cssSize);

    // grid
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const v = Math.round(i * cell) + 0.5;
      ctx.moveTo(v, 0);
      ctx.lineTo(v, cssSize);
      ctx.moveTo(0, v);
      ctx.lineTo(cssSize, v);
    }
    ctx.stroke();

    if (Core.mustUseCorner(game.board)) {
      ctx.fillStyle = pal.hint;
      ctx.font = `700 ${Math.max(8, cell * 0.2)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ['Start', 'here'].forEach((t, i) => ctx.fillText(t, 4, 4 + i * cell * 0.24));
    }

    for (const rect of game.board.rects) {
      drawRect(rect, game.players[rect.player].color, cell, rect === game.lastRect);
    }

    const preview = game.cpuPreview ? { ...game.cpuPreview, valid: true } : humanPreview();
    if (preview) drawPreview(preview, currentPlayer().color, cell);
    if (game.phase === 'place' && game.placeMode === 'draw') {
      if (game.drag) drawDragging(dragRect(), currentPlayer().color, cell);
      else if (game.hover) drawHoverCell(game.hover, currentPlayer().color, cell);
    }

    ctx.strokeStyle = pal.edge;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, cssSize - 2, cssSize - 2);
  }

  function drawRect(rect, color, cell, highlight) {
    const x = rect.x * cell;
    const y = rect.y * cell;
    const w = rect.w * cell;
    const h = rect.h * cell;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.82;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = shade(color, -0.35);
    ctx.lineWidth = highlight ? 3.5 : 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    if (game.counting && game.counting.rect === rect) drawCounting(game.counting, color, cell);
    else drawLabel(rect, x, y, w, h, cell);
  }

  // Skip counting: rows (or columns) already counted stay bright and show the
  // running total; the rest are faded out.
  function drawCounting({ rect, byRows, shown }, color, cell) {
    const stripes = byRows ? rect.h : rect.w;
    const group = byRows ? rect.w : rect.h;
    for (let i = 0; i < stripes; i++) {
      const sx = (rect.x + (byRows ? 0 : i)) * cell;
      const sy = (rect.y + (byRows ? i : 0)) * cell;
      const sw = (byRows ? rect.w : 1) * cell;
      const sh = (byRows ? 1 : rect.h) * cell;
      if (i >= shown) {
        ctx.fillStyle = pal.fade;
        ctx.fillRect(sx, sy, sw, sh);
        continue;
      }
      ctx.strokeStyle = shade(color, -0.45);
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 2, sy + 2, sw - 4, sh - 4);
      const size = Math.max(10, Math.min(cell * 0.55, 24));
      ctx.font = `900 ${size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = shade(color, -0.5);
      ctx.fillStyle = '#ffffff';
      const text = String((i + 1) * group);
      ctx.strokeText(text, sx + sw / 2, sy + sh / 2);
      ctx.fillText(text, sx + sw / 2, sy + sh / 2);
    }
  }

  function drawLabel(rect, x, y, w, h, cell) {
    const size = Math.max(9, Math.min(cell * 0.5, 22));
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = x + w / 2;
    const cy = y + h / 2;
    if (!rect.solved) {
      ctx.font = `900 ${Math.max(12, Math.min(cell * 0.9, 36))}px system-ui, sans-serif`;
      ctx.fillText('?', cx, cy);
      return;
    }
    const full = `${rect.a}×${rect.b}=${rect.area}`;
    if (ctx.measureText(full).width <= w - 8) {
      ctx.fillText(full, cx, cy);
    } else if (h > w && ctx.measureText(full).width <= h - 8) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(full, 0, 0);
      ctx.restore();
    } else if (ctx.measureText(String(rect.area)).width <= w - 4) {
      ctx.fillText(String(rect.area), cx, cy);
    }
  }

  // The rectangle a human is dragging out, labelled with its current size.
  // Player colour when it matches the roll and fits, grey when the size is
  // wrong, red when it overlaps.
  function drawDragging(r, color, cell) {
    const verdict = judgeDrawn(r);
    const tint = !verdict.fits ? pal.bad : verdict.ok ? color : pal.wrong;
    const x = r.x * cell;
    const y = r.y * cell;
    const w = r.w * cell;
    const h = r.h * cell;
    ctx.fillStyle = tint;
    ctx.globalAlpha = verdict.ok ? 0.55 : 0.3;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = shade(tint, -0.3);
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

    const label = `${r.w} × ${r.h}${verdict.ok ? ' ✓' : ''}`;
    const size = Math.max(12, Math.min(cell * 0.6, 24));
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(label).width + 12;
    const th = size + 8;
    // Tag just above the rectangle (or inside the top if there's no room).
    const tx = Math.max(2, Math.min(x + w / 2 - tw / 2, cssSize - tw - 2));
    const ty = y - th - 4 >= 0 ? y - th - 4 : y + 4;
    ctx.fillStyle = pal.tagBg;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(tx, ty, tw, th, 6);
    else ctx.rect(tx, ty, tw, th);
    ctx.fill();
    ctx.fillStyle = pal.tagInk;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, tx + tw / 2, ty + th / 2 + 1);
  }

  function drawHoverCell({ c, r }, color, cell) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
  }

  function drawPreview(p, color, cell) {
    const x = p.x * cell;
    const y = p.y * cell;
    const w = p.w * cell;
    const h = p.h * cell;
    ctx.fillStyle = p.valid ? color : pal.bad;
    ctx.globalAlpha = p.valid ? 0.35 : 0.22;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = p.valid ? shade(color, -0.3) : pal.bad;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.setLineDash([]);
    if (!p.valid) {
      ctx.fillStyle = pal.bad;
      ctx.font = `800 ${Math.max(10, Math.min(cell * 0.5, 20))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✕', x + w / 2, y + h / 2);
    }
  }

  // Darken (negative amount) or lighten a #rrggbb colour.
  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (v) => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount);
    const r = mix((n >> 16) & 255);
    const g = mix((n >> 8) & 255);
    const b = mix(n & 255);
    return `rgb(${r}, ${g}, ${b})`;
  }
})();
