(function () {
  'use strict';

  const Core = window.BlockoutCore;
  const Progress = window.BlockoutProgress;
  const Invite = window.BlockoutInvite;
  const Cosmetics = window.BlockoutCosmetics;
  const Auth = window.BlockoutAuth; // sign-in (js/auth.js); guests play without it
  const seededRandom = Invite.seededRandom;

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
    // Times-table grid cells: 'icon' (✓ ~ !) or 'time' (best time), per status
    timesMastered: 'icon',
    timesLearning: 'icon',
    timesPractice: 'icon',
    theme: 'auto', // 'auto' follows the device; 'light' or 'dark' forces one (free, not in the shop)
  };
  // Board sizes other than the small one are bought in the shop.
  // Only the smallest board is free; every other size is bought in the shop.
  const BOARD_UNLOCK = { 6: null, 8: 'board8', 10: 'board10', 12: 'board12', 16: 'board16', 20: 'board20', 24: 'board24', custom: 'boardCustom' };
  // A signed-in player's save is kept apart from the guest one (see js/auth.js)
  const PROGRESS_KEY = Auth ? Auth.progressKey() : 'blockout.progress';
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
    multiKind: $('multi-kind'),
    localSetup: $('local-setup'),
    classroomSetup: $('classroom-setup'),
    classJoinOpen: $('class-join-open'),
    classHostOpen: $('class-host-open'),
    classOffline: $('class-offline'),
    classJoin: $('class-join'),
    classJoinForm: $('class-join-form'),
    classCodeInput: $('class-code-input'),
    classNameInput: $('class-name-input'),
    classJoinError: $('class-join-error'),
    classJoinBtn: $('class-join-btn'),
    classJoinCancel: $('class-join-cancel'),
    classWait: $('class-wait'),
    classWaitName: $('class-wait-name'),
    classWaitText: $('class-wait-text'),
    classLeaveBtn: $('class-leave-btn'),
    hostSetup: $('class-host-setup'),
    hostSetupTitle: $('class-host-title'),
    hostSize: $('host-size'),
    hostTypeField: $('host-type-field'),
    hostType: $('host-type'),
    hostTypeHelp: $('host-type-help'),
    hostDifficulty: $('host-difficulty'),
    hostRounds: $('host-rounds'),
    hostError: $('host-error'),
    hostCancel: $('host-cancel'),
    hostCreate: $('host-create'),
    hostScreen: $('class-host-screen'),
    hostCodeSmall: $('host-code-small'),
    hostLobby: $('host-lobby'),
    hostQr: $('host-qr'),
    hostUrl: $('host-url'),
    hostCode: $('host-code'),
    hostSettingsGrid: $('host-settings-grid'),
    hostQuick: $('host-quick'),
    hostStartBtn: $('host-start-btn'),
    hostLocalHelp: $('host-local-help'),
    hostPlay: $('host-play'),
    hostRound: $('host-round'),
    hostDieA: $('host-die-a'),
    hostDieB: $('host-die-b'),
    hostRollText: $('host-roll-text'),
    hostDoneFill: $('host-done-fill'),
    hostDoneText: $('host-done-text'),
    hostNextBtn: $('host-next-btn'),
    hostEndBtn: $('host-end-btn'),
    hostAuto: $('host-auto'),
    hostEnded: $('host-ended'),
    hostPodium: $('host-podium'),
    hostReport: $('host-report'),
    hostHardest: $('host-hardest'),
    hostAgainBtn: $('host-again-btn'),
    hostClose2Btn: $('host-close2-btn'),
    hostCloseBtn: $('host-close-btn'),
    hostRosterTitle: $('host-roster-title'),
    hostRoster: $('host-roster'),
    hostPairs: $('host-pairs'),
    hostMatching: $('host-matching'),
    hostOdd: $('host-odd'),
    hostPairsHelp: $('host-pairs-help'),
    hostPairList: $('host-pair-list'),
    hostTeacherDevice: $('host-teacher-device'),
    hostTeacherQr: $('host-teacher-qr'),
    hostTeacherUrl: $('host-teacher-url'),
    hostTeacherStatus: $('host-teacher-status'),
    hostMyGameBtn: $('host-mygame-btn'),
    hostCopyLink: $('host-copy-link'),
    hostCopyMsg: $('host-copy-msg'),
    hostShareBtn: $('host-share-btn'),
    hostCopyTeacher: $('host-copy-teacher'),
    hostMatches: $('host-matches'),
    hostDice: $('host-dice'),
    hostProgress: $('host-progress'),
    hostAutoLabel: $('host-auto-label'),
    hostMatchResults: $('host-match-results'),
    hostTournament: $('host-tournament'),
    hostTournamentFinal: $('host-tournament-final'),
    resultTournament: $('result-tournament'),
    singleName: $('single-name'),
    playerCount: $('player-count'),
    nameInputs: $('name-inputs'),
    namesError: $('names-error'),
    boardSize: $('board-size'),
    gameLevel: $('game-level'),
    gameLevelHelp: $('game-level-help'),
    gameTimerField: $('game-timer-field'),
    gameTimer: $('game-timer'),
    gameTimerHelp: $('game-timer-help'),
    boardSizeHelp: $('board-size-help'),
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
    wardrobeBtn: $('wardrobe-btn'),
    unlockDialog: $('unlock'),
    unlockTitle: $('unlock-title'),
    unlockPrice: $('unlock-price'),
    unlockMessage: $('unlock-message'),
    unlockYes: $('unlock-yes'),
    unlockNo: $('unlock-no'),
    wardrobeDialog: $('wardrobe'),
    wardrobeBody: $('wardrobe-body'),
    wardrobeDone: $('wardrobe-done'),
    stickersBtn: $('stickers-btn'),
    stickersDialog: $('stickers'),
    stickersBody: $('stickers-body'),
    stickersTrade: $('stickers-trade'),
    stickersDone: $('stickers-done'),
    gameSettingsBtn: $('game-settings-btn'),
    practiceSetup: $('practice-setup'),
    practiceName: $('practice-name'),
    practiceCount: $('practice-count'),
    practiceCountHelp: $('practice-count-help'),
    practiceTimerField: $('practice-timer-field'),
    practiceTimer: $('practice-timer'),
    practiceTimerHelp: $('practice-timer-help'),
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
    streakBadge: $('streak-badge'),
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
  // names start empty: multiplayer players type their own ("Player N" is only a placeholder)
  // multiKind: 'local' (one screen) or 'classroom' (not built yet)
  // level/timer: single player's Learn / Expert and Expert's answer timer (seconds)
  const setup = { mode: 'single', multiKind: 'local', level: 'learn', timer: 0, count: 2, size: 6, names: ['', '', '', ''], types: ['human', 'human', 'human', 'human'] };

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
    if (Auth) Auth.queueProgress(progress); // signed in: send it to the account too
    renderWallet();
  }

  // Swap in another save (the account's, after signing in) and redraw what shows it.
  function replaceProgress(next) {
    for (const key of Object.keys(progress)) delete progress[key];
    Object.assign(progress, Progress.normalize(next));
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (_) {
      // not fatal
    }
    refreshUnlocks();
    renderWallet();
  }

  function renderWallet() {
    el.walletAmount.textContent = formatPoints(progress.wallet);
    updateMenuBadges();
  }

  // iPhone-style red count badges on the main-menu Shop, Wardrobe and Stickers buttons.
  function updateMenuBadges() {
    if (!Cosmetics || !el.shopBtn) return;
    setBadge(el.shopBtn, 'Shop', affordableCount(), 'you can unlock');
    setBadge(el.wardrobeBtn, 'Wardrobe', newWardrobe() + affordableLooks(), 'new or ready to unlock');
    setBadge(el.stickersBtn, 'Stickers', newStickers() + spareStickers(), 'new or spare');
  }

  function setBadge(btn, label, count, what) {
    let badge = btn.querySelector('.badge');
    if (!count) {
      if (badge) badge.remove();
      btn.removeAttribute('aria-label');
      return;
    }
    if (!badge) {
      badge = make('span', 'badge');
      badge.setAttribute('aria-hidden', 'true');
      btn.append(badge);
    }
    badge.textContent = count > 99 ? '99+' : String(count);
    btn.setAttribute('aria-label', `${label}, ${count} ${what}`);
  }

  // 10000 → "10,000" (in the reader's locale).
  function formatPoints(n) {
    return Number(n).toLocaleString();
  }

  // Show newly earned achievements as toasts; returns them for the caller.
  // Every big (non-minor) achievement drops one random sticker.
  function grantStickers(earned) {
    return earned.filter((a) => !a.minor).map(() => Cosmetics.dropSticker(progress));
  }

  function celebrate(earned) {
    queueAchievements(earned);
    for (const { sticker, isNew } of grantStickers(earned)) {
      toast(`🎁 ${isNew ? 'New sticker' : 'Sticker'}: ${sticker.emoji}`, isNew ? `${sticker.rarity} · added to your album` : `a spare you can swap for points`);
    }
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
  // Confetti doesn't need retina sharpness; 1× keeps the full-screen canvas small and fast.
  const CONFETTI_DPR = 1;
  // Emoji pieces are bigger than paper, so half as many look just as full (and draw faster).
  const pieceCount = (n) => Math.round(n * (confettiGlyphs() ? 0.5 : 1));

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
    const dpr = CONFETTI_DPR;
    const w = Math.round(innerWidth * dpr);
    const h = Math.round(innerHeight * dpr);
    if (confetti.canvas.width !== w || confetti.canvas.height !== h) {
      confetti.canvas.width = w;
      confetti.canvas.height = h;
    }
    confetti.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  // Wardrobe confetti: paper, or emoji pieces (stars, hearts, snowflakes, coins…)
  const CONFETTI_GLYPHS = {
    stars: ['⭐', '🌟'],
    hearts: ['💖', '💗', '❤️'],
    snow: ['❄️'],
    coins: ['🪙'],
    blossom: ['🌸', '🌼'],
  };
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function confettiGlyphs() {
    const kind = settings.cosmetics.confetti;
    return kind === 'emoji' ? look('confetti').glyphs : CONFETTI_GLYPHS[kind] || null;
  }

  // Emoji drawn once per glyph and size into a small canvas, then stamped with
  // drawImage. Drawing colour emoji as text every frame is very slow.
  const glyphSprites = new Map();
  function glyphSprite(glyph, size) {
    const px = Math.round(size);
    const key = `${glyph}|${px}`;
    let sprite = glyphSprites.get(key);
    if (!sprite) {
      const dpr = CONFETTI_DPR;
      const cssSize = Math.ceil(px * 2.6);
      sprite = document.createElement('canvas');
      sprite.width = sprite.height = Math.ceil(cssSize * dpr);
      sprite.cssSize = cssSize;
      const s = sprite.getContext('2d');
      s.scale(dpr, dpr);
      s.font = `${px * 2}px serif`;
      s.textAlign = 'center';
      s.textBaseline = 'middle';
      s.fillText(glyph, cssSize / 2, cssSize / 2 + px * 0.1);
      glyphSprites.set(key, sprite);
    }
    return sprite;
  }

  // extra: { glyphs, gravity, size } for special effects (balloons, trophies, fireworks)
  function addPiece(x, y, angleDeg, speed, maxAge = 200, extra = {}) {
    const angle = (angleDeg * Math.PI) / 180;
    const glyphs = extra.glyphs !== undefined ? extra.glyphs : confettiGlyphs();
    confetti.parts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: extra.size || (glyphs ? 9 + Math.random() * 6 : 5 + Math.random() * 6),
      spin: Math.random() * Math.PI,
      vspin: (Math.random() - 0.5) * (glyphs ? 0.12 : 0.4),
      wobble: Math.random() * Math.PI * 2,
      color: extra.color || CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      round: Math.random() < 0.3,
      glyph: glyphs ? pick(glyphs) : null,
      gravity: extra.gravity !== undefined ? extra.gravity : 0.28,
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
    const count = pieceCount(Math.min(90 + 40 * (strength - 1), 200));
    for (let i = 0; i < count; i++) {
      addPiece(box.left + Math.random() * box.width, box.top + box.height * 0.3, -90 + (Math.random() - 0.35) * 110, 7 + Math.random() * 9);
    }
    startConfetti();
  }

  // Winning: the Wardrobe's win celebration.
  function celebrateWin() {
    if (!confettiReady()) return;
    const w = innerWidth;
    const h = innerHeight;
    const style = settings.cosmetics.win;
    if (style === 'fireworks') {
      for (let burst = 0; burst < 6; burst++) {
        setTimeout(() => {
          if (!confettiReady()) return;
          const x = w * (0.15 + Math.random() * 0.7);
          const y = h * (0.15 + Math.random() * 0.35);
          const color = pick(CONFETTI_COLORS);
          for (let i = 0; i < 70; i++) {
            addPiece(x, y, (i / 70) * 360, 3 + Math.random() * 5, 90 + Math.random() * 40, { glyphs: null, gravity: 0.1, color, size: 4 });
          }
          startConfetti();
        }, burst * 380);
      }
    } else if (style === 'balloons') {
      for (let i = 0; i < 36; i++) {
        addPiece(Math.random() * w, h + 20 + Math.random() * h * 0.6, -90 + (Math.random() - 0.5) * 16, 2 + Math.random() * 2.5, 520, { glyphs: ['🎈'], gravity: -0.01, size: 14 + Math.random() * 8 });
      }
      startConfetti();
    } else if (style === 'trophies') {
      for (let i = 0; i < 90; i++) {
        addPiece(Math.random() * w, -20 - Math.random() * h * 0.9, 90 + (Math.random() - 0.5) * 20, 1 + Math.random() * 3, 420, { glyphs: ['🏆', '🪙', '⭐', '🥇'] });
      }
      startConfetti();
    } else {
      confettiFullScreen(3);
    }
  }

  // Full screen: a shower from the top across the whole width, plus a cannon
  // in each bottom corner firing towards the middle.
  function confettiFullScreen(strength = 1) {
    if (!confettiReady()) return;
    const w = innerWidth;
    const h = innerHeight;
    const shower = pieceCount(Math.min(Math.round((w / 6) * (0.8 + 0.3 * strength)), 420));
    for (let i = 0; i < shower; i++) {
      // start above the screen at different heights so it keeps raining for a while
      addPiece(Math.random() * w, -20 - Math.random() * h * 0.9, 90 + (Math.random() - 0.5) * 30, 1 + Math.random() * 3, 420);
    }
    const perCannon = pieceCount(Math.min(70 + 30 * (strength - 1), 150));
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
    confetti.parts = confetti.parts.filter((p) => (p.y < innerHeight + 20 || p.vy < 0) && p.y > -120 && p.age < p.maxAge);
    const dpr = CONFETTI_DPR;
    const air = Math.pow(0.985, dt);
    for (const p of confetti.parts) {
      p.age += dt;
      p.vy += p.gravity * dt; // gravity (balloons have a little negative gravity)
      p.vx *= air;
      p.vy = Math.min(p.vy, 6); // paper falls slowly
      p.wobble += 0.15 * dt;
      p.x += (p.vx + Math.sin(p.wobble) * 0.8) * dt;
      p.y += p.vy * dt;
      p.spin += p.vspin * dt;
      // Position each piece with one setTransform (no save/restore per piece: much faster)
      const cos = Math.cos(p.spin) * dpr;
      const sin = Math.sin(p.spin) * dpr;
      g.globalAlpha = Math.min(1, (p.maxAge - p.age) / 40);
      if (p.glyph) {
        // emoji: stamp a pre-drawn image instead of drawing the text every frame
        const sprite = glyphSprite(p.glyph, p.size);
        g.setTransform(cos, sin, -sin, cos, p.x * dpr, p.y * dpr);
        g.drawImage(sprite, -sprite.cssSize / 2, -sprite.cssSize / 2, sprite.cssSize, sprite.cssSize);
      } else if (p.round) {
        g.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        g.fill();
      } else {
        const flip = Math.cos(p.wobble); // flipping paper
        g.setTransform(cos, sin, -sin * flip, cos * flip, p.x * dpr, p.y * dpr);
        g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
    }
    g.globalAlpha = 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (confetti.parts.length) confetti.frame = requestAnimationFrame(stepConfetti);
    else {
      confetti.frame = null;
      g.clearRect(0, 0, innerWidth, innerHeight);
    }
  }

  const BONUS_TOASTS = { first: '✨', speedy: '⚡', streak: '🔥', timer: '⏱️' };

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Small pop-up message in the corner that disappears by itself.
  // ---- achievements: a big banner at the bottom, one at a time, with confetti

  const achievementQueue = [];
  let bannerUp = false;
  const BANNER_MS = 3200;
  const MINOR_BANNER_MS = 1800;

  // Minor ones in a row (fact speed badges) share one smaller banner.
  function queueAchievements(list) {
    for (const a of list) {
      const last = achievementQueue[achievementQueue.length - 1];
      if (a.minor && last && last.minor) {
        last.count++;
        last.reward += a.reward;
        continue;
      }
      achievementQueue.push({ icon: a.icon, name: a.name, reward: a.reward, minor: Boolean(a.minor), count: 1 });
    }
    if (!bannerUp) showNextAchievement();
  }

  function showNextAchievement() {
    const a = achievementQueue.shift();
    if (!a) {
      bannerUp = false;
      return;
    }
    bannerUp = true;
    const box = make('div', 'achievement-banner' + (a.minor ? ' minor' : ''));
    box.setAttribute('role', 'status');
    const text = make('div', 'banner-text');
    text.append(
      make('span', 'banner-kicker', a.minor ? 'Badge earned' : 'Achievement earned'),
      make('strong', 'banner-name', a.count > 1 ? `+${a.count} fact speed badges` : a.name),
      make('span', 'banner-reward', `+${formatPoints(a.reward)} points`)
    );
    box.append(make('span', 'banner-icon', a.icon), text);
    document.body.append(box);
    requestAnimationFrame(() => box.classList.add('show'));
    setTimeout(() => confettiFrom(box), 250);
    let gone = false;
    const next = () => {
      if (gone) return;
      gone = true;
      box.classList.remove('show');
      box.classList.add('leaving');
      setTimeout(() => {
        box.remove();
        showNextAchievement();
      }, 350);
    };
    // (clicks go straight through the banner, so it never blocks the buttons under it)
    setTimeout(next, a.minor ? MINOR_BANNER_MS : BANNER_MS);
  }

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

  // ---------------------------------------------------------------- wardrobe (cosmetics)

  // settings.cosmetics: { dice, pips, roll, colors, pattern, board, place, confetti,
  // win, streak, cpu, avatar, keypad, title }. Only owned choices are kept.
  function loadCosmetics() {
    const chosen = { ...(settings.cosmetics || {}) };
    if (settings.diceStyle === 'golden' && !chosen.dice) chosen.dice = 'golden'; // old Dice style setting
    delete settings.diceStyle;
    const clean = Cosmetics.sanitize(chosen, (id) => Progress.isUnlocked(progress, id));
    clean.title = Cosmetics.title(chosen.title).earned(progress) ? Cosmetics.title(chosen.title).id : 'none';
    settings.cosmetics = clean;
  }
  loadCosmetics();

  const look = (categoryId) => Cosmetics.option(categoryId, settings.cosmetics[categoryId]) || Cosmetics.category(categoryId).options[0];

  function chooseCosmetic(categoryId, optionId) {
    settings.cosmetics[categoryId] = optionId;
    // bought or worn while the Wardrobe is open: you've seen it, so it isn't "new"
    if (!el.wardrobeDialog.hidden) markSeen('wardrobe', [`${categoryId}:${optionId}`]);
    saveSettings();
    applyCosmeticsToPage();
    if (!el.wardrobeDialog.hidden) renderWardrobe();
  }

  // Keypads get a skin class; dice get theirs when drawn; the board is redrawn.
  function applyCosmeticsToPage(redraw = true) {
    for (const pad of document.querySelectorAll('.keypad')) {
      pad.className = `keypad skin-${settings.cosmetics.keypad}`;
    }
    if (redraw) drawBoard();
  }

  // ---- Wardrobe dialog

  function chipPreview(cat, opt) {
    const box = make('span', 'chip-preview');
    if (cat.id === 'dice') {
      const die = make('span', `die mini skin-${opt.id}`);
      renderDie(die, 5, 6, opt.id);
      box.append(die);
    } else if (cat.id === 'colors') {
      for (const c of opt.colors) {
        const sw = make('span', 'swatch');
        sw.style.background = c;
        box.append(sw);
      }
    } else if (cat.id === 'pattern' || cat.id === 'board') {
      box.append(make('span', `tile-preview ${cat.id}-${opt.id}`));
    } else if (cat.id === 'keypad') {
      box.append(make('span', `key-preview skin-${opt.id}`, '7'));
    } else if (cat.id === 'roll' || cat.id === 'place') {
      box.append(make('span', `motion-preview ${cat.id}-${opt.id}`, cat.id === 'roll' ? '🎲' : '▦'));
    } else if (cat.id === 'cpu') {
      box.append(make('span', 'emoji-preview', opt.avatar));
    } else {
      box.append(make('span', 'emoji-preview', opt.preview || ''));
    }
    return box;
  }

  let wardrobeFilter = null; // Set of 'category:option' keys (new or unlockable when picked), or null for all
  let wardrobeNew = []; // keys that were new when the Wardrobe opened

  function wardrobeAvailable() {
    const unlockable = Progress.SHOP.filter((i) => i.cosmetic && Progress.canBuy(progress, i.id).ok).map((i) => i.cosmetic.join(':'));
    return new Set([...wardrobeNew, ...unlockable]);
  }

  function renderWardrobe() {
    const body = el.wardrobeBody;
    body.innerHTML = '';
    renderWalletBar('wardrobe', !!wardrobeFilter);
    const now = new Date();
    const shows = (key) => !wardrobeFilter || wardrobeFilter.has(key);
    if (wardrobeFilter && !wardrobeFilter.size) body.append(make('p', 'filter-note', 'Nothing new to wear yet. Keep playing to earn points!'));
    for (const cat of Cosmetics.CATEGORIES) {
      if (!cat.options.some((o) => shows(`${cat.id}:${o.id}`))) continue;
      body.append(make('h3', 'stats-heading', cat.name));
      const row = make('div', 'wardrobe-row');
      for (const opt of cat.options) {
        if (!shows(`${cat.id}:${opt.id}`)) continue;
        const item = Cosmetics.itemFor(cat.id, opt.id);
        const owned = Progress.isUnlocked(progress, item);
        const chip = make('button', 'wardrobe-chip' + (settings.cosmetics[cat.id] === opt.id ? ' selected' : '') + (owned ? '' : ' locked'));
        chip.type = 'button';
        chip.dataset.cat = cat.id;
        chip.dataset.opt = opt.id;
        chip.append(chipPreview(cat, opt), make('span', 'chip-name', opt.name));
        if (!owned) {
          const check = Progress.canBuy(progress, item, now);
          chip.dataset.unlock = item;
          const tag = make('span', 'lock-badge');
          if (Progress.isHidden(progress, item)) {
            // further down this category's chain: a placeholder, like the main menu
            chip.classList.add('skeleton');
            chip.setAttribute('aria-label', 'Locked: unlock the one before it first');
            tag.append(icon('lock'));
          } else if (check.reason === 'season') tag.append(icon('lock'), ` ${Progress.shopItem(item).seasonLabel}`);
          else {
            chip.dataset.cost = opt.price;
            tag.append(icon('lock'), ` ${formatPoints(opt.price)}`);
          }
          chip.append(tag);
        }
        row.append(chip);
      }
      body.append(row);
    }
    // Titles are earned, not bought
    if (!Cosmetics.TITLES.some((t) => shows(`title:${t.id}`))) return;
    body.append(make('h3', 'stats-heading', 'Your title'));
    const row = make('div', 'wardrobe-row');
    for (const t of Cosmetics.TITLES) {
      if (!shows(`title:${t.id}`)) continue;
      const got = t.earned(progress);
      const chip = make('button', 'wardrobe-chip title-chip' + (settings.cosmetics.title === t.id ? ' selected' : '') + (got ? '' : ' locked'));
      chip.type = 'button';
      chip.dataset.cat = 'title';
      chip.dataset.opt = t.id;
      chip.disabled = !got;
      chip.append(make('span', 'chip-name', t.name));
      if (!got) chip.append(make('span', 'chip-need', t.need));
      row.append(chip);
    }
    body.append(row);
  }

  // onlyNew: from a results screen, show just the looks and titles you haven't seen yet
  function openWardrobe(onlyNew = false) {
    loadCosmetics();
    const keys = wardrobeKeys();
    wardrobeNew = keys.filter((k) => !seenList('wardrobe').includes(k));
    wardrobeFilter = onlyNew === true ? wardrobeAvailable() : null;
    renderWardrobe();
    markSeen('wardrobe', keys);
    el.wardrobeDialog.hidden = false;
    el.wardrobeDialog.querySelector('.dialog').scrollTop = 0;
    el.wardrobeDone.focus({ preventScroll: true });
  }

  el.wardrobeBtn.addEventListener('click', () => openWardrobe());
  function closeWardrobe() {
    el.wardrobeDialog.hidden = true;
    refreshOpenNudges();
    updateMenuBadges();
  }
  el.wardrobeDone.addEventListener('click', closeWardrobe);
  el.wardrobeDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeWardrobe();
  });
  el.wardrobeDialog.addEventListener('click', (e) => {
    if (e.target === el.wardrobeDialog) return closeWardrobe();
    const view = e.target.closest('#wardrobe-view [data-view]');
    if (view) {
      wardrobeFilter = view.dataset.view === 'available' ? wardrobeAvailable() : null;
      renderWardrobe();
      el.wardrobeDialog.querySelector('.dialog').scrollTop = 0;
      return;
    }
    const chip = e.target.closest('.wardrobe-chip');
    if (!chip || chip.disabled) return;
    if (chip.dataset.unlock) return confirmUnlock(chip.dataset.unlock, chip);
    chooseCosmetic(chip.dataset.cat, chip.dataset.opt);
  });

  // ---- Sticker album

  let stickersFilter = null; // Set of sticker ids (new or with spares when opened), or null

  function renderStickers() {
    const body = el.stickersBody;
    body.innerHTML = '';
    const have = progress.stickers || {};
    const got = Cosmetics.STICKERS.filter((st) => have[st.id]).length;
    body.append(make('p', 'stats-summary', `${got} of ${Cosmetics.STICKERS.length} collected`));
    if (stickersFilter) {
      body.append(filterNote('Showing your new stickers and spares', () => {
        stickersFilter = null;
        renderStickers();
      }));
    }
    for (const rarity of ['common', 'rare', 'epic']) {
      const list = Cosmetics.STICKERS.filter((x) => x.rarity === rarity && (!stickersFilter || stickersFilter.has(x.id)));
      if (!list.length) continue;
      body.append(make('h3', 'stats-heading', { common: 'Common', rare: 'Rare', epic: 'Epic' }[rarity]));
      const grid = make('div', 'sticker-grid');
      for (const st of list) {
        const n = have[st.id] || 0;
        const slot = make('div', `sticker ${rarity}${n ? '' : ' missing'}`);
        slot.append(make('span', 'sticker-emoji', n ? st.emoji : '?'));
        if (n > 1) slot.append(make('span', 'sticker-count', `×${n}`));
        slot.title = n ? `${st.id} (${rarity})` : 'Not found yet';
        grid.append(slot);
      }
      body.append(grid);
    }
    const value = Cosmetics.duplicateValue(progress);
    el.stickersTrade.disabled = value === 0;
    el.stickersTrade.textContent = value ? `Swap spares for 🪙 ${formatPoints(value)}` : 'No spares to swap';
  }

  // onlyNew: from a results screen, show just the new stickers and the ones with spares
  function openStickers(onlyNew = false) {
    const have = progress.stickers || {};
    stickersFilter =
      onlyNew === true ? new Set(Object.keys(have).filter((id) => !seenList('stickers').includes(id) || have[id] > 1)) : null;
    renderStickers();
    markSeen('stickers', Object.keys(have));
    el.stickersDialog.hidden = false;
    el.stickersDone.focus();
  }
  function closeStickers() {
    el.stickersDialog.hidden = true;
    refreshOpenNudges();
    updateMenuBadges();
  }
  el.stickersBtn.addEventListener('click', () => openStickers());
  el.stickersDone.addEventListener('click', closeStickers);
  el.stickersDialog.addEventListener('click', (e) => {
    if (e.target === el.stickersDialog) closeStickers();
  });
  el.stickersDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeStickers();
  });
  el.stickersTrade.addEventListener('click', () => {
    const points = Cosmetics.tradeDuplicates(progress);
    if (!points) return;
    toast('🔁 Spares swapped', `+${formatPoints(points)} points`);
    saveProgress();
    renderStickers();
  });

  // Shop item that unlocks a setting's choice; null when it's free (the default).
  function unlockFor(key, value) {
    if (key === 'theme' || String(value) === String(DEFAULT_SETTINGS[key])) return null;
    if (key === 'difficulty') return `difficulty.${value}`;
    if (key === 'cpuSteps') return 'cpuInstant';
    if (key === 'answerTime') return `answerTime${value}`; // each length is its own unlock
    if (key === 'placeMode') return value === 'auto' ? 'placeAuto' : 'placeMode'; // Click, then Auto
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
  // Locked options show their price; ones further down a chain (see SHOP
  // `requires`) are a blurred placeholder with just a lock, so only the next
  // step shows what it is and what it costs.
  function setLockBadge(btn, itemId) {
    const locked = !Progress.isUnlocked(progress, itemId);
    const hidden = locked && Progress.isHidden(progress, itemId);
    btn.classList.toggle('locked', locked);
    btn.classList.toggle('skeleton', hidden);
    btn.dataset.unlock = locked ? itemId : '';
    if (hidden) btn.setAttribute('aria-label', 'Locked: unlock the one before it first');
    else if (btn.getAttribute('aria-label') === 'Locked: unlock the one before it first') btn.removeAttribute('aria-label');
    let badge = btn.querySelector('.lock-badge');
    if (locked && !badge) {
      badge = document.createElement('span');
      badge.className = 'lock-badge';
      btn.append(badge);
    }
    if (badge && !locked) badge.remove();
    if (badge && locked) badge.replaceChildren(icon('lock'), hidden ? '' : ` ${formatPoints(Progress.shopItem(itemId).price)}`);
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
    if (btn.dataset.unlock) return confirmUnlock(btn.dataset.unlock, btn);
    const key = btn.parentElement.dataset.setting;
    const raw = btn.dataset.value;
    settings[key] = raw === 'true' ? true : raw === 'false' ? false : raw;
    saveSettings();
    syncSettingsUI();
    updatePracticePreview();
    renderGameLevel();
    renderBoardHint();
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
    applyCosmeticsToPage(false);
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
    if (!game || game.invite || game.fixed) return;
    applySettingsNow();
    game.placeMode = settings.placeMode;
    game.diceMode = settings.diceMode;
    game.autoRoll = settings.autoRoll === 'auto';
    game.cpuInstant = settings.cpuSteps === 'instant';
    // single player uses its own Expert timer; the Settings timer is for Home multiplayer
    game.answerTime = game.mode === 'single' ? game.levelTimer : Number(settings.answerTime) || 0;
    game.fitMode = settings.fitRolls;
  }
  el.settingsDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') el.settingsDone.click();
  });
  syncSettingsUI();

  function selectIn(container, button) {
    container.querySelectorAll('button').forEach((b) => b.classList.toggle('selected', b === button));
  }

  // Single player and Classroom are free; Local multiplayer, 3/4 players and
  // Practice are shop unlocks.
  const MODE_UNLOCK = { single: null, multi: null, practice: 'practice' };
  const PLAYERS_UNLOCK = { 2: null, 3: 'players3', 4: 'players4' };

  function syncModeLocks() {
    el.modeCards.forEach((card) => setLockBadge(card, MODE_UNLOCK[card.dataset.mode]));
    for (const btn of el.playerCount.querySelectorAll('button')) setLockBadge(btn, PLAYERS_UNLOCK[btn.dataset.count]);
    setLockBadge(el.multiKind.querySelector('[data-kind="local"]'), 'multiplayer');
  }
  syncModeLocks();

  el.modeCards.forEach((card) => {
    card.addEventListener('click', () => {
      if (card.dataset.unlock) return confirmUnlock(card.dataset.unlock, card);
      setup.mode = card.dataset.mode;
      // Local multiplayer is bought in the shop; until then Multiplayer opens on Classroom
      if (setup.mode === 'multi' && !Progress.isUnlocked(progress, 'multiplayer')) selectMultiKind('classroom');
      el.modeCards.forEach((c) => {
        c.classList.toggle('selected', c === card);
        c.setAttribute('aria-checked', String(c === card));
      });
      renderSetupSections();
      updatePracticePreview();
    });
  });

  // Which parts of the setup form show for the chosen mode (and, for
  // multiplayer, Local or Classroom).
  function renderSetupSections() {
    const classroom = setup.mode === 'multi' && setup.multiKind === 'classroom';
    el.singleSetup.hidden = setup.mode !== 'single';
    el.multiSetup.hidden = setup.mode !== 'multi';
    el.practiceSetup.hidden = setup.mode !== 'practice';
    if (setup.mode !== 'practice') renderBoardHint();
    el.localSetup.hidden = setup.multiKind !== 'local';
    el.classroomSetup.hidden = setup.multiKind !== 'classroom';
    el.boardSizeField.hidden = setup.mode === 'practice' || classroom; // practice has no board
    el.difficultyField.hidden = classroom; // the teacher picks these when hosting
    el.startBtn.hidden = classroom; // Join / Host instead
    el.startBtn.textContent = setup.mode === 'practice' ? 'Start practice' : 'Start game';
    if (classroom) checkClassroom();
  }

  function selectMultiKind(kind) {
    setup.multiKind = kind;
    for (const b of el.multiKind.querySelectorAll('[data-kind]')) {
      const on = b.dataset.kind === kind;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-checked', String(on));
    }
    renderSetupSections();
  }

  el.multiKind.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-kind]');
    if (!btn) return;
    if (btn.dataset.unlock) return confirmUnlock(btn.dataset.unlock, btn);
    selectMultiKind(btn.dataset.kind);
  });

  el.playerCount.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.unlock) return confirmUnlock(btn.dataset.unlock, btn);
    saveNameInputs();
    setup.count = Number(btn.dataset.count);
    selectIn(el.playerCount, btn);
    renderNameInputs();
  });

  const CUSTOM_MIN = 6;
  const CUSTOM_MAX = 30;

  function syncBoardLocks() {
    for (const btn of el.boardSize.querySelectorAll('button')) setLockBadge(btn, BOARD_UNLOCK[btn.dataset.size]);
    renderBoardHint();
    renderGameLevel(); // (difficulty or purchases change it too)
  }

  // ---- single player: Level (Learn / Expert) and Expert's timer, per difficulty, like Practice
  const GAME_EXPERT_BONUS = 2;
  const GAME_LEVEL_HELP = {
    learn: 'Learn: “Help me count” is there whenever you need it.',
    expert: 'Expert: no help counting, and bonus points are doubled!',
  };
  function renderGameLevel() {
    if (!el.gameLevel) return;
    const d = settings.difficulty;
    const expertId = Progress.gameExpertId(d);
    if (!Progress.isUnlocked(progress, expertId)) setup.level = 'learn';
    for (const btn of el.gameLevel.querySelectorAll('button')) {
      btn.classList.toggle('selected', btn.dataset.level === setup.level);
      setLockBadge(btn, btn.dataset.level === 'expert' ? expertId : null);
    }
    el.gameLevelHelp.textContent = GAME_LEVEL_HELP[setup.level];
    el.gameTimerField.hidden = setup.level !== 'expert';
    const timerId = (secs) => (Number(secs) ? Progress.gameTimerId(Number(secs), d) : null);
    if (!Progress.isUnlocked(progress, timerId(setup.timer))) setup.timer = 0;
    for (const btn of el.gameTimer.querySelectorAll('button')) {
      btn.classList.toggle('selected', Number(btn.dataset.secs) === setup.timer);
      setLockBadge(btn, timerId(btn.dataset.secs));
    }
    const top = (secs) => Progress.TIMER_BONUS_MAX[secs] * GAME_EXPERT_BONUS;
    el.gameTimerHelp.textContent = setup.timer
      ? `⏱️ Answer fast for a timer bonus of up to +${top(setup.timer)} a question: the quicker, the more. If time runs out, the rectangle comes off and scores nothing.`
      : `⏱️ A timer earns a bonus for quick answers: up to +${top(30)} a question with 30 s, +${top(10)} with 10 s, +${top(5)} with 5 s.`;
  }
  el.gameLevel.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.unlock) return confirmUnlock(btn.dataset.unlock, btn);
    setup.level = btn.dataset.level;
    renderGameLevel();
  });
  el.gameTimer.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.unlock) return confirmUnlock(btn.dataset.unlock, btn);
    setup.timer = Number(btn.dataset.secs);
    renderGameLevel();
  });

  // Under the board sizes: the finishing bonus for the chosen size
  function renderBoardHint() {
    if (!el.boardSizeHelp) return;
    // Legend rolls a teen (11–19), so it needs a board it fits on
    const fits = Core.fitsDifficulty(settings.difficulty, setup.size);
    if (setup.mode !== 'practice') el.startBtn.disabled = !fits;
    el.boardSizeHelp.classList.toggle('warn', !fits);
    if (!fits) {
      el.boardSizeHelp.textContent = `⚠️ ${Progress.DIFFICULTY_NAMES[settings.difficulty]} rolls numbers like 14 × 7, so it needs a board of 12×12 or bigger.`;
      return;
    }
    const bonus = Progress.boardFinishBonus(setup.size);
    if (settings.difficulty === 'legend' && setup.size < 19 && setup.mode !== 'practice') {
      el.boardSizeHelp.textContent = `Legend: half the rolls are teens like 14 × 7, the rest are Tricky facts. On ${setup.size}×${setup.size} the teens go up to ${setup.size}; bigger boards bring bigger teens (all the way to 19 on 20×20).`;
      return;
    }
    el.boardSizeHelp.textContent = bonus
      ? `🏁 Finish a game against the CPU on ${setup.size}×${setup.size} for +${bonus} bonus points.`
      : `🏁 Bigger boards earn a finishing bonus against the CPU: +${Progress.boardFinishBonus(8)} for 8×8, up to +${Progress.boardFinishBonus(24)} for 24×24.`;
  }
  syncBoardLocks();

  el.boardSize.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.unlock) return confirmUnlock(btn.dataset.unlock, btn);
    selectIn(el.boardSize, btn);
    const custom = btn.dataset.size === 'custom';
    el.customSize.hidden = !custom;
    setup.size = custom ? readCustomSize() : Number(btn.dataset.size);
    renderBoardHint();
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
    renderBoardHint();
  }

  el.customSizeInput.addEventListener('input', () => {
    if (el.customSizeInput.value !== '') setup.size = readCustomSize();
    renderBoardHint();
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
      swatch.style.background = look('colors').colors[i];
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 14;
      input.value = isCpu ? cpuName(i) : setup.names[i];
      input.placeholder = DEFAULT_NAMES[i];
      input.addEventListener('input', () => input.classList.remove('missing'));
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
    if (setup.mode === 'multi' && setup.multiKind === 'classroom') return; // not built yet
    if (setup.mode === 'practice') {
      const tables = practiceTableList();
      if (!tables.length) return;
      const expert = practiceLevel === 'expert';
      startPractice(el.practiceName.value.trim() || 'You', practiceRoundSize, tables, expert, expert ? practiceTimerSecs : 0);
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
      // every human player needs a real name
      const inputs = [...el.nameInputs.querySelectorAll('input')];
      const missing = inputs.filter((input, i) => setup.types[i] !== 'cpu' && !input.value.trim());
      inputs.forEach((input) => input.classList.toggle('missing', missing.includes(input)));
      el.namesError.hidden = !missing.length;
      if (missing.length) {
        missing[0].focus();
        return;
      }
      players = setup.names.slice(0, setup.count).map((name, i) =>
        setup.types[i] === 'cpu' ? { name: cpuName(i), cpu: true } : { name: name.trim(), cpu: false }
      );
    }
    startGame(players, setup.size, setup.mode);
  });

  // ---------------------------------------------------------------- game state

  let game = null;
  let gameId = 0; // bumped on every new game so pending timers from an old game do nothing

  // Wardrobe on players: the CPU character's name and avatar; in single player,
  // your avatar and title. "CPU 2" in multiplayer becomes e.g. "Owl 2".
  function wardrobeLook(p, mode) {
    if (p.cpu) {
      const ch = look('cpu');
      const name = p.name === 'CPU' ? ch.cpuName : p.name.replace(/^CPU\b/, ch.short);
      return { name, avatar: ch.avatar, hello: ch.hello };
    }
    if (mode === 'multi') return {};
    if (mode === 'pair' && !p.statsName) return {}; // your partner isn't wearing your Wardrobe
    const avatar = look('avatar');
    const t = Cosmetics.title(settings.cosmetics.title);
    return { avatar: avatar.id === 'none' ? '' : avatar.preview, title: t.id === 'none' ? '' : t.name };
  }

  // invite: a decoded invite, whose settings and dice seed apply to this game only.
  // extra: { cfg, classroom } for a class game: fixed settings, dice from the teacher.
  function startGame(playerDefs, size, mode, invite = null, extra = null) {
    cancelContinue();
    stopTimer();
    stopPracticeTimer();
    practice = null;
    el.practiceScreen.hidden = true;
    el.practiceDone.hidden = true;
    gameId++;
    const cfg = { ...settings, ...(invite ? invite.s : {}), ...(extra ? extra.cfg : {}) };
    const rng = invite && invite.r !== undefined ? seededRandom(invite.r) : Math.random;
    game = {
      invite,
      fixed: Boolean(extra), // settings don't change mid-game
      classroom: extra ? extra.classroom : null, // { session, game, round, reported, view }
      rng,
      cpuSpeed: cfg.cpuSpeed,
      cpuEnd: cfg.cpuEnd,
      showProgress: cfg.showProgress,
      id: gameId,
      size,
      mode, // 'single' (you vs the CPU), 'multi' (one screen) or 'class' (dice from the teacher)
      board: Core.createBoard(size, { firstInCorner: cfg.firstInCorner }),
      difficulty: cfg.difficulty,
      sides: Core.DIFFICULTY_SIDES[cfg.difficulty] || 6,
      cpuInstant: cfg.cpuSteps === 'instant',
      autoRoll: cfg.autoRoll === 'auto',
      fitMode: cfg.fitRolls,
      players: playerDefs.map((p, i) => ({
        ...p,
        ...wardrobeLook(p, mode),
        color: look('colors').colors[i],
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
      // 'virtual': the app rolls; 'real': players roll real dice and enter them
      // (not after Hard: those dice can't be rolled at the table)
      diceMode: Core.usesPairDice(cfg.difficulty) ? 'virtual' : cfg.diceMode,
      picked: [null, null], // real-dice values entered so far
      drag: null, // { c0, r0, c1, r1 } while a human is drawing
      pending: null, // human rectangle waiting for its points to be worked out
      counting: null, // { rect, byRows, shown, group } while skip-counting on the board
    };
    // Loaded to suit board and difficulty. After Hard, the dice deal chosen
    // pairs: Tricky skips the easy facts, Master leans on your weakest facts,
    // Legend deals a teen × a one-digit number.
    game.faces = Core.diceFaces(cfg.difficulty);
    game.diceBag = Core.usesPairDice(cfg.difficulty)
      ? Core.createPairDice(size, rng, cfg.difficulty, cfg.difficulty === 'master' ? weakFactWeight(playerDefs.find((p) => !p.cpu)) : null)
      : Core.createDice(size, rng, game.sides);
    // Single player's Level: Expert has no "Help me count", doubles bonus points,
    // and can have an answer timer (its own, not the Settings one)
    const levelled = mode === 'single' && !invite && !extra;
    game.expert = levelled && setup.level === 'expert';
    game.levelTimer = game.expert ? setup.timer : 0;
    if (levelled) game.answerTime = game.levelTimer;
    buildDicePicks(game.sides);
    el.resultTournament.hidden = true;
    const classroomGame = mode === 'class' || mode === 'pair';
    el.againBtn.hidden = classroomGame; // the teacher starts the next class game
    el.toMenuBtn.textContent = !classroomGame ? 'Main menu' : extra.classroom.session.host ? 'Back to the class' : 'Leave class';
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

  function resetTurn() {
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
  }

  function beginTurn() {
    applySettingsForTurn();
    const p = currentPlayer();
    game.turns++;
    resetTurn();
    if (game.mode === 'class') {
      game.phase = 'wait';
      setMsg(game.classroom.round ? 'Waiting for the next roll…' : 'Get ready! Waiting for the first roll…');
      render();
      return;
    }
    if (game.mode === 'pair') return pairTurnOrWait();
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

  // forced: the class game's roll, from the teacher
  async function rollDice(forced = null) {
    game.phase = 'rolling';
    render();
    const rollStyle = `roll-${settings.cosmetics.roll}`; // Wardrobe: wobble, tumble, bounce, sparkle
    el.dieA.classList.add('rolling', rollStyle);
    el.dieB.classList.add('rolling', rollStyle);
    const face = (list) => list[Math.floor(Math.random() * list.length)];
    for (let i = 0; i < 8; i++) {
      renderDie(el.dieA, face(game.faces.a));
      renderDie(el.dieB, face(game.faces.b));
      await waitInGame(55);
    }
    el.dieA.classList.remove('rolling', rollStyle);
    el.dieB.classList.remove('rolling', rollStyle);
    game.dice = forced ? [...forced] : Core.rollForBoard(game.board, game.diceBag, game.rng, game.fitMode);
    renderDie(el.dieA, game.dice[0]);
    renderDie(el.dieB, game.dice[1]);
    return game.dice;
  }

  async function humanRoll() {
    if (!game || game.phase !== 'roll' || currentPlayer().cpu || game.diceMode === 'real') return;
    if (game.mode === 'pair') return pairRoll(); // the server rolls for a pairs game
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
    const who = game.mode !== 'multi' && !p.cpu ? 'You pass' : `${p.name} passes`;
    setMsg(`No room for a ${a} × ${b} anywhere. ${who}.`);
    if (game.mode === 'class') reportClass({ kind: 'pass' }); // (pairs: the server passes for you)
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
    // Wardrobe placing effect (the player who placed it chose it; CPUs use yours too)
    rect.fx = settings.cosmetics.place !== 'none' ? settings.cosmetics.place : null;
    rect.placedAt = performance.now();
    if (rect.fx) animateBoard(PLACE_FX_MS + 50);
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
    showStreak(el.streakBadge, currentPlayer().streak);
    setKeypadEnabled(true);
    el.helpBtn.disabled = false;
    el.helpBtn.hidden = Boolean(game.expert); // Expert: no help counting
    render();
    startTimer();
    if (window.innerWidth <= 820) el.math.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setKeypadEnabled(on) {
    el.keypad.querySelectorAll('button').forEach((b) => (b.disabled = !on));
  }

  // Can more typing still change the outcome? No once it matches, overshoots,
  // or has as many digits as the answer.
  // "🔥 5 in a row"; with the Wardrobe's growing flames it gets bigger at 5, 10 and 20.
  function showStreak(node, n) {
    node.textContent = n >= 2 ? `🔥 ${n} in a row` : '';
    const level = n >= 20 ? 3 : n >= 10 ? 2 : n >= 5 ? 1 : 0;
    node.classList.toggle('flames', settings.cosmetics.streak === 'flames' && level > 0);
    node.dataset.level = level;
  }

  function answerDecided(entry, answer) {
    return entry !== '' && (Number(entry) >= answer || entry.length >= String(answer).length);
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
    // Submit by itself once the answer is decided: it's right, it's bigger than
    // the answer, or it has as many digits as the answer. Shorter entries wait
    // for ✓, since you might not be done typing.
    if (answerDecided(pend.entry, pend.rect.area)) checkAnswer();
  }

  async function checkAnswer() {
    const pend = game.pending;
    if (!pend || pend.entry === '') return;
    const { rect } = pend;
    if (Number(pend.entry) === rect.area) {
      // the timer bonus goes by how much time was left (not in class games: the server scores those)
      const timerLeft = timer && game.answerTime && game.mode !== 'class' && game.mode !== 'pair' ? { secs: game.answerTime, left: timer.remaining / timer.total } : null;
      stopTimer();
      const p = currentPlayer();
      const ms = performance.now() - pend.startedAt - pend.pausedMs;
      const firstTry = pend.attempts === 0;
      p.stats.times.push(ms);
      p.streak = firstTry ? p.streak + 1 : 0;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      const bonus = Progress.answerBonus({ firstTry, ms, streak: p.streak, timer: timerLeft });
      game.phase = 'busy';
      setKeypadEnabled(false);
      el.helpBtn.disabled = true;
      el.answerBox.className = 'answer-box right';
      el.mathFeedback.className = 'math-feedback good';
      const squares = `+${rect.area} ${rect.area === 1 ? 'square' : 'squares'}`;
      el.mathFeedback.textContent = firstTry ? `Correct! ${squares} 🎉` : `You got it! ${squares}`;
      // Each bonus pops up on its own, like an achievement.
      const mult = game.expert ? GAME_EXPERT_BONUS : 1; // Expert doubles bonus points
      for (const part of bonus.parts) toast(`${BONUS_TOASTS[part.label.split(' ')[0]]} ${capitalize(part.label)}`, `+${part.points * mult} bonus points${mult > 1 ? ' (×2 Expert)' : ''}`);
      awardPoints(rect, firstTry, bonus.total * mult);
      showStreak(el.streakBadge, p.streak);
      if (game.mode === 'class' || game.mode === 'pair') reportClass({ kind: 'placed', rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, firstTry, ms: Math.round(ms) });
      if (countsForStats()) {
        Progress.recordAnswer(progress, statsName(p), {
          a: rect.a,
          b: rect.b,
          firstTry,
          correct: true,
          wrongAnswers: pend.miss ? pend.miss.answers : [],
          ms,
        });
        const learned = Progress.learnedAfterHelp(progress, rect.a, rect.b, firstTry);
        celebrate(Progress.awardAchievements(progress, { event: 'answer', correct: true, firstTry, ms, streak: p.streak, a: rect.a, b: rect.b, facts: playerFacts(statsName(p)), size: unlockedTableSize(), learned }));
        saveProgress();
      }
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
    if (pend.attempts >= 2 && !pend.helped && !game.expert) {
      el.mathFeedback.textContent = "Let's count them together!";
      helpCount();
    }
  }

  // Legend: a teen times a one-digit number, split into tens and ones
  // (14 × 7 = 10 × 7 + 4 × 7). Null for anything else.
  function legendSplit(rect) {
    if (!game || game.difficulty !== 'legend') return null;
    const teen = Math.max(rect.a, rect.b);
    const other = Math.min(rect.a, rect.b);
    if (teen < 11) return null;
    const ones = teen - 10;
    return { teen, other, ones, tens: 10 * other, rest: ones * other };
  }

  async function helpCount() {
    const pend = game.pending;
    if (!pend || pend.helped || game.counting || game.expert) return; // Expert: no help
    pend.helped = true;
    currentPlayer().stats.helped++;
    if (countsForStats()) {
      Progress.noteHelp(progress, pend.rect.a, pend.rect.b);
      celebrate(Progress.awardAchievements(progress, { event: 'help' }));
      saveProgress();
    }
    el.helpBtn.disabled = true;
    const { rect } = pend;
    const split = legendSplit(rect);
    if (split) {
      // Too many to skip-count: split it, and leave the adding to the player
      el.countTrail.textContent =
        `Split ${split.teen} into 10 and ${split.ones}: 10 × ${split.other} = ${split.tens}, ` +
        `${split.ones} × ${split.other} = ${split.rest}. Now add them up!`;
      return;
    }
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
    const total = Progress.timerLength(progress, game.answerTime) * 1000; // (the bonus still follows answerTime)
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
    el.timerNum.textContent = timerText(left);
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
    if (game.mode === 'class' || game.mode === 'pair') reportClass({ kind: 'timeout' });
    if (countsForStats()) {
      Progress.recordAnswer(progress, statsName(p), { a: rect.a, b: rect.b, firstTry: false, correct: false, wrongAnswers: pend.miss.answers, timeout: true });
      saveProgress();
    }
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

  // "an 8", "an 11", "an 18", but "a 7"
  const article = (n) => (/^(8|11|18)$/.test(String(n)) || /^8\d$/.test(String(n)) ? 'an' : 'a');

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
    addStep(`I drew ${article(a)} <span class="num">${a}</span> by <span class="num">${b}</span> rectangle. How many squares is that?`);
    await waitInGame(cpuStep());
    const split = legendSplit(rect);
    if (split) {
      addStep(`Split <span class="num">${split.teen}</span> into 10 and <span class="num">${split.ones}</span>.`);
      await waitInGame(cpuStep());
      addStep(`10 × ${split.other} = <span class="num">${split.tens}</span> and ${split.ones} × ${split.other} = <span class="num">${split.rest}</span>.`);
      await waitInGame(cpuStep());
      addStep(`${split.tens} + ${split.rest} = <span class="num">${area}</span>.`);
      await waitInGame(cpuStep());
    } else if (a === 1 || b === 1) {
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
    if (game.mode === 'class' || game.mode === 'pair') return beginTurn(); // the server ends these games
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
    const hello = currentPlayer().hello ? `${currentPlayer().hello} ` : ''; // CPU character's greeting
    addStep(`${hello}I rolled ${article(a)} <span class="num">${a}</span> and ${article(b)} <span class="num">${b}</span>.`);
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
    if (countsForStats()) recordGame(new Set(winners.map((p) => p.index)));

    if (winners.length > 1) el.resultTitle.textContent = "It's a tie!";
    else if (isSingle) el.resultTitle.textContent = winners[0].cpu ? `${winners[0].name} wins!` : 'You win! 🎉';
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
      name.textContent = p.avatar ? `${p.avatar} ${p.name}` : p.name;
      if (p.title) name.append(make('span', 'player-title', p.title));
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
    refreshNudges('results');
    if (winners.length === 1 && !winners[0].cpu) celebrateWin();
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
    if (!countsForStats()) {
      // local multiplayer: points only, nothing permanent
      saveProgress();
      el.rewards.append(make('p', 'setting-help', 'Multiplayer games are just for fun: they don’t count towards Stats or achievements.'));
      return;
    }
    progress.counters.games++;
    // Finishing bonus for bigger boards (single player against the CPU)
    const boardBonus = game.mode === 'single' ? Progress.boardFinishBonus(game.size) : 0;
    if (boardBonus) {
      Progress.addPoints(progress, boardBonus);
      const an = [8, 11, 18].includes(game.size) ? 'an' : 'a'; // "an 8×8", "an 11×11", "an 18×18"
      toast(`🏁 Finished ${an} ${game.size}×${game.size} game!`, `+${boardBonus} bonus points`);
    }
    const humanWon = winners.length === 1 && !winners[0].cpu;
    // for class stats and homework ("beat the CPU on 8×8", "finish 5 games")
    Progress.noteActivity(progress, { kind: 'game', mode: game.mode, difficulty: game.difficulty, size: game.size, won: game.mode === 'single' && humanWon });
    if (humanWon && game.mode === 'single') {
      Progress.recordBoardWin(progress, game.size); // reveals the next board
      syncBoardLocks();
    }
    const asked = (p) => p.answered + p.stats.timeouts;
    const perfect = humans.some((p) => asked(p) >= 5 && p.firstTry === asked(p));
    const noHelp = humans.some((p) => asked(p) >= 5 && p.stats.helped === 0);
    const earned = Progress.awardAchievements(progress, {
      event: 'game',
      noHelp,
      games: progress.counters.games,
      wonVsCpu: game.mode === 'single' && humanWon,
      humanWon,
      full: empty === 0,
      perfect,
      difficulty: game.difficulty,
      bestScore: Math.max(...humans.map((p) => p.score)),
    });
    grantStickers(earned); // they show up behind the Stickers button
    saveProgress();
    showRewards(earned);
  }

  // End of a game: new achievements get their banners. Points and stickers go
  // in quietly: the Shop / Wardrobe / Stickers buttons below show what's new.
  function showRewards(earned) {
    queueAchievements(earned);
  }

  // Single-player and class games (and practice) count towards Stats and achievements.
  function countsForStats() {
    if (game && game.classroom && game.classroom.session.teacher) return false; // the teacher playing an odd one out
    return game && ['single', 'class', 'pair'].includes(game.mode);
  }

  // Whose times tables an answer counts towards. In a class game you play under
  // your first name, but it's still you on this device.
  function statsName(p) {
    return p.statsName || p.name;
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

  // size: a fixed size (a teacher or parent looking at a student), else what this player reached
  function renderFactGrid(name, facts, size = null) {
    const seenMax = Math.max(0, ...Object.keys(facts).flatMap((k) => k.split('×').map((n) => Number(n.trim()))));
    const unlocked = unlockedTableSize();
    const max = size || Math.max(6, seenMax > 8 ? 12 : seenMax > 6 ? 8 : 6, unlocked);
    const wrap = make('div', 'fact-grid-wrap');
    if (name) wrap.append(make('div', 'practice-name', name)); // no label for the default "You"
    const grid = make('div', 'fact-grid');
    grid.style.setProperty('--n', max + 1);
    // Mastery badge: a gold ★ on a line's header once the whole line is mastered (both orders)
    const head = (n) => {
      const done = Progress.lineReached(facts, n, max, 'mastered');
      const cell = make('span', 'fact-head' + (done ? ' line-mastered' : ''), done ? `★${n}` : String(n));
      if (done) cell.title = `Every ${n} times fact is mastered!`;
      return cell;
    };
    grid.append(make('span', 'fact-head', '×'));
    for (let c = 1; c <= max; c++) grid.append(head(c));
    for (let r = 1; r <= max; r++) {
      grid.append(head(r));
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
    const games = history.filter((g) => !g.kind);
    const rounds = history.filter((g) => g.kind === 'practice');
    const classes = history.filter((g) => g.kind === 'class' && !g.type);
    const pairGames = history.filter((g) => g.kind === 'class' && g.type === 'pairs');
    const tournaments = history.filter((g) => g.kind === 'class' && g.type === 'tournament');
    if (history.length) renderGameHistory(body, games, rounds, classes, pairGames, tournaments);

    // Lifetime times tables for everyone who has answered anything, in games or practice
    const names = new Map();
    for (const g of games) for (const p of g.players) if (!p.cpu) names.set(Progress.playerKey(p.name), p.name);
    for (const p of factPlayers) if (!names.has(Progress.playerKey(p.name))) names.set(Progress.playerKey(p.name), p.name);
    body.append(make('h3', 'stats-heading centered', 'Times Table'));
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

    if (games.length || classes.length || pairGames.length || tournaments.length) renderRecentGames(body, [...games, ...classes, ...pairGames, ...tournaments].sort((a, b) => a.at - b.at));
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

  // Tiles, then one row per game type (mode · board · difficulty), per practice
  // type and per classroom game type.
  function renderGameHistory(body, games, rounds, classes, pairGames, tournaments) {
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
    const played = games.length + classes.length + pairGames.length + tournaments.length; // class games are games too
    tiles.append(
      tile(`${played}${rounds.length ? ` + ${rounds.length}` : ''}`, rounds.length ? 'games + practice rounds' : 'games played'),
      tile(formatDuration([...games, ...rounds, ...classes, ...pairGames].reduce((s, g) => s + g.duration, 0)), 'time played'),
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

    if (classes.length) {
      const groups = new Map();
      for (const g of classes) {
        const key = `${g.size}|${g.difficulty}`;
        const row = groups.get(key) || { size: g.size, difficulty: g.difficulty, games: 0, bestRank: null, best: 0, asked: 0, firstTry: 0, times: [] };
        row.games++;
        if (!row.bestRank || g.rank < row.bestRank.rank) row.bestRank = g;
        row.best = Math.max(row.best, g.score);
        row.asked += g.answered + g.timeouts;
        row.firstTry += g.firstTry;
        row.times.push(...g.times);
        groups.set(key, row);
      }
      const rows = [...groups.values()]
        .sort((a, b) => a.size - b.size || DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty])
        .map((r) => ({
          title: 'Classroom',
          sub: `${r.size}×${r.size} · ${DIFFICULTY_NAMES[r.difficulty]}`,
          values: [r.games, `${ordinal(r.bestRank.rank)} of ${r.bestRank.of}`, r.best, percent(r.firstTry, r.asked), avgTime(r.times)],
        }));
      body.append(make('h3', 'stats-heading', 'Classroom'));
      body.append(statsTable(['', 'Games', 'Best place', 'Best score', 'Right 1st try', 'Avg answer'], rows));
    }

    if (pairGames.length) {
      const groups = new Map();
      for (const g of pairGames) {
        const key = `${g.size}|${g.difficulty}`;
        const row = groups.get(key) || { size: g.size, difficulty: g.difficulty, games: 0, wins: 0, best: 0, asked: 0, firstTry: 0, times: [] };
        row.games++;
        if (g.result === 'win') row.wins++;
        row.best = Math.max(row.best, g.score);
        row.asked += g.answered + g.timeouts;
        row.firstTry += g.firstTry;
        row.times.push(...g.times);
        groups.set(key, row);
      }
      const rows = [...groups.values()]
        .sort((a, b) => a.size - b.size || DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty])
        .map((r) => ({
          title: 'Pairs',
          sub: `${r.size}×${r.size} · ${DIFFICULTY_NAMES[r.difficulty]}`,
          values: [r.games, r.wins, r.best, percent(r.firstTry, r.asked), avgTime(r.times)],
        }));
      body.append(make('h3', 'stats-heading', 'Classroom: pairs'));
      body.append(statsTable(['', 'Games', 'Wins', 'Best score', 'Right 1st try', 'Avg answer'], rows));
    }

    if (tournaments.length) {
      const groups = new Map();
      for (const g of tournaments) {
        const row = groups.get(g.format) || { format: g.format, played: 0, titles: 0, best: null, wins: 0, losses: 0 };
        row.played++;
        if (g.place === 1) row.titles++;
        if (!row.best || g.place < row.best.place) row.best = g;
        row.wins += g.wins;
        row.losses += g.losses;
        groups.set(g.format, row);
      }
      const rows = [...groups.values()].map((r) => ({
        title: 'Tournament',
        sub: TOURNAMENT_NAMES[r.format] || r.format,
        values: [r.played, r.titles, `${ordinal(r.best.place)} of ${r.best.of}`, `${r.wins}–${r.losses}`],
      }));
      body.append(make('h3', 'stats-heading', 'Classroom: tournaments'));
      body.append(statsTable(['', 'Played', 'Titles', 'Best finish', 'Games W–L'], rows));
    }
  }

  function renderRecentGames(body, history) {
    body.append(make('h3', 'stats-heading', 'Recent games'));
    const recent = make('ol', 'recent');
    for (const g of history.slice(-10).reverse()) {
      const li = make('li');
      const when = new Date(g.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      if (g.kind === 'class' && g.type === 'tournament') {
        li.append(make('span', 'meta', `${when} · Class ${g.code} · ${TOURNAMENT_NAMES[g.format] || 'Tournament'}`));
        li.append(document.createTextNode(`${g.name} ${g.wins}–${g.losses} · `));
        li.append(make('span', 'winner', g.place === 1 ? '🏆 Champion' : `${ordinal(g.place)} of ${g.of} · 🏆 ${g.champion}`));
        recent.append(li);
        continue;
      }
      if (g.kind === 'class' && g.type === 'pairs') {
        li.append(make('span', 'meta', `${when} · Class ${g.code} pairs · ${g.size}×${g.size}`));
        li.append(document.createTextNode(`${g.name} ${g.score} – ${g.opponent} ${g.opponentScore} · `));
        li.append(make('span', 'winner', g.result === 'win' ? `🏆 ${g.name}` : g.result === 'tie' ? 'Tie' : `🏆 ${g.opponent}`));
        recent.append(li);
        continue;
      }
      if (g.kind === 'class') {
        li.append(make('span', 'meta', `${when} · Class ${g.code} · ${g.size}×${g.size}`));
        li.append(document.createTextNode(`${g.name} ${g.score} · `));
        li.append(make('span', 'winner', g.rank === 1 && g.of > 1 ? `🏆 1st of ${g.of}` : `${ordinal(g.rank)} of ${g.of}`));
        recent.append(li);
        continue;
      }
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
    season: (r) => `In the shop in ${r.when}`,
    points: (r) => `Need ${formatPoints(r.missing)} more`,
    requires: (r) => `Unlock ${Progress.shopItem(r.requires).name.split(':')[0]} first`,
    win: (r) => `Win a game on ${r.size}×${r.size} first`,
    master: (r) => `Master your Times Table up to ${r.size} × ${r.size} first`,
  };

  // Opened from a results screen, the Shop / Wardrobe / Stickers show only what
  // their button promised; this line says so and can switch to everything.
  function filterNote(text, showAll) {
    const note = make('p', 'filter-note', `${text} · `);
    const btn = make('button', 'link-btn', 'Show everything');
    btn.type = 'button';
    btn.addEventListener('click', showAll);
    note.append(btn);
    return note;
  }

  // Bottom bar of the Shop and Wardrobe: points you have, what an item would
  // leave you with while it's hovered, the All / Available toggle and Done.
  function renderWalletBar(prefix, onlyAvailable) {
    $(`${prefix}-wallet`).textContent = formatPoints(progress.wallet);
    previewCost(prefix, null);
    for (const b of $(`${prefix}-view`).querySelectorAll('button')) {
      const on = (b.dataset.view === 'available') === onlyAvailable;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-pressed', on);
    }
  }

  function previewCost(prefix, cost) {
    const after = $(`${prefix}-wallet-after`);
    after.replaceChildren();
    after.className = 'wallet-after';
    if (cost == null) return;
    const left = progress.wallet - cost;
    if (left >= 0) {
      after.append(' ', make('span', 'wallet-cost', `− ${formatPoints(cost)}`), ' = ', make('strong', 'wallet-left', formatPoints(left)));
    } else {
      after.classList.add('short');
      after.append(` · need ${formatPoints(-left)} more`);
    }
  }

  for (const [prefix, selector] of [['shop', '[data-cost]'], ['wardrobe', '.wardrobe-chip[data-cost]']]) {
    const dialog = $(prefix);
    const show = (e) => {
      const target = e.target.closest(selector);
      previewCost(prefix, target ? Number(target.dataset.cost) : null);
    };
    dialog.addEventListener('pointerover', show);
    dialog.addEventListener('focusin', show);
    dialog.addEventListener('pointerleave', () => previewCost(prefix, null));
  }

  let shopFilter = null; // Set of item ids (affordable when picked), or null for everything
  let shopHighlight = null;

  function renderShop(highlight = shopHighlight) {
    shopHighlight = highlight;
    el.shopBody.innerHTML = '';
    renderWalletBar('shop', !!shopFilter);
    if (shopFilter && !shopFilter.size) el.shopBody.append(make('p', 'filter-note', 'Nothing to unlock right now. Keep playing to earn points!'));
    let group = null;
    for (const item of Progress.SHOP) {
      if (item.cosmetic) continue; // looks are unlocked in the Wardrobe
      if (shopFilter && !shopFilter.has(item.id)) continue;
      if (item.group !== group) {
        group = item.group;
        el.shopBody.append(make('h3', 'stats-heading', group));
      }
      const row = make('div', 'shop-item' + (item.id === highlight ? ' highlight' : ''));
      const hiddenStep = !Progress.isUnlocked(progress, item.id) && Progress.isHidden(progress, item.id);
      if (hiddenStep) row.classList.add('skeleton-row');
      const name = make('span', 'shop-name', hiddenStep ? 'Locked' : item.name);
      if (!hiddenStep && item.perk) name.append(make('span', 'shop-perk', `🎁 ${item.perk}`));
      row.append(name);
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
        btn.dataset.cost = item.price;
        btn.disabled = !check.ok;
        row.append(btn);
        if (hiddenStep) {
          btn.replaceChildren(icon('lock'));
          btn.setAttribute('aria-label', 'Locked');
          const earn = Progress.canBuy(progress, item.id);
          row.append(make('span', 'shop-why', earn.reason === 'win' ? `Win a game on ${earn.size}×${earn.size} to reveal it` : earn.reason === 'master' ? `Master your Times Table up to ${earn.size} × ${earn.size} to reveal it (${earn.mastered} of ${earn.need})` : 'Unlock the one before it first'));
        } else if (!check.ok) row.append(make('span', 'shop-why', BUY_REASONS[check.reason](check)));
      }
      el.shopBody.append(row);
    }
  }

  function shopAvailable() {
    return new Set(Progress.SHOP.filter((i) => !i.cosmetic && Progress.canBuy(progress, i.id).ok).map((i) => i.id));
  }

  // What was tapped to open the shop, so buying it switches that exact choice on.
  let shopSource = null; // { item, el }

  // onlyAffordable: from a results screen, list just what can be bought right now
  function openShop(highlight, sourceEl = null, onlyAffordable = false) {
    shopSource = highlight && sourceEl ? { item: highlight, el: sourceEl } : null;
    shopFilter = onlyAffordable ? shopAvailable() : null;
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
  el.resultsShopBtn.addEventListener('click', () => openShop(null, null, true));
  el.pdShopBtn.addEventListener('click', () => openShop(null, null, true));
  for (const prefix of ['results', 'pd']) {
    $(`${prefix}-wardrobe-btn`).addEventListener('click', () => openWardrobe(true));
    $(`${prefix}-stickers-btn`).addEventListener('click', () => openStickers(true));
  }
  el.shopDialog.addEventListener('click', (e) => {
    if (e.target === el.shopDialog) return closeShop();
    const view = e.target.closest('#shop-view [data-view]');
    if (view) {
      shopFilter = view.dataset.view === 'available' ? shopAvailable() : null;
      renderShop(null);
      el.shopDialog.querySelector('.dialog').scrollTop = 0;
      return;
    }
    const btn = e.target.closest('[data-buy]');
    if (btn) purchase(Progress.shopItem(btn.dataset.buy));
  });

  // Buy an item and switch it on; used by the shop and the quick unlock.
  function purchase(item) {
    if (!Progress.buy(progress, item.id).ok) return false;
    toast(`🔓 Unlocked: ${item.name}`, `-${formatPoints(item.price)} points`);
    celebrate(Progress.awardAchievements(progress, { event: 'buy' }));
    saveProgress();
    refreshAvailableFilters();
    if (!el.shopDialog.hidden) renderShop(item.id);
    syncSettingsUI();
    syncBoardLocks();
    syncModeLocks();
    updatePracticePreview();
    refreshOpenNudges();
    activatePurchase(item);
    return true;
  }

  // After a purchase, "Available" lists catch up: newly revealed tiers appear,
  // things you can't afford any more go, and what you've bought stays (✓ Unlocked).
  function refreshAvailableFilters() {
    if (shopFilter) {
      const bought = [...shopFilter].filter((id) => Progress.isUnlocked(progress, id));
      shopFilter = new Set([...shopAvailable(), ...bought]);
    }
    if (wardrobeFilter) {
      const owned = [...wardrobeFilter].filter((key) => {
        const [cat, opt] = key.split(':');
        return cat === 'title' || Progress.isUnlocked(progress, Cosmetics.itemFor(cat, opt));
      });
      wardrobeFilter = new Set([...wardrobeAvailable(), ...owned]);
    }
  }

  // ---- quick unlock: tapping a locked thing asks "Unlock X for 🪙 N?" (no whole shop)

  let unlockAsk = null; // { item, el }

  // What to do to reveal a locked board or difficulty.
  function revealHint(r) {
    if (r.reason === 'win') return `Win a game against the CPU on the ${r.size}×${r.size} board to reveal the next board.`;
    const extra = r.practice ? ` and get the ${r.practice} ${r.practice === 1 ? 'fact' : 'facts'} that need practice back on track` : '';
    const which = r.faces ? `using ${tablesLabel(r.faces)}` : `up to ${r.size} × ${r.size}`;
    return `Master ${r.need} of the ${r.total} facts ${which} on your Times Table${extra} to reveal the next difficulty. You have ${r.mastered} so far. Practice helps!`;
  }

  function confirmUnlock(itemId, sourceEl) {
    let item = Progress.shopItem(itemId);
    const check = Progress.canBuy(progress, itemId);
    let offer = check.ok;
    let message;
    if (Progress.isHidden(progress, itemId)) {
      // a locked placeholder: offer the next step, without saying what this one is
      item = Progress.shopItem(Progress.nextInChain(progress, itemId));
      const next = Progress.canBuy(progress, item.id);
      if (next.reason === 'win' || next.reason === 'master') {
        // earned, not bought: a win on the board before, or knowing the times table
        unlockAsk = null;
        el.unlockTitle.textContent = '🔒 Locked';
        el.unlockPrice.textContent = '';
        el.unlockMessage.textContent = revealHint(next);
        el.unlockMessage.hidden = false;
        el.unlockYes.hidden = true;
        el.unlockNo.textContent = 'OK';
        el.unlockDialog.hidden = false;
        el.unlockNo.focus();
        return;
      }
      offer = next.ok;
      message = 'Unlock this first to see what comes next.';
      if (next.reason === 'points') message += ` You need ${formatPoints(next.missing)} more points for it.`;
      sourceEl = null;
    } else if (check.reason === 'requires') {
      // offer the thing that has to come first
      const first = Progress.shopItem(check.requires);
      const firstCheck = Progress.canBuy(progress, first.id);
      message = `${item.name} needs ${first.name} first.`;
      item = first;
      offer = firstCheck.ok;
      if (!offer) message += firstCheck.reason === 'points' ? ` You need ${formatPoints(firstCheck.missing)} more points for it.` : '';
      sourceEl = null; // what gets switched on is the prerequisite
    } else if (check.reason === 'points') {
      message = `You need ${formatPoints(check.missing)} more points. Keep playing to earn them!`;
    } else if (check.reason === 'season') {
      message = `This one is in the shop in ${check.when}.`;
    }
    unlockAsk = offer ? { item, el: sourceEl } : null;
    el.unlockTitle.textContent = offer ? `Unlock ${item.name}?` : item.name;
    el.unlockPrice.textContent = `🪙 ${formatPoints(item.price)} · you have ${formatPoints(progress.wallet)}`;
    // what it gives you (e.g. the bonus for finishing longer practice rounds)
    const perk = offer && item.perk ? `🎁 ${item.perk}` : '';
    el.unlockMessage.textContent = [perk, message].filter(Boolean).join(' ');
    el.unlockMessage.hidden = !perk && !message;
    el.unlockYes.hidden = !offer;
    if (offer) el.unlockYes.textContent = `Unlock for 🪙 ${formatPoints(item.price)}`;
    el.unlockNo.textContent = offer ? 'Cancel' : 'OK';
    el.unlockDialog.hidden = false;
    (offer ? el.unlockYes : el.unlockNo).focus();
  }

  function closeUnlock() {
    el.unlockDialog.hidden = true;
    unlockAsk = null;
  }

  el.unlockYes.addEventListener('click', () => {
    const ask = unlockAsk;
    closeUnlock();
    if (!ask) return;
    shopSource = ask.el ? { item: ask.item.id, el: ask.el } : null;
    purchase(ask.item);
  });
  el.unlockNo.addEventListener('click', closeUnlock);
  el.unlockDialog.addEventListener('click', (e) => {
    if (e.target === el.unlockDialog) closeUnlock();
  });
  el.unlockDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeUnlock();
  });

  // ---- "you can afford something" button on the results screens

  // Shop items (not Wardrobe looks) you can afford right now
  function affordableCount() {
    return Progress.SHOP.filter((item) => !item.cosmetic && Progress.canBuy(progress, item.id).ok).length;
  }

  // Things in the Wardrobe you own (or titles you've earned) but haven't looked at yet.
  function wardrobeKeys() {
    const keys = [];
    for (const cat of Cosmetics.CATEGORIES) {
      for (const opt of cat.options) {
        if (opt.price && Progress.isUnlocked(progress, Cosmetics.itemFor(cat.id, opt.id))) keys.push(`${cat.id}:${opt.id}`);
      }
    }
    for (const t of Cosmetics.TITLES) if (t.id !== 'none' && t.earned(progress)) keys.push(`title:${t.id}`);
    return keys;
  }

  const seenList = (kind) => (progress.seen = progress.seen || {})[kind] || (progress.seen[kind] = []);
  const newWardrobe = () => wardrobeKeys().filter((k) => !seenList('wardrobe').includes(k)).length;
  // Wardrobe looks you could buy right now (the Wardrobe's share of the shop)
  const affordableLooks = () => Progress.SHOP.filter((i) => i.cosmetic && Progress.canBuy(progress, i.id).ok).length;
  const newStickers = () => Object.keys(progress.stickers || {}).filter((id) => !seenList('stickers').includes(id)).length;
  const spareStickers = () => Object.values(progress.stickers || {}).reduce((n, c) => n + Math.max(0, c - 1), 0);

  function markSeen(kind, keys) {
    progress.seen[kind] = [...new Set([...seenList(kind), ...keys])];
    saveProgress();
  }

  // Shop / Wardrobe / Stickers buttons on a results screen ('results' or 'pd'), only when there's something new.
  function refreshNudges(prefix) {
    const shop = $(`${prefix}-shop-btn`);
    const wardrobe = $(`${prefix}-wardrobe-btn`);
    const stickers = $(`${prefix}-stickers-btn`);
    const n = affordableCount();
    shop.hidden = n === 0;
    if (n) shop.replaceChildren(icon('shopping-cart'), ` Shop · ${n} new ${n === 1 ? 'unlock' : 'unlocks'}`);
    const w = newWardrobe();
    const looks = affordableLooks();
    wardrobe.hidden = !w && !looks;
    const wParts = [w && `${w} new`, looks && `${looks} to unlock`].filter(Boolean);
    if (!wardrobe.hidden) wardrobe.replaceChildren(icon('shirt'), ` Wardrobe · ${wParts.join(' · ')}`);
    const fresh = newStickers();
    const spares = spareStickers();
    stickers.hidden = !fresh && !spares;
    const parts = [fresh && `${fresh} new`, spares && `${spares} ${spares === 1 ? 'spare' : 'spares'}`].filter(Boolean);
    if (!stickers.hidden) stickers.replaceChildren(icon('sticker'), ` Stickers · ${parts.join(' · ')}`);
  }

  function refreshOpenNudges() {
    if (!el.gameOver.hidden) refreshNudges('results');
    if (!el.practiceDone.hidden) refreshNudges('pd');
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
    multiplayer: () => (tap('[data-mode="multi"]'), tap('#multi-kind [data-kind="local"]')),
    players3: () => (tap('[data-mode="multi"]'), tap('#multi-kind [data-kind="local"]'), tap('#player-count [data-count="3"]')),
    players4: () => (tap('[data-mode="multi"]'), tap('#multi-kind [data-kind="local"]'), tap('#player-count [data-count="4"]')),
    practice: () => tap('[data-mode="practice"]'),
    ...Object.fromEntries(Progress.DIFFICULTIES.map((d) => [Progress.practiceExpertId(d), () => (tap('[data-mode="practice"]'), tap('#practice-level [data-level="expert"]'))])),
    ...Object.fromEntries(
      Progress.DIFFICULTIES.flatMap((d) => [
        [Progress.gameExpertId(d), () => (tap('[data-mode="single"]'), tap('#game-level [data-level="expert"]'))],
        ...[30, 10, 5].map((secs) => [Progress.gameTimerId(secs, d), () => (tap('[data-mode="single"]'), tap('#game-level [data-level="expert"]'), tap(`#game-timer [data-secs="${secs}"]`))]),
      ])
    ),
    ...Object.fromEntries(
      Progress.DIFFICULTIES.flatMap((d) => [10, 20].map((n) => [Progress.practiceCountId(n, d), () => (tap('[data-mode="practice"]'), tap(`#practice-count [data-count="${n}"]`))]))
    ),
    ...Object.fromEntries(
      Progress.DIFFICULTIES.flatMap((d) =>
        [30, 10, 5].map((secs) => [Progress.practiceTimerId(secs, d), () => (tap('[data-mode="practice"]'), tap('#practice-level [data-level="expert"]'), tap(`#practice-timer [data-secs="${secs}"]`))])
      )
    ),
    ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`table${i + 1}`, () => (tap('[data-mode="practice"]'), updatePracticePreview())])),
    board8: () => tap('#board-size [data-size="8"]'),
    board10: () => tap('#board-size [data-size="10"]'),
    board12: () => tap('#board-size [data-size="12"]'),
    board16: () => tap('#board-size [data-size="16"]'),
    board24: () => tap('#board-size [data-size="24"]'),
    board20: () => tap('#board-size [data-size="20"]'),
    boardCustom: () => tap('#board-size [data-size="custom"]'),
    'difficulty.medium': setOption('difficulty', 'medium'),
    'difficulty.hard': setOption('difficulty', 'hard'),
    'difficulty.tricky': setOption('difficulty', 'tricky'),
    'difficulty.master': setOption('difficulty', 'master'),
    'difficulty.legend': setOption('difficulty', 'legend'),
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
  };

  function activatePurchase(item) {
    const source = shopSource;
    shopSource = null;
    if (item.cosmetic) chooseCosmetic(item.cosmetic[0], item.cosmetic[1]); // put it on
    else if (source && source.item === item.id && source.el.isConnected) source.el.click(); // the exact thing tapped
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
      const secret = a.hidden && !when;
      text.append(make('strong', null, secret ? '???' : a.name), make('span', null, secret ? 'A secret achievement. Keep exploring!' : a.desc));
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
  let practiceRoundSize = 5;
  // 5 comes with Practice mode; 10 and 20 are unlocked for each difficulty
  const countUnlock = (count) => Progress.practiceCountId(Number(count), settings.difficulty);
  let practiceLevel = 'learn'; // 'expert' (shop unlock): no picture, no help button until 2 misses, ×2 bonus
  const EXPERT_BONUS = 2;
  const LEVEL_HELP = {
    learn: 'Learn: see each fact as a rectangle and get help counting.',
    expert: 'Expert: no picture and no help. First-try bonus points are doubled!',
  };

  function renderPracticeLevel() {
    // Expert is unlocked for each difficulty
    const expertId = Progress.practiceExpertId(settings.difficulty);
    if (!Progress.isUnlocked(progress, expertId) && practiceLevel === 'expert') practiceLevel = 'learn';
    for (const btn of el.practiceLevel.querySelectorAll('button')) {
      btn.classList.toggle('selected', btn.dataset.level === practiceLevel);
      setLockBadge(btn, btn.dataset.level === 'expert' ? expertId : null);
    }
    el.practiceLevelHelp.textContent = LEVEL_HELP[practiceLevel];
    renderPracticeTimer();
  }

  // Expert practice's own timer (Off, then 30 s → 10 s → 5 s from the shop),
  // unlocked separately for each difficulty
  let practiceTimerSecs = 0;
  const timerUnlock = (secs) => (Number(secs) ? Progress.practiceTimerId(Number(secs), settings.difficulty) : null);
  function renderPracticeTimer() {
    el.practiceTimerField.hidden = practiceLevel !== 'expert';
    if (!Progress.isUnlocked(progress, timerUnlock(practiceTimerSecs))) practiceTimerSecs = 0;
    for (const btn of el.practiceTimer.querySelectorAll('button')) {
      btn.classList.toggle('selected', Number(btn.dataset.secs) === practiceTimerSecs);
      setLockBadge(btn, timerUnlock(btn.dataset.secs));
    }
    // The timer bonus (Expert doubles it): all of it for an instant answer, none when time runs out
    const top = (secs) => Progress.TIMER_BONUS_MAX[secs] * EXPERT_BONUS;
    el.practiceTimerHelp.textContent = practiceTimerSecs
      ? `⏱️ Answer fast for a timer bonus of up to +${top(practiceTimerSecs)} a question: the quicker, the more. If time runs out, it counts as missed.`
      : `⏱️ A timer earns a bonus for quick answers: up to +${top(30)} a question with 30 s, +${top(10)} with 10 s, +${top(5)} with 5 s.`;
  }
  el.practiceTimer.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.unlock) return confirmUnlock(btn.dataset.unlock, btn);
    practiceTimerSecs = Number(btn.dataset.secs);
    renderPracticeTimer();
  });

  el.practiceLevel.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.unlock) return confirmUnlock(btn.dataset.unlock, btn);
    practiceLevel = btn.dataset.level;
    renderPracticeLevel();
    renderPracticeCount(); // Expert doubles the finishing bonus
  });
  const practiceTables = new Set(); // chosen times tables; empty = the whole table
  let practice = null;
  let prTimer = null;

  function playerFacts(name) {
    return (progress.facts[Progress.playerKey(name)] || { facts: {} }).facts;
  }

  // Master difficulty's dice: how often each fact comes up, from the player's
  // record. Like practice, but mastered facts are rarer still: whoever reaches
  // Master has mastered most of the table, and with practice's weights only
  // about a third of the rolls would be weak facts (this makes it ~70%).
  const MASTER_WEIGHTS = { ...Progress.PRACTICE_WEIGHTS, mastered: 0.1 };
  function weakFactWeight(player) {
    const facts = playerFacts(player ? player.name : 'You');
    return (a, b) => {
      const status = Progress.factStatus(facts[Progress.factKey(a, b)]);
      let weight = MASTER_WEIGHTS[status];
      if ((a === 1 || b === 1) && status !== 'practice') weight /= 2;
      return weight;
    };
  }

  // Practice table size follows Difficulty: Easy 6, Medium 8, Hard 12 (and
  // Tricky, Master and Legend, whose facts are within 12 or one teen × 2–9).
  function practiceMax() {
    return Math.min(Core.DIFFICULTY_SIDES[settings.difficulty] || 6, 12);
  }
  // The difficulty's table chips: ×1 … ×max, Tricky's hard tables, Legend's ×2 … ×9
  const practiceChips = () => Progress.practiceSet(settings.difficulty).tables.filter((n) => n <= 12);

  // Chips for the difficulty's tables; choices it doesn't have are dropped.
  function renderPracticeTables() {
    const chips = practiceChips();
    for (const n of [...practiceTables]) if (!chips.includes(n) || !tableUnlocked(n)) practiceTables.delete(n);
    el.practiceTables.innerHTML = '';
    for (const n of chips) {
      const btn = make('button', null, `×${n}`);
      btn.type = 'button';
      btn.dataset.table = n;
      btn.setAttribute('aria-pressed', String(practiceTables.has(n)));
      btn.setAttribute('aria-label', `${n} times table`);
      setLockBadge(btn, `table${n}`);
      el.practiceTables.append(btn);
    }
  }

  el.practiceTables.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-table]');
    if (!btn) return;
    if (btn.dataset.unlock) return confirmUnlock(btn.dataset.unlock, btn);
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

  // The tables a round asks about: the ones picked, or else every unlocked one.
  function practiceTableList() {
    if (practiceTables.size) return [...practiceTables];
    return practiceChips().filter(tableUnlocked);
  }

  function updatePracticePreview() {
    if (el.practiceSetup.hidden) return;
    renderPracticeLevel();
    renderPracticeCount();
    renderPracticeTables();
    const tables = practiceTableList();
    el.startBtn.disabled = !tables.length;
    if (!tables.length) {
      el.practicePreview.textContent = 'Unlock a times table to practice: tap ×1 to start.';
      return;
    }
    const facts = playerFacts(el.practiceName.value.trim() || 'You');
    const set = Progress.practiceSet(settings.difficulty);
    const upTo = settings.difficulty === 'legend' ? '11–19' : `up to ${practiceMax()}`;
    const counts = { practice: 0, learning: 0, unseen: 0, mastered: 0 };
    let total = 0;
    for (const [a, b] of set.pairs) {
      if (!(set.bSideOnly ? tables.includes(b) : tables.includes(a) || tables.includes(b))) continue;
      counts[Progress.factStatus(facts[Progress.factKey(a, b)])]++;
      total++;
    }
    const what = practiceTables.size ? `${tablesLabel(practiceTables)} ${upTo} (${total} facts)` : `All your unlocked tables (${tablesLabel(tables)}), ${upTo}`;
    el.practicePreview.textContent =
      `${what}: ${counts.practice} need practice, ${counts.learning} learning, ` +
      `${counts.unseen} not seen yet, ${counts.mastered} mastered.`;
  }
  el.practiceName.addEventListener('input', updatePracticePreview);
  el.practiceCount.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.unlock) return confirmUnlock(btn.dataset.unlock, btn);
    practiceRoundSize = Number(btn.dataset.count);
    selectIn(el.practiceCount, btn);
    renderPracticeCount();
  });

  function renderPracticeCount() {
    if (!Progress.isUnlocked(progress, countUnlock(practiceRoundSize))) practiceRoundSize = 5;
    for (const btn of el.practiceCount.querySelectorAll('button')) {
      btn.classList.toggle('selected', Number(btn.dataset.count) === practiceRoundSize);
      setLockBadge(btn, countUnlock(btn.dataset.count));
    }
    // The finishing bonus for the chosen length (doubled on Expert)
    const expert = practiceLevel === 'expert';
    const bonus = Progress.practiceFinishBonus(practiceRoundSize, expert);
    const next = practiceRoundSize === 5 ? Progress.practiceFinishBonus(10, expert) : 0;
    el.practiceCountHelp.textContent = bonus
      ? `🏁 Finish all ${practiceRoundSize} for +${bonus} bonus points${expert ? ' (doubled on Expert)' : ''}.`
      : `🏁 Longer rounds earn a finishing bonus: +${next} for 10 questions, +${Progress.practiceFinishBonus(20, expert)} for 20.`;
  }

  // Times tables are unlocked one by one (×1, then ×2, …)
  const tableUnlocked = (n) => Progress.isUnlocked(progress, `table${n}`);

  function startPractice(name, count, tables = [], expert = false, timer = 0) {
    stopPracticeTimer();
    cancelContinue();
    stopTimer();
    gameId++; // cancels anything still waiting from a game
    game = null;
    const max = practiceMax();
    const facts = playerFacts(name);
    const queue = Progress.pickPracticeFacts(facts, Progress.practiceSet(settings.difficulty), count, Math.random, tables);
    const before = {};
    for (const [a, b] of queue) before[Progress.factKey(a, b)] = Progress.factStatus(facts[Progress.factKey(a, b)]);
    practice = { name, max, count, tables, expert, timer, difficulty: settings.difficulty, startedAt: Date.now(), times: [], queue, index: 0, requeued: new Set(), before, firstTry: 0, answered: 0, streak: 0, bestStreak: 0, points: 0, earned: [], current: null };
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
    showStreak(el.prStreak, practice.streak);
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
    if (answerDecided(q.entry, q.area)) checkPractice(); // right, too big, or all digits typed
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
      const timerLeft = prTimer && practice.timer ? { secs: practice.timer, left: prTimer.remaining / prTimer.total } : null;
      stopPracticeTimer();
      practiceLocked(true);
      const ms = performance.now() - q.startedAt - q.pausedMs;
      const firstTry = q.attempts === 0;
      practice.answered++;
      if (firstTry && !q.retry) practice.firstTry++;
      practice.times.push(Math.round(ms));
      practice.streak = firstTry ? practice.streak + 1 : 0;
      practice.bestStreak = Math.max(practice.bestStreak, practice.streak);
      const bonus = Progress.answerBonus({ firstTry, ms, streak: practice.streak, timer: timerLeft });
      const multiplier = practice.expert ? EXPERT_BONUS : 1;
      const points = PRACTICE_BASE_POINTS + bonus.total * multiplier;
      practice.points += points;
      Progress.addPoints(progress, points);
      for (const part of bonus.parts) {
        const extra = practice.expert ? ` (×${EXPERT_BONUS} Expert)` : '';
        toast(`${BONUS_TOASTS[part.label.split(' ')[0]]} ${capitalize(part.label)}`, `+${part.points * multiplier} bonus points${extra}`);
      }
      Progress.recordAnswer(progress, practice.name, { a: q.a, b: q.b, firstTry, correct: true, wrongAnswers: q.wrong, ms });
      const learned = Progress.learnedAfterHelp(progress, q.a, q.b, firstTry);
      practice.earned.push(...celebrate(Progress.awardAchievements(progress, { event: 'answer', correct: true, firstTry, ms, streak: practice.streak, a: q.a, b: q.b, facts: playerFacts(practice.name), size: unlockedTableSize(), learned })));
      saveProgress();
      el.prAnswer.className = 'answer-box right';
      el.prFeedback.className = 'math-feedback good';
      el.prFeedback.textContent = firstTry ? `Correct! +${points} points 🎉` : `You got it! +${points} point${points === 1 ? '' : 's'}`;
      showStreak(el.prStreak, practice.streak);
      await waitInGame(1100);
      practice.index++;
      nextPracticeQuestion();
      return;
    }
    q.attempts++;
    q.wrong.push(Number(q.entry));
    q.entry = '';
    practice.streak = 0;
    showStreak(el.prStreak, 0);
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
    Progress.noteHelp(progress, q.a, q.b);
    practice.earned.push(...celebrate(Progress.awardAchievements(progress, { event: 'help' })));
    saveProgress();
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
  // "7s", or "4:32" for a minute or more
  function timerText(ms) {
    const secs = Math.ceil(ms / 1000);
    return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  }

  function startPracticeTimer() {
    const secs = practice.expert ? practice.timer : 0; // Expert practice's own timer
    el.prTimer.hidden = !secs;
    if (!secs) return;
    const q = practice.current;
    const total = Progress.timerLength(progress, secs) * 1000;
    prTimer = { total, remaining: total, last: performance.now() };
    const draw = () => {
      const left = Math.max(0, prTimer.remaining);
      el.prTimerNum.textContent = timerText(left);
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
    // Longer rounds earn a finishing bonus (doubled on Expert, like the other bonuses)
    const finish = Progress.practiceFinishBonus(pr.count, pr.expert);
    if (finish) {
      pr.points += finish;
      Progress.addPoints(progress, finish);
      toast(`🏁 Finished all ${pr.count} questions!`, `+${finish} bonus points${pr.expert ? ` (×${EXPERT_BONUS} Expert)` : ''}`);
    }
    recordPracticeRound(pr);
    Progress.noteActivity(progress, { kind: 'practice', difficulty: pr.difficulty, count: pr.count, expert: pr.expert, finished: true, firstTry: pr.firstTry });
    pr.earned.push(...celebrate(Progress.awardAchievements(progress, { event: 'practice' })));
    saveProgress();

    const retries = pr.queue.length - pr.count; // missed facts asked again
    el.pdSub.textContent =
      (pr.expert ? '🧠 Expert · ' : '') +
      `${pr.firstTry} of ${pr.count} right first time` +
      (retries ? ` · ${retries} ${retries === 1 ? 'fact' : 'facts'} retried` : '') +
      (pr.bestStreak >= 3 ? ` · best streak ${pr.bestStreak} 🔥` : '');

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
    refreshNudges('pd');
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
  el.pdAgain.addEventListener('click', () => startPractice(practice.name, practice.count, practice.tables, practice.expert, practice.timer));
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
    difficulty: {
      easy: 'Easy (6-sided dice)',
      medium: 'Medium (8-sided dice)',
      hard: 'Hard (12-sided dice)',
      tricky: 'Tricky (no easy facts)',
      master: 'Master (your weakest facts)',
      legend: 'Legend (teens × 2–9)',
    },
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
    if (setup.mode === 'multi' && invitePlayersFromSetup().some((p) => !p.c && !p.n)) {
      toast('✏️ Players need names', 'Type every player’s name on the main menu first.');
      return;
    }
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


  // ---------------------------------------------------------------- classroom
  // Everyone plays the same rolls on their own board; the teacher's screen
  // (server/classroom.js) rolls, shows the leaderboard and ends the game.

  const Classroom = window.BlockoutClassroom;
  const DIFFICULTY_SIDES_TEXT = { easy: '6-sided dice', medium: '8-sided dice', hard: '12-sided dice' };

  function ordinal(n) {
    const tens = n % 100;
    const suffix = tens >= 11 && tens <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
    return `${n}${suffix}`;
  }

  // Can this page reach the classroom server? Shown in the Classroom menu.
  async function checkClassroom() {
    const reason = await Classroom.check();
    el.classOffline.hidden = !reason;
    el.classJoinOpen.disabled = el.classHostOpen.disabled = Boolean(reason);
    if (reason) {
      el.classOffline.innerHTML =
        reason === 'file'
          ? 'Classroom games run through the Blockout server. On the teacher’s computer run <code>node server/classroom.js</code>, then open the address it shows (like <code>http://localhost:8080</code>).'
          : 'Can’t reach the classroom server. Run <code>node server/classroom.js</code> and open this page from the address it prints (like <code>http://localhost:8080</code>), not from another web server.';
    }
    return !reason;
  }

  // ---- students

  let classSession = null; // { code, id, key, name }
  let classStop = null; // closes the live updates
  let classSeen = false; // got at least one update since connecting

  // The first name used in the last class on this device, to fill in next time
  const CLASS_NAME_KEY = 'blockout.className';
  function lastClassName() {
    try {
      return localStorage.getItem(CLASS_NAME_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  // fromLink: opened from a join link (QR code or a link posted in the class chat)
  async function openClassJoin(code = '', fromLink = false) {
    el.classCodeInput.value = code || '';
    // Signed-in students play under their account's first name
    const account = Auth && Auth.role() === 'student' ? Auth.user() : null;
    el.classNameInput.value = account ? account.firstName : lastClassName();
    el.classNameInput.readOnly = Boolean(account);
    el.classJoinError.hidden = true;
    el.classJoinForm.hidden = false;
    el.classWait.hidden = true;
    el.classJoin.hidden = false;
    // With the code and your name filled in, joining is one tap
    (!code ? el.classCodeInput : el.classNameInput.value ? el.classJoinBtn : el.classNameInput).focus();
    if (fromLink && code) {
      try {
        await Classroom.roomInfo(code);
      } catch (err) {
        if (err.code !== 'room') return;
        el.classJoinError.textContent = 'This class has finished. Ask your teacher for a new link.';
        el.classJoinError.hidden = false;
        el.classCodeInput.value = '';
        el.classCodeInput.focus();
      }
    }
  }

  el.classJoinOpen.addEventListener('click', () => openClassJoin());
  el.classJoinCancel.addEventListener('click', () => (el.classJoin.hidden = true));
  el.classCodeInput.addEventListener('input', () => {
    el.classCodeInput.value = el.classCodeInput.value.toUpperCase().replace(/[^A-Z]/g, '');
  });

  el.classJoinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = el.classCodeInput.value.trim().toUpperCase();
    const name = el.classNameInput.value.trim();
    const fail = (msg, input) => {
      el.classJoinError.textContent = msg;
      el.classJoinError.hidden = false;
      if (input) input.focus();
    };
    if (code.length !== 4) return fail('The class code has 4 letters.', el.classCodeInput);
    if (!name) return fail('Type your first name.', el.classNameInput);
    el.classJoinBtn.disabled = true;
    try {
      const joined = await Classroom.join(code, name);
      try {
        localStorage.setItem(CLASS_NAME_KEY, joined.name);
      } catch (e) {}
      connectClass({ code, id: joined.id, key: joined.key, name: joined.name });
      showClassWaiting(null);
    } catch (err) {
      fail(err.message, err.code === 'room' ? el.classCodeInput : el.classNameInput);
    } finally {
      el.classJoinBtn.disabled = false;
    }
  });

  function connectClass(session) {
    if (classStop) classStop();
    classSession = session;
    classSeen = false;
    Classroom.saveSession(session);
    classStop = Classroom.listenStudent(session, {
      view: (v) => {
        classSeen = true;
        onClassView(v);
      },
      gone: onClassGone,
    });
  }

  function leaveClass() {
    if (!classSession) return;
    Classroom.leave(classSession).catch(() => {});
    if (classStop) classStop();
    classStop = null;
    classSession = null;
    Classroom.saveSession(null);
  }

  el.classLeaveBtn.addEventListener('click', () => {
    leaveClass();
    el.classJoin.hidden = true;
  });

  function onClassGone(reason) {
    const wasIn = classSeen;
    const wasHost = classSession && classSession.host;
    classStop = null;
    classSession = null;
    Classroom.saveSession(null);
    el.classJoin.hidden = true;
    if (wasHost) {
      // the teacher's own player on the projector page: the host screen handles the rest
      if (game && game.mode === 'pair') game = null;
      return;
    }
    if (game && (game.mode === 'class' || game.mode === 'pair') && game.phase !== 'over') toMenu();
    if (!wasIn) return; // an old class from last time: just forget it
    if (reason === 'closed') toast('👋 Your teacher closed the class', 'Thanks for playing!');
    else if (reason === 'removed') toast('You’ve left the class', 'Join again with the code if that was a mistake.');
    else toast('⚠️ Lost the class', 'Join again with the code on the board.');
  }

  function showClassWaiting(view) {
    el.classWaitName.textContent = classSession.name;
    const t = view && view.tournament;
    el.classWaitText.textContent = t
      ? tournamentLine(t)
      : classSession.teacher
      ? 'You’re the teacher’s player. When there’s an odd number of students, you’ll play the odd one out here.'
      : view && view.state === 'playing'
        ? 'That game started without you. You’ll play in the next one!'
        : view && view.state === 'ended'
          ? 'That game just finished. Wait here for the next one!'
          : 'Waiting for your teacher to start the game…';
    el.classJoinForm.hidden = true;
    el.classWait.hidden = false;
    el.classJoin.hidden = false;
  }

  function onClassView(view) {
    if (view.type === 'pairs' || view.type === 'tournament') return onPairView(view);
    if (view.you.benched) return showClassWaiting(view); // joined after this game started
    const mine = game && game.mode === 'class' && game.classroom.game === view.game;
    if (view.state === 'playing') {
      if (!mine) startClassGame(view);
      else syncClassGame(view);
      return;
    }
    if (view.state === 'ended' && mine) {
      if (game.phase !== 'over') finishClassGame(view);
      return;
    }
    // Lobby (or a game that finished before we got here): wait for the next one.
    // Results stay on screen until the next game starts.
    if (game && game.mode === 'class' && game.phase === 'over') return;
    if (game && game.mode === 'class') toMenu();
    showClassWaiting(view);
  }

  // The teacher's settings for everyone in the class (no shop locks); placing is
  // the student's own choice unless the teacher picked one.
  function classCfg(s) {
    return {
      answerTime: s.answerTime || 0,
      placeMode: s.placeMode && s.placeMode !== 'choice' ? s.placeMode : settings.placeMode,
      firstInCorner: false,
      diceMode: 'virtual',
    };
  }

  function startClassGame(view) {
    el.classJoin.hidden = true;
    for (const d of document.querySelectorAll('.overlay')) if (d !== el.gameOver) d.hidden = true;
    const you = view.you;
    const { size, difficulty } = view.settings;
    startGame([{ name: you.name, statsName: el.singleName.value.trim() || 'You', cpu: false }], size, 'class', null, {
      cfg: { ...classCfg(view.settings), difficulty, autoRoll: 'off', fitRolls: 'never' }, // the teacher rolls
      classroom: { session: classSession, game: view.game, round: 0, reported: true, view },
    });
    // Rejoining mid-game: put your rectangles back and pick up your score.
    const p = game.players[0];
    for (const r of you.rects) {
      const rect = Core.place(game.board, r.x, r.y, r.w, r.h, 0);
      Object.assign(rect, { a: r.a, b: r.b, solved: true });
    }
    Object.assign(p, { squares: you.squares, bonus: you.bonus, score: you.score, streak: you.streak, answered: you.answered, firstTry: you.firstTry });
    if (you.rects.length) toast(`🏫 Back in class ${view.code}`, `You have ${you.score} points.`);
    syncClassGame(view);
  }

  // A new roll from the teacher. If you were still working on the last one, it's gone.
  function syncClassGame(view) {
    const c = game.classroom;
    c.view = view;
    if (view.round > c.round) {
      if (!['wait', 'over'].includes(game.phase)) {
        gameId++; // stop whatever the last roll was still doing
        if (!c.reported) {
          if (game.pending) Core.removeRect(game.board, game.pending.rect);
          const [a, b] = game.dice || [];
          if (a) currentPlayer().log.push({ timeout: true, a, b });
          currentPlayer().streak = 0;
          toast('⏭️ Next roll!', 'Your teacher moved on before you finished that one.');
        }
      }
      resetTurn();
      c.round = view.round;
      const [a, b] = view.roll;
      if (view.you.done) {
        // No room for this roll (the server checks), or you'd already answered it
        c.reported = true;
        game.dice = [a, b];
        renderDie(el.dieA, a);
        renderDie(el.dieB, b);
        game.phase = 'wait';
        if (view.you.result === 'pass') {
          currentPlayer().log.push({ pass: true, a, b });
          setMsg(`No room for a ${a} × ${b} anywhere. You pass this time.`);
        } else setMsg('Waiting for the next roll…');
      } else {
        c.reported = false;
        classTurn(a, b);
      }
    }
    render();
  }

  async function classTurn(a, b) {
    setMsg('');
    await rollDice([a, b]);
    await startPlacing(a, b);
  }

  // Tell the server how this roll went (once per roll).
  function reportClass(result) {
    const c = game.classroom;
    if (!c || c.reported) return;
    c.reported = true;
    c.doneTurn = c.round;
    Classroom.sendResult(c.session, { round: c.round, ...result }).catch((err) => {
      if (err.code !== 'stale' && err.code !== 'done') toast('⚠️ Couldn’t send your answer', err.message);
    });
  }


  // ---- pairs: head to head on a shared board, taking turns

  function onPairView(view) {
    const host = classSession.host; // the teacher playing from the projector screen
    // (a tournament plays many games: each has its own match id)
    const sameGame = game && game.mode === 'pair' && game.classroom.game === view.game;
    const mine = sameGame && (!view.match || game.classroom.matchId === view.match.id);
    if (view.type === 'tournament') tournamentUpdate(view, sameGame);
    if (view.match && view.state !== 'lobby') {
      if (!mine) {
        if (view.match.over) return host ? updateMyGameButton() : showClassWaiting(view); // joined after it finished
        startPairGame(view);
      } else syncPairGame(view);
      return;
    }
    if (sameGame && game.phase === 'over') return; // results stay up until the next game starts
    if (game && game.mode === 'pair') {
      if (host) game = null;
      else toMenu();
    }
    if (host) return updateMyGameButton();
    showClassWaiting(view);
  }

  function startPairGame(view) {
    const m = view.match;
    const me = m.players.findIndex((p) => p.id === view.you.id);
    if (!classSession.host) {
      el.classJoin.hidden = true;
      for (const d of document.querySelectorAll('.overlay')) if (d !== el.gameOver) d.hidden = true;
    }
    const defs = m.players.map((p, i) => ({
      name: p.name,
      cpu: p.isCpu,
      ...(i === me ? { statsName: el.singleName.value.trim() || 'You' } : {}),
    }));
    const { size, difficulty } = view.settings;
    startGame(defs, size, 'pair', null, {
      cfg: { ...classCfg(view.settings), difficulty, autoRoll: view.settings.autoRoll ? 'auto' : 'off' },
      classroom: { session: classSession, game: view.game, matchId: m.id, me, round: 0, reported: true, doneTurn: 0, synced: 0, passSeen: 0, view },
    });
    if (classSession.host && !hostOnGame) showHostView(); // the projector keeps showing the class
    syncPairGame(view);
  }

  const opponent = () => game.players[1 - game.classroom.me];

  // Bring the shared board and the turn up to date with the server.
  function syncPairGame(view) {
    if (game.phase === 'over') return; // finished (and rewarded) once already
    const c = game.classroom;
    const m = view.match;
    c.view = view;
    m.players.forEach((sp, i) => Object.assign(game.players[i], { score: sp.score, squares: sp.squares, bonus: sp.bonus }));
    let note = '';
    // New rectangles (yours are already on the board)
    for (const r of m.rects.slice(c.synced)) {
      if (game.board.rects.some((x) => x.x === r.x && x.y === r.y && x.w === r.w && x.h === r.h)) continue;
      if (game.pending) {
        // Can't happen in turn order, but never draw over your own rectangle
        Core.removeRect(game.board, game.pending.rect);
        game.pending = null;
      }
      const rect = Core.place(game.board, r.x, r.y, r.w, r.h, r.owner);
      Object.assign(rect, { a: r.a, b: r.b, solved: true });
      game.lastRect = rect;
      game.players[r.owner].log.push({ a: r.a, b: r.b, area: rect.area });
      if (r.owner !== c.me) note = `${game.players[r.owner].name} drew ${r.a} × ${r.b} = ${rect.area}.`;
    }
    c.synced = m.rects.length;
    // Passes
    if (m.lastPass && m.lastPass.turn > c.passSeen) {
      c.passSeen = m.lastPass.turn;
      const who = m.players.findIndex((p) => p.id === m.lastPass.by);
      const [a, b] = m.lastPass.roll;
      game.players[who].log.push({ pass: true, a, b });
      note = who === c.me ? `No room for a ${a} × ${b} anywhere. You pass.` : `${game.players[who].name} had no room for a ${a} × ${b}, so they pass.`;
    }
    game.current = m.current;
    if (m.over) return finishPairGame(view);
    const myTurn = m.current === c.me;
    const newTurn = m.turn !== c.round;
    if (newTurn) c.round = m.turn;
    if (newTurn && myTurn && ['wait', 'roll'].includes(game.phase)) startPairTurn(note);
    else if (!myTurn && game.phase === 'wait') {
      if (m.roll) {
        renderDie(el.dieA, m.roll[0]);
        renderDie(el.dieB, m.roll[1]);
        setMsg(`${opponent().name} rolled ${m.roll[0]} and ${m.roll[1]}…`);
      } else if (newTurn || note) {
        renderDie(el.dieA, null);
        renderDie(el.dieB, null);
        setMsg(`${note} ${opponent().name}'s turn…`.trim());
      }
    }
    render();
    updateMyGameButton();
  }

  function startPairTurn(note = '') {
    resetTurn();
    game.classroom.reported = false;
    game.phase = 'roll';
    setMsg(`${note} ${game.autoRoll ? 'Your turn! Rolling…' : 'Your turn: roll the dice!'}`.trim());
    render();
    if (classSession.host && !hostOnGame) toast('🎲 Your turn', `in your game with ${opponent().name}`);
    if (game.autoRoll) waitInGame(AUTO_ROLL_MS).then(humanRoll);
  }

  // After your turn (or at the start): your turn again, or wait for your partner.
  function pairTurnOrWait() {
    const c = game.classroom;
    const m = c.view && c.view.match;
    if (m && !m.over && m.current === c.me && m.turn === c.round && m.turn !== c.doneTurn) return startPairTurn();
    game.phase = 'wait';
    setMsg(m && m.current !== c.me ? `${opponent().name}'s turn…` : 'Waiting…');
    render();
  }

  async function pairRoll() {
    const c = game.classroom;
    game.phase = 'rolling';
    render();
    let res;
    try {
      res = await Classroom.roll(c.session);
    } catch (err) {
      if (game && game.classroom === c) {
        game.phase = 'roll';
        render();
      }
      if (err.code !== 'turn' && err.code !== 'stale') toast('⚠️ Couldn’t roll', err.message);
      return;
    }
    if (!game || game.classroom !== c) return;
    const [a, b] = await rollDice(res.roll);
    if (res.passed) {
      c.reported = true;
      c.doneTurn = c.round;
      game.phase = 'wait';
      setMsg(`No room for a ${a} × ${b} anywhere. You pass.`);
      render();
      return;
    }
    await startPlacing(a, b);
  }

  function finishPairGame(view) {
    gameId++;
    stopTimer();
    const c = game.classroom;
    const m = view.match;
    game.phase = 'over';
    game.dice = null;
    game.pending = null;
    el.math.hidden = true;
    setMsg('');
    render();
    updateMyGameButton();
    const me = m.players[c.me];
    const opp = m.players[1 - c.me];
    const oppName = opp.isTeacher ? 'your teacher' : opp.name;
    const Opp = oppName[0].toUpperCase() + oppName.slice(1);
    el.resultTitle.textContent =
      m.left === opp.id
        ? `${Opp} left, so you win!`
        : m.winner === me.id
          ? `You beat ${oppName}! 🎉`
          : m.winner === null
            ? 'It’s a tie!'
            : `${Opp} wins this time`;
    const empty = Core.emptyCount(game.board);
    el.resultSub.textContent = `${me.score} – ${opp.score} · ${empty === 0 ? 'the board is full' : `${empty} squares left empty`}`;
    el.resultList.innerHTML = '';
    const top = Math.max(1, me.score, opp.score);
    for (const [i, p] of [...m.players.entries()].sort((x, y) => y[1].score - x[1].score)) {
      const li = make('li', i === c.me ? 'result-you' : '');
      li.style.setProperty('--c', game.players[i].color);
      const bar = make('span', 'result-bar');
      const fill = make('span');
      fill.style.width = `${(p.score / top) * 100}%`;
      bar.append(fill);
      li.append(make('span', 'result-name', p.name), make('span', 'result-pts', `${p.score} pts`), bar);
      el.resultList.append(li);
    }
    el.rewards.innerHTML = '';
    if (c.session.teacher) el.rewards.append(make('p', 'setting-help', 'Thanks for playing! Teacher games don’t count towards stats.'));
    else if (view.type === 'tournament') {
      // each tournament game earns its points; the tournament's own rewards come at the end
      Progress.addPoints(progress, me.score);
      saveProgress();
      showRewards([]);
    } else renderPairRewards(view);
    if (m.tiebreak) el.resultSub.textContent += m.tiebreak === 'coin' ? ' · a tie, settled by a coin flip' : ' · a tie, won on answers right first time';
    tournamentUpdate(view, true);
    if (m.winner === me.id) celebrateWin();
    renderStats();
    setDetailsOpen(false);
    if (c.session.host && !hostOnGame) {
      toast('🏁 Your game is over', `${me.score} – ${opp.score} against ${opp.name}`);
      return; // the projector keeps showing the class; the results wait in "My game"
    }
    el.gameOver.hidden = false;
    el.gameOver.querySelector('.dialog').scrollTop = 0;
  }

  function renderPairRewards(view) {
    const c = game.classroom;
    const m = view.match;
    const me = m.players[c.me];
    const opp = m.players[1 - c.me];
    const won = m.winner === me.id;
    Progress.addPoints(progress, me.score);
    progress.counters.pairGames = (progress.counters.pairGames || 0) + 1;
    if (won) progress.counters.pairWins = (progress.counters.pairWins || 0) + 1;
    Progress.noteActivity(progress, { kind: 'class', type: view.tournament ? 'tournament' : 'pairs', won });
    const p = game.players[c.me];
    const asked = p.answered + p.stats.timeouts;
    const earned = Progress.awardAchievements(progress, {
      event: 'pair',
      won,
      tie: m.winner === null,
      vsTeacher: opp.isTeacher,
      vsCpu: opp.isCpu,
      pairGames: progress.counters.pairGames,
      pairWins: progress.counters.pairWins || 0,
      perfect: asked >= 5 && p.firstTry === asked,
    });
    grantStickers(earned); // they show up behind the Stickers button
    saveProgress();
    const history = loadHistory();
    history.push({
      kind: 'class',
      type: 'pairs',
      at: Date.now(),
      duration: Date.now() - game.startedAt,
      code: view.code,
      size: view.settings.size,
      difficulty: view.settings.difficulty,
      name: me.name,
      statsName: statsName(p),
      opponent: opp.isTeacher ? 'Teacher' : opp.name,
      result: m.winner === null ? 'tie' : won ? 'win' : 'loss',
      score: me.score,
      opponentScore: opp.score,
      answered: p.answered,
      firstTry: p.firstTry,
      timeouts: p.stats.timeouts,
      times: p.stats.times.map(Math.round),
      missed: p.stats.missed,
    });
    saveHistory(history);
    showRewards(earned);
    el.rewards.append(make('p', 'setting-help', 'Stay on this screen: your teacher can start another game.'));
  }

  // ---- tournaments (students): where you stand between games, and the rewards at the end

  function tournamentLine(t) {
    const record = `${t.wins}–${t.losses}`;
    switch (t.status) {
      case 'champion':
        return `🏆 You won the tournament! (${record})`;
      case 'finished':
        return `${t.champion} won the tournament. You finished ${ordinal(t.place)} of ${t.of} (${record}).`;
      case 'out':
        return `You’re out of the tournament (${record}). Cheer on the others! 📣`;
      case 'bye':
        return 'You have a bye this round: you go straight through! 🎟️';
      case 'playing':
        return 'Your game is on!';
      default:
        return t.line ? `You’re number ${t.line} in line for the hill 👑 (${record})` : `Next round starting soon… (${record})`;
    }
  }

  let tournamentRewarded = null; // `${code}:${game}` once its rewards are given

  // Every update: keep the line under your last result up to date, and give the
  // tournament's rewards once it's over.
  function tournamentUpdate(view, sameGame) {
    const t = view.tournament;
    if (!t) return;
    if (sameGame && game.phase === 'over') {
      el.resultTournament.textContent = tournamentLine(t);
      el.resultTournament.hidden = false;
    }
    if (!el.classWait.hidden && !el.classJoin.hidden) el.classWaitText.textContent = tournamentLine(t);
    const key = `${view.code}:${view.game}`;
    if (view.state !== 'ended' || classSession.teacher || tournamentRewarded === key) return;
    tournamentRewarded = key;
    progress.counters.tournaments = (progress.counters.tournaments || 0) + 1;
    if (t.status === 'champion') progress.counters.tournamentWins = (progress.counters.tournamentWins || 0) + 1;
    celebrate(
      Progress.awardAchievements(progress, {
        event: 'tournament',
        place: t.place,
        of: t.of,
        champion: t.status === 'champion',
        undefeated: t.losses === 0 && t.wins > 0,
        upsets: t.upsets,
        bestStreak: t.bestStreak,
        tournaments: progress.counters.tournaments,
        titles: progress.counters.tournamentWins || 0,
      })
    );
    saveProgress();
    const history = loadHistory();
    history.push({
      kind: 'class',
      type: 'tournament',
      at: Date.now(),
      duration: 0,
      code: view.code,
      size: view.settings.size,
      difficulty: view.settings.difficulty,
      format: view.settings.format,
      name: classSession.name,
      place: t.place,
      of: t.of,
      wins: t.wins,
      losses: t.losses,
      champion: t.champion,
    });
    saveHistory(history);
    if (t.status === 'champion') celebrateWin();
  }

  function finishClassGame(view) {
    gameId++;
    stopTimer();
    const you = view.you;
    const p = game.players[0];
    game.classroom.view = view;
    game.phase = 'over';
    game.dice = null;
    game.pending = null;
    el.math.hidden = true;
    setMsg('');
    Object.assign(p, { score: you.score, squares: you.squares, bonus: you.bonus });
    render();
    const alone = view.of < 2;
    el.resultTitle.textContent = alone
      ? 'Game over!'
      : you.rank === 1
        ? `${you.tied ? 'Tied for top' : 'Top'} of the class! 🏆`
        : `You ${you.tied ? 'tied for' : 'came'} ${ordinal(you.rank)} of ${view.of}!`;
    const asked = you.answered + you.timeouts;
    el.resultSub.textContent = `${you.score} points · ${you.firstTry} of ${asked} right first time`;
    el.resultList.innerHTML = '';
    const rows = [...view.top];
    if (!rows.some((r) => r.name === you.name)) rows.push({ gap: true }, { name: you.name, rank: you.rank, score: you.score });
    const top = Math.max(1, ...rows.filter((r) => !r.gap).map((r) => r.score));
    for (const r of rows) {
      const li = make('li', r.gap ? 'result-gap' : r.name === you.name ? 'result-you' : '');
      if (r.gap) {
        li.textContent = '⋯';
        el.resultList.append(li);
        continue;
      }
      li.style.setProperty('--c', r.name === you.name ? p.color : 'var(--muted)');
      const bar = make('span', 'result-bar');
      const fill = make('span');
      fill.style.width = `${(r.score / top) * 100}%`;
      bar.append(fill);
      li.append(make('span', 'result-name', `${ordinal(r.rank)} ${r.name}`), make('span', 'result-pts', `${r.score} pts`), bar);
      el.resultList.append(li);
    }
    renderClassRewards(view);
    refreshNudges('results');
    if (you.rank === 1 && !alone) celebrateWin();
    renderStats();
    setDetailsOpen(false);
    el.gameOver.hidden = false;
    el.gameOver.querySelector('.dialog').scrollTop = 0;
  }

  function renderClassRewards(view) {
    const you = view.you;
    const p = game.players[0];
    el.rewards.innerHTML = '';
    Progress.addPoints(progress, you.score);
    progress.counters.classGames = (progress.counters.classGames || 0) + 1;
    Progress.noteActivity(progress, { kind: 'class', type: 'class', rank: you.rank });
    const asked = you.answered + you.timeouts;
    const earned = Progress.awardAchievements(progress, {
      event: 'class',
      classGames: progress.counters.classGames,
      rank: you.rank,
      of: view.of,
      perfect: asked >= 5 && you.firstTry === asked,
      missed: you.missed,
      rolls: view.round,
    });
    grantStickers(earned); // they show up behind the Stickers button
    saveProgress();
    recordClassGame(view, p);
    showRewards(earned);
    el.rewards.append(make('p', 'setting-help', 'Stay on this screen: your teacher can start another game.'));
  }

  function recordClassGame(view, p) {
    const you = view.you;
    const history = loadHistory();
    history.push({
      kind: 'class',
      at: Date.now(),
      duration: Date.now() - game.startedAt,
      code: view.code,
      size: view.settings.size,
      difficulty: view.settings.difficulty,
      name: you.name,
      statsName: statsName(p),
      rank: you.rank,
      of: view.of,
      score: you.score,
      answered: you.answered,
      firstTry: you.firstTry,
      timeouts: you.timeouts,
      times: p.stats.times.map(Math.round),
      missed: p.stats.missed,
    });
    saveHistory(history);
  }

  // ---- teacher

  let host = null; // { code, teacherKey, lan }
  let hostStop = null;
  let hostView = null;

  function segValue(group) {
    return group.querySelector('.selected').dataset.value;
  }
  function setSeg(group, value) {
    for (const b of group.querySelectorAll('button')) b.classList.toggle('selected', b.dataset.value === String(value));
  }
  for (const group of [el.hostType, el.hostSize, el.hostDifficulty, el.hostRounds]) {
    group.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      setSeg(group, b.dataset.value);
      if (group === el.hostType) renderHostType();
    });
  }

  // Game type: the whole class on one leaderboard, or head to head in pairs.
  const HOST_TYPE_HELP = {
    class: 'Everyone plays the same rolls on their own board, and the whole class shares one leaderboard.',
    pairs: 'Students are matched in twos and play head to head on a shared board, taking turns. With an odd number, the odd one out plays you or the CPU.',
    tournament: 'Short head-to-head games in a knockout, round robin, Swiss or king-of-the-hill tournament, with the bracket on your screen. Choose the format in the lobby.',
  };
  function renderHostType() {
    const type = segValue(el.hostType);
    for (const b of el.hostType.querySelectorAll('button')) b.setAttribute('aria-checked', String(b.dataset.value === type));
    el.hostTypeHelp.textContent = HOST_TYPE_HELP[type];
    el.hostRounds.closest('.field').hidden = type !== 'class'; // pairs and tournament games run by turns
    if (type === 'tournament' && segValue(el.hostSize) === '12') setSeg(el.hostSize, 8); // many short games: a small board
  }

  // Creating a class. Everything here (and more) can be changed in the lobby too.
  function openHostSetup() {
    // Hosting a class needs a teacher account (the server checks too)
    if (Auth && Auth.served() && Auth.role() !== 'teacher') return window.BlockoutAccounts.askTeacherSignIn();
    renderHostType();
    el.hostError.hidden = true;
    el.hostSetup.hidden = false;
    el.hostCreate.focus();
  }

  el.classHostOpen.addEventListener('click', openHostSetup);
  el.hostCancel.addEventListener('click', () => (el.hostSetup.hidden = true));
  el.hostCreate.addEventListener('click', async () => {
    const chosen = { size: Number(segValue(el.hostSize)), difficulty: segValue(el.hostDifficulty), rounds: Number(segValue(el.hostRounds)) };
    el.hostCreate.disabled = true;
    try {
      const room = await Classroom.createRoom({ ...chosen, type: segValue(el.hostType) });
      connectHost({ code: room.code, teacherKey: room.teacherKey, lan: room.lan });
      el.hostSetup.hidden = true;
    } catch (err) {
      el.hostError.textContent = err.message;
      el.hostError.hidden = false;
    } finally {
      el.hostCreate.disabled = false;
    }
  });

  function connectHost(h) {
    if (hostStop) hostStop();
    host = h;
    hostView = null;
    Classroom.saveHost(h);
    el.startScreen.hidden = true;
    el.gameScreen.hidden = true;
    el.hostScreen.hidden = false;
    el.hostCodeSmall.textContent = h.code;
    hostStop = Classroom.listenTeacher(h, { view: renderHost, gone: hostGone });
  }

  function hostGone(reason) {
    const had = Boolean(hostView);
    if (classSession && classSession.host) {
      if (classStop) classStop();
      classStop = null;
      classSession = null;
      Classroom.saveSession(null);
      if (game && game.mode === 'pair') game = null;
    }
    hostOnGame = false;
    el.gameScreen.hidden = true;
    el.gameOver.hidden = true;
    hostStop = null;
    host = null;
    hostView = null;
    Classroom.saveHost(null);
    el.hostScreen.hidden = true;
    el.startScreen.hidden = false;
    if (had && reason !== 'closed') toast('⚠️ Lost the class', 'The classroom server may have restarted.');
  }

  async function hostAction(action, extra) {
    try {
      await Classroom.teacher(host, action, extra);
    } catch (err) {
      toast('⚠️ ' + err.message);
    }
  }

  // The address to show on the board. localhost only works on this computer,
  // so use the network address the server found instead.
  function joinUrl(code) {
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    const base = local && host.lan && host.lan.length ? host.lan[0] : `${location.origin}${location.pathname}`;
    return { base, full: `${base}#class=${code}`, local: local && !(host.lan && host.lan.length) };
  }

  // ---- teacher: links to post in the class chat

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Older browsers or no permission: copy from a hidden text box
      const box = document.createElement('textarea');
      box.value = text;
      box.setAttribute('readonly', '');
      box.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.append(box);
      box.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (err) {}
      box.remove();
      return ok;
    }
  }

  async function copyWithFeedback(btn, text) {
    const label = btn.innerHTML;
    const ok = await copyText(text);
    btn.classList.add('copied');
    btn.textContent = ok ? '✓ Copied!' : 'Couldn’t copy';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = label;
    }, 1600);
  }

  const joinMessage = (code) => `Join our Blockout class! Tap this link: ${joinUrl(code).full} (class code ${code})`;

  el.hostCopyLink.addEventListener('click', () => hostView && copyWithFeedback(el.hostCopyLink, joinUrl(hostView.code).full));
  el.hostCopyMsg.addEventListener('click', () => hostView && copyWithFeedback(el.hostCopyMsg, joinMessage(hostView.code)));
  el.hostShareBtn.hidden = !navigator.share;
  el.hostShareBtn.addEventListener('click', () => {
    if (!hostView) return;
    navigator.share({ title: 'Blockout class', text: joinMessage(hostView.code), url: joinUrl(hostView.code).full }).catch(() => {});
  });
  el.hostCopyTeacher.addEventListener('click', () => hostView && copyWithFeedback(el.hostCopyTeacher, `${joinUrl(hostView.code).base}#class=${hostView.code}&play=${hostView.playKey}`));

  function renderHost(view) {
    const first = !hostView;
    hostView = view;
    const s = view.settings;
    el.hostLobby.hidden = view.state !== 'lobby';
    el.hostPlay.hidden = view.state !== 'playing';
    el.hostEnded.hidden = view.state !== 'ended';

    if (view.state === 'lobby') {
      const url = joinUrl(view.code);
      el.hostCode.textContent = view.code;
      el.hostUrl.textContent = url.base.replace(/^https?:\/\//, '').replace(/\/$/, '');
      el.hostLocalHelp.hidden = !url.local;
      if (first || el.hostQr.dataset.url !== url.full) {
        drawQr(el.hostQr, url.full);
        el.hostQr.dataset.url = url.full;
      }
      const pairs = view.type === 'pairs';
      renderHostSettings(view);
      el.hostPairs.hidden = !pairs;
      const n = view.players.length;
      el.hostStartBtn.disabled = !n;
      el.hostStartBtn.textContent = n ? `Start game (${n} ${n === 1 ? 'player' : 'players'})` : 'Waiting for players to join…';
      if (view.type === 'tournament') {
        el.hostStartBtn.disabled = n < 2;
        el.hostStartBtn.textContent = n >= 2 ? `Start the tournament (${n} players)` : 'A tournament needs at least 2 players…';
      }
      if (pairs) renderHostPairsLobby(view);
    } else if (view.state === 'playing' && view.type === 'tournament') {
      const t = view.tournament;
      renderHostMatches(view, el.hostMatches);
      renderTournament(t, el.hostTournament);
      const kothPlayed = t.hills.reduce((n, h) => n + h.played, 0);
      const kothTotal = t.hills.reduce((n, h) => n + h.limit, 0);
      el.hostRound.textContent = t.format === 'koth' ? `King of the hill · ${kothPlayed} of ${kothTotal} games` : `${TOURNAMENT_NAMES[t.format]} · ${t.label}`;
      el.hostNextBtn.replaceChildren(icon('chevron-right'), t.format === 'koth' ? ' Next games' : ' Next round');
      el.hostNextBtn.disabled = !t.roundReady;
      el.hostAuto.checked = view.autoNext;
    } else if (view.state === 'playing' && view.type === 'pairs') {
      renderHostMatches(view, el.hostMatches);
      const done = view.matches.filter((m) => m.over).length;
      el.hostRound.textContent = `Pairs · ${done} of ${view.matches.length} ${view.matches.length === 1 ? 'game' : 'games'} finished`;
    } else if (view.state === 'playing') {
      const [a, b] = view.roll;
      const sides = Core.DIFFICULTY_SIDES[s.difficulty];
      el.hostRound.textContent = `Roll ${view.round} of ${s.rounds}`;
      renderDie(el.hostDieA, a, sides);
      renderDie(el.hostDieB, b, sides);
      el.hostRollText.textContent = `Draw a ${a} by ${b} rectangle`;
      el.hostDoneFill.style.width = `${view.here ? (view.done / view.here) * 100 : 0}%`;
      el.hostDoneText.textContent = `${view.done} of ${view.here} done`;
      el.hostNextBtn.replaceChildren(icon(view.round >= s.rounds ? 'flag' : 'dices'), view.round >= s.rounds ? ' Finish game' : ' Next roll');
      el.hostAuto.checked = view.autoNext;
    } else {
      renderHostResults(view);
    }
    // whole class: dice and pacing; pairs: one card per pair; tournament: the bracket too
    const pairsPlaying = view.type !== 'class';
    const tourney = view.type === 'tournament';
    for (const node of [el.hostDice, el.hostRollText, el.hostProgress]) node.hidden = pairsPlaying;
    el.hostNextBtn.hidden = el.hostAutoLabel.hidden = view.type === 'pairs' || (tourney && view.tournament && view.tournament.format === 'koth');
    el.hostAutoLabel.lastChild.textContent = tourney ? ' Start the next round by itself' : ' Roll again by itself when everyone’s done';
    el.hostMatches.hidden = !pairsPlaying;
    el.hostTournament.hidden = !tourney || view.state !== 'playing';
    el.hostPodium.hidden = view.type === 'pairs';
    el.hostMatchResults.hidden = view.type !== 'pairs';
    el.hostTournamentFinal.hidden = !tourney || view.state !== 'ended';
    renderHostRoster(view);
    updateMyGameButton();
  }

  // ---- teacher: game settings in the lobby, for the whole class and free of shop locks

  // [value, label, detail]; `only` limits a setting to one game type
  const HOST_SETTINGS = [
    { key: 'size', label: 'Board size', options: [6, 8, 10, 12, 16, 20, 24].map((n) => [n, `${n}×${n}`]) },
    { key: 'difficulty', label: 'Difficulty', options: [['easy', 'Easy', '6-sided dice'], ['medium', 'Medium', '8-sided dice'], ['hard', 'Hard', '12-sided dice']] },
    {
      key: 'format',
      label: 'Tournament format',
      only: ['tournament'],
      wide: true,
      options: [
        ['knockout', 'Knockout', 'lose once and you’re out'],
        ['double', 'Double knockout', 'out after 2 losses'],
        ['roundrobin', 'Round robin', 'everyone plays everyone'],
        ['swiss', 'Swiss', 'set rounds, no knockouts'],
        ['koth', 'King of the hill', 'winner stays on'],
      ],
    },
    { key: 'swissRounds', label: 'Swiss rounds', only: ['tournament'], when: (s) => s.format === 'swiss', options: [2, 3, 4, 5].map((n) => [n, String(n)]) },
    { key: 'kothMatches', label: 'Games per hill', only: ['tournament'], when: (s) => s.format === 'koth', options: [6, 10, 15].map((n) => [n, String(n)]) },
    { key: 'matchTurns', label: 'Game length', only: ['pairs', 'tournament'], options: [[0, 'Full board'], [12, '6 turns each'], [8, '4 turns each']] },
    { key: 'rounds', label: 'Rolls in a game', only: ['class'], options: [[10, '10'], [15, '15'], [20, '20']] },
    { key: 'placeMode', label: 'Placing rectangles', options: [['choice', 'Their choice'], ['draw', 'Draw'], ['click', 'Click'], ['auto', 'Auto', 'fastest']] },
    { key: 'answerTime', label: 'Time to answer', options: [[0, 'No timer'], [30, '30 s'], [20, '20 s'], [10, '10 s']] },
    { key: 'autoRoll', label: 'Rolling', only: ['pairs', 'tournament'], options: [[false, 'Tap to roll'], [true, 'Auto roll']] },
    { key: 'fitRolls', label: 'Only rolls that fit', only: ['pairs', 'tournament'], options: [['end', 'Near the end'], ['always', 'Always'], ['never', 'Never']] },
    { key: 'cpuSpeed', label: 'CPU speed', only: ['pairs'], options: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']] },
  ];
  // "Make it quick": everything that saves time
  const QUICK_SETTINGS = { placeMode: 'auto', answerTime: 20, autoRoll: true, fitRolls: 'always', cpuSpeed: 'fast', matchTurns: 12 };

  function renderHostSettings(view) {
    const grid = el.hostSettingsGrid;
    if (!grid.children.length) {
      for (const def of HOST_SETTINGS) {
        const field = make('div', 'field' + (def.wide ? ' wide' : ''));
        field.append(make('span', null, def.label));
        const seg = make('div', 'segmented');
        seg.dataset.key = def.key;
        for (const [value, label, detail] of def.options) {
          const b = make('button', null, label);
          b.type = 'button';
          b.dataset.value = JSON.stringify(value);
          if (detail) b.append(' ', make('small', null, detail));
          seg.append(b);
        }
        field.append(seg);
        grid.append(field);
      }
    }
    HOST_SETTINGS.forEach((def, i) => {
      grid.children[i].hidden = (def.only && !def.only.includes(view.type)) || (def.when && !def.when(view.settings));
    });
    for (const seg of grid.querySelectorAll('.segmented')) {
      const current = JSON.stringify(view.settings[seg.dataset.key]);
      for (const b of seg.querySelectorAll('button')) b.classList.toggle('selected', b.dataset.value === current);
    }
    const quick = Object.entries(QUICK_SETTINGS).every(([k, v]) => view.settings[k] === v || (k === 'cpuSpeed' && view.type !== 'pairs') || (['autoRoll', 'fitRolls', 'cpuSpeed', 'matchTurns'].includes(k) && view.type === 'class'));
    el.hostQuick.disabled = quick;
  }

  el.hostSettingsGrid.addEventListener('click', (e) => {
    const b = e.target.closest('.segmented button');
    if (!b) return;
    const key = b.closest('.segmented').dataset.key;
    hostAction('settings', { settings: { [key]: JSON.parse(b.dataset.value) } });
  });
  el.hostQuick.addEventListener('click', () => hostAction('settings', { settings: QUICK_SETTINGS }));

  // ---- teacher: tournaments on the projector

  const TOURNAMENT_NAMES = { knockout: 'Knockout', double: 'Double knockout', roundrobin: 'Round robin', swiss: 'Swiss', koth: 'King of the hill' };

  // Knockouts: the bracket, a column per round. Other formats: the standings
  // table (and, for king of the hill, each hill's king and line).
  function renderTournament(t, box) {
    box.innerHTML = '';
    if (t.format === 'koth') {
      const hills = make('div', 'koth-hills');
      for (const h of t.hills) {
        const card = make('div', 'koth-hill');
        card.append(make('div', 'koth-title', t.hills.length > 1 ? `Hill ${h.id}` : 'The hill'));
        card.append(make('div', 'koth-king', h.king ? `👑 ${h.king}` : '👑 …'));
        if (h.streak > 1) card.append(make('div', 'koth-streak', `🔥 ${h.streak} wins in a row`));
        card.append(make('div', 'koth-queue', h.queue.length ? `Next: ${h.queue.join(', ')}` : ''));
        card.append(make('div', 'koth-count', `${h.played} of ${h.limit} games`));
        hills.append(card);
      }
      box.append(hills);
    }
    if (t.format === 'knockout' || t.format === 'double') {
      const cols = make('div', 'bracket');
      for (const r of t.rounds) {
        const col = make('div', 'bracket-round');
        col.append(make('div', 'bracket-label', r.label));
        for (const m of r.matches) {
          const game = make('div', 'bracket-match');
          for (const name of [m.a, m.b]) game.append(make('div', 'bracket-name' + (name === m.winner ? ' winner' : ' loser'), name));
          col.append(game);
        }
        for (const name of r.byes) col.append(make('div', 'bracket-bye', `${name}: bye`));
        cols.append(col);
      }
      box.append(cols);
    }
    if (t.format !== 'knockout') {
      const table = make('table', 'standings');
      const head = table.createTHead().insertRow();
      for (const h of ['', 'Name', 'W', 'L', t.format === 'koth' ? 'Best streak' : 'Points']) head.append(make('th', null, h));
      const body = table.createTBody();
      for (const x of t.standings) {
        const tr = body.insertRow();
        if (x.out) tr.className = 'out';
        tr.append(make('td', null, ordinal(x.place)), make('td', null, x.name), make('td', null, String(x.wins)), make('td', null, String(x.losses)), make('td', null, String(t.format === 'koth' ? x.bestStreak : x.points)));
      }
      box.append(table);
    }
  }

  function renderTournamentPodium(t) {
    el.hostPodium.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    for (const x of t.standings.filter((s) => s.place <= 3).slice(0, 4)) {
      const li = make('li', `podium-${x.place}`);
      li.append(make('span', 'podium-medal', medals[x.place - 1]), make('span', 'podium-name', x.name), make('span', 'podium-score', `${x.wins}–${x.losses}`));
      el.hostPodium.append(li);
    }
  }

  function renderTournamentRoster(view) {
    const t = view.tournament;
    el.hostRosterTitle.textContent = t.over ? 'Final standings' : 'Standings';
    el.hostRoster.innerHTML = '';
    el.hostRoster.classList.add('ranked');
    const byId = new Map(view.players.map((p) => [p.id, p]));
    const playingNow = new Set(view.matches.filter((m) => !m.over).flatMap((m) => m.players.map((p) => p.id)));
    for (const x of t.standings) {
      const p = byId.get(x.id);
      const li = make('li', (p && !p.connected ? 'offline ' : '') + (x.out ? 'knocked-out' : ''));
      li.append(make('span', 'host-rank', ordinal(x.place)), make('span', 'host-name', x.name), make('span', 'host-score', `${x.wins}–${x.losses}`));
      li.append(make('span', 'host-status', !p ? '👋' : t.over ? (x.place === 1 ? '🏆' : '') : !p.connected ? '📴' : playingNow.has(x.id) ? '🎲' : x.out ? '' : '⏳'));
      el.hostRoster.append(li);
    }
    for (const p of view.waiting || []) {
      const li = make('li', 'waiting');
      li.append(make('span', 'host-name', p.name), make('span', 'host-waiting', '⏳ next tournament'));
      el.hostRoster.append(li);
    }
  }

  // ---- teacher: pairs

  const MATCHING_HELP = {
    shuffle: 'New pairs are drawn when the game starts. Nobody gets last game’s partner if that can be helped.',
    keep: 'Same pairs as last game. Anyone new is paired up at the end.',
    arrange: 'Tap two names to swap them between pairs.',
  };
  let swapPick = null; // arranging pairs: the first name tapped

  function renderHostPairsLobby(view) {
    // Only "on this screen" plays from this page; otherwise let go of the teacher's
    // player here (another device or the CPU plays instead).
    if (view.pairOptions.odd !== 'screen' && classSession && classSession.host) {
      if (classStop) classStop();
      classStop = null;
      classSession = null;
      Classroom.saveSession(null);
      if (game && game.mode === 'pair') game = null;
    }
    setSeg(el.hostMatching, view.pairOptions.matching);
    setSeg(el.hostOdd, view.pairOptions.odd);
    const n = view.players.length;
    const odd = view.odd;
    const who = { screen: 'you, here on this screen', device: 'you, on your other device', cpu: 'the CPU' }[view.pairOptions.odd];
    el.hostPairsHelp.textContent = `${MATCHING_HELP[view.pairOptions.matching]} ${n ? `${n} ${n === 1 ? 'student' : 'students'}: ` : ''}${odd.needed ? `the odd one out plays ${who}.` : n ? 'everyone has a partner.' : ''}`;
    // Pairs preview (shuffle mode draws new ones at the start)
    el.hostPairList.hidden = view.pairOptions.matching === 'shuffle' || !n;
    el.hostPairList.innerHTML = '';
    const arrange = view.pairOptions.matching === 'arrange';
    if (swapPick && !view.players.some((p) => p.id === swapPick)) swapPick = null;
    const nameChip = (p) => {
      if (!arrange) return make('span', 'pair-name', p.name);
      const b = make('button', 'pair-name' + (swapPick === p.id ? ' picked' : ''), p.name);
      b.type = 'button';
      b.addEventListener('click', () => {
        if (!swapPick) swapPick = p.id;
        else if (swapPick === p.id) swapPick = null;
        else {
          hostAction('swap', { a: swapPick, b: p.id });
          swapPick = null;
        }
        renderHostPairsLobby(hostView);
      });
      return b;
    };
    for (const [a, b] of view.pairs) {
      const li = make('li');
      li.append(nameChip(a), make('span', 'pair-vs', 'vs'));
      li.append(b ? nameChip(b) : make('span', 'pair-name other', view.pairOptions.odd === 'cpu' ? 'CPU' : 'You'));
      el.hostPairList.append(li);
    }
    // Playing the odd one out from another device: its link and whether it has joined
    const device = view.pairOptions.odd === 'device';
    el.hostTeacherDevice.hidden = !device;
    if (device) {
      const url = `${joinUrl(view.code).base}#class=${view.code}&play=${view.playKey}`;
      el.hostTeacherUrl.textContent = url.replace(/^https?:\/\//, '');
      if (el.hostTeacherQr.dataset.url !== url) {
        drawQr(el.hostTeacherQr, url);
        el.hostTeacherQr.dataset.url = url;
      }
      const joined = view.teacher && view.teacher.connected;
      el.hostTeacherStatus.textContent = joined ? '✓ Your other device has joined.' : 'Not joined yet.';
      el.hostTeacherStatus.classList.toggle('ok', Boolean(joined));
    }
    if (odd.needed && !odd.ready) {
      el.hostStartBtn.disabled = true;
      el.hostStartBtn.textContent = 'Waiting for your other device to join…';
    } else if (n) {
      const games = Math.ceil(n / 2);
      el.hostStartBtn.textContent = `Start ${games} ${games === 1 ? 'game' : 'games'} (${n} ${n === 1 ? 'student' : 'students'})`;
    }
  }

  for (const [group, key] of [
    [el.hostMatching, 'matching'],
    [el.hostOdd, 'odd'],
  ]) {
    group.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) hostAction('pairOptions', { options: { [key]: b.dataset.value } });
    });
  }

  // One card per pair: both names and scores, whose turn it is, and how it ended.
  function renderHostMatches(view, list) {
    list.innerHTML = '';
    for (const m of view.matches) {
      const li = make('li', 'host-match' + (m.over ? ' over' : ''));
      m.players.forEach((p, i) => {
        const row = make('div', 'match-row' + (m.over && m.winner === p.id ? ' winner' : ''));
        const turn = !m.over && m.current === i;
        row.append(make('span', 'match-turn', turn ? '🎲' : m.over && m.winner === p.id ? '🏆' : ''), make('span', 'match-name', p.name), make('span', 'match-score', String(p.score)));
        li.append(row);
      });
      const left = m.left && m.players.find((p) => p.id === m.left);
      const status = m.over ? (left ? `${left.name} left` : m.winner ? 'Finished' : 'Tie!') : `Board ${Math.round(m.filled * 100)}% full`;
      li.append(make('div', 'match-status', status));
      list.append(li);
    }
  }

  // ---- teacher: playing the odd one out on this screen

  let hostOnGame = false; // showing the teacher's own game instead of the class

  function showHostView() {
    hostOnGame = false;
    el.gameScreen.hidden = true;
    el.gameOver.hidden = true;
    el.hostScreen.hidden = !host;
    if (!host) el.startScreen.hidden = false;
    updateMyGameButton();
  }

  function showMyGame() {
    if (!game || game.mode !== 'pair') return;
    hostOnGame = true;
    el.hostScreen.hidden = true;
    el.gameScreen.hidden = false;
    resizeBoard();
    render();
    if (game.phase === 'over') {
      el.gameOver.hidden = false;
      el.gameOver.querySelector('.dialog').scrollTop = 0;
    }
  }

  function updateMyGameButton() {
    const btn = el.hostMyGameBtn;
    const mine = classSession && classSession.host && game && game.mode === 'pair';
    btn.hidden = !mine || !hostView || hostView.state === 'lobby';
    if (btn.hidden) return;
    const opp = opponent();
    const yourTurn = game.phase !== 'over' && game.current === game.classroom.me;
    btn.textContent = game.phase === 'over' ? `Your game with ${opp.name} is over: see the result` : yourTurn ? `🎲 Your turn! Play your game with ${opp.name}` : `Your game with ${opp.name}`;
    btn.classList.toggle('your-turn', yourTurn);
  }
  el.hostMyGameBtn.addEventListener('click', showMyGame);

  function renderHostRoster(view) {
    if (view.type === 'tournament' && view.tournament) return renderTournamentRoster(view);
    const n = view.players.length;
    el.hostRosterTitle.textContent = view.state === 'lobby' ? `${n} joined` : view.state === 'playing' ? 'Leaderboard' : 'Final scores';
    el.hostRoster.innerHTML = '';
    el.hostRoster.classList.toggle('ranked', view.state !== 'lobby');
    if (!n) el.hostRoster.append(make('li', 'host-empty', 'Nobody yet. Names show up here as students join.'));
    for (const p of view.players) {
      const li = make('li', p.connected ? '' : 'offline');
      if (view.state !== 'lobby') li.append(make('span', 'host-rank', ordinal(p.rank)));
      li.append(make('span', 'host-name', p.name));
      if (view.state === 'lobby') {
        const remove = make('button', 'host-remove', '×');
        remove.type = 'button';
        remove.title = `Remove ${p.name}`;
        remove.setAttribute('aria-label', `Remove ${p.name}`);
        remove.addEventListener('click', () => confirm(`Remove ${p.name} from the class?`) && hostAction('remove', { id: p.id }));
        li.append(remove);
      } else {
        li.append(make('span', 'host-score', `${p.score}`));
        const match = view.type === 'pairs' && view.matches.find((m) => m.players.some((x) => x.id === p.id));
        const pairStatus = match ? (match.over ? '🏁' : match.players[match.current].id === p.id ? '🎲' : '') : '';
        const status = !p.connected ? '📴' : view.state !== 'playing' ? '' : view.type === 'pairs' ? pairStatus : p.done ? '✓' : '…';
        li.append(make('span', 'host-status', status));
        li.title = !p.connected ? 'Not connected' : view.type === 'pairs' ? '' : p.done ? 'Done with this roll' : 'Still working';
      }
      el.hostRoster.append(li);
    }
    // Joined after the game started: they play the next one
    for (const p of view.waiting || []) {
      const li = make('li', 'waiting' + (p.connected ? '' : ' offline'));
      li.append(make('span', 'host-name', p.name), make('span', 'host-waiting', '⏳ next game'));
      li.title = 'Joined after this game started';
      el.hostRoster.append(li);
    }
  }

  function renderHostResults(view) {
    if (view.type === 'pairs') renderHostMatches(view, el.hostMatchResults);
    if (view.type === 'tournament' && view.tournament) {
      renderTournament(view.tournament, el.hostTournamentFinal);
      renderTournamentPodium(view.tournament);
      renderHostReport(view);
      return;
    }
    el.hostPodium.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    for (const p of view.players.filter((x) => x.rank <= 3).slice(0, 5)) {
      const li = make('li', `podium-${p.rank}`);
      li.append(make('span', 'podium-medal', medals[p.rank - 1]), make('span', 'podium-name', p.name), make('span', 'podium-score', `${p.score} pts`));
      el.hostPodium.append(li);
    }
    renderHostReport(view);
  }

  function renderHostReport(view) {
    const r = view.report;
    el.hostReport.innerHTML = '';
    const tile = (value, label) => {
      const t = make('div', 'tile');
      t.append(make('span', 'tile-value', value), make('span', 'tile-label', label));
      return t;
    };
    el.hostReport.append(
      tile(r.asked ? `${Math.round((r.firstTry / r.asked) * 100)}%` : '—', 'right first time'),
      tile(r.avgMs ? `${(r.avgMs / 1000).toFixed(1)} s` : '—', 'average answer'),
      tile(String(r.asked), 'facts answered')
    );
    el.hostHardest.innerHTML = '';
    if (!r.hardest.length) el.hostHardest.append(make('li', 'host-empty', 'Nothing missed. What a class! 🌟'));
    for (const f of r.hardest) {
      const li = make('li');
      li.append(make('span', 'host-fact', f.fact), make('span', 'host-missed', `missed ${f.missed} of ${f.asked}`));
      el.hostHardest.append(li);
    }
  }

  el.hostStartBtn.addEventListener('click', async () => {
    const v = hostView;
    if (v && v.type === 'pairs' && v.odd.needed && v.odd.how === 'screen' && !(classSession && classSession.host)) {
      // The odd one out plays the teacher, here: join as a player first
      try {
        const me = await Classroom.joinAsTeacher(host);
        connectClass({ code: host.code, id: me.id, key: me.key, name: me.name, teacher: true, host: true });
      } catch (err) {
        return toast('⚠️ ' + err.message);
      }
    }
    hostAction('start');
  });
  el.hostNextBtn.addEventListener('click', () => hostAction('next'));
  el.hostEndBtn.addEventListener('click', () => confirm('End the game now? Scores so far are final.') && hostAction('end'));
  el.hostAuto.addEventListener('change', () => hostAction('autoNext', { on: el.hostAuto.checked }));
  el.hostAgainBtn.addEventListener('click', () => hostAction('lobby'));
  async function closeClass() {
    if (!confirm('Close the class? Everyone goes back to their menu.')) return;
    const h = host;
    if (hostStop) hostStop();
    await Classroom.teacher(h, 'close').catch(() => {});
    hostGone('closed');
  }
  el.hostCloseBtn.addEventListener('click', closeClass);
  el.hostClose2Btn.addEventListener('click', closeClass);
  // Space rolls again on the teacher's screen
  document.addEventListener('keydown', (e) => {
    if (el.hostScreen.hidden || !hostView || e.target.closest('input, button, .overlay')) return;
    if ((e.key === ' ' || e.key === 'Enter') && hostView.state === 'playing' && hostView.type === 'class') {
      e.preventDefault();
      hostAction('next');
    }
  });

  // ---- after a reload: pick up where this browser left off

  if (Classroom.served()) {
    const savedHost = Classroom.host();
    const savedSession = Classroom.session();
    const link = Classroom.linkFromHash();
    if (link) {
      history.replaceState(null, '', location.pathname + location.search);
      tap('[data-mode="multi"]');
      tap('#multi-kind [data-kind="classroom"]');
      if (savedSession && savedSession.code === link.code) connectClass(savedSession);
      else if (link.play) {
        // the teacher's other device, for playing an odd one out
        Classroom.joinWithPlayKey(link.code, link.play)
          .then((me) => {
            connectClass({ code: link.code, id: me.id, key: me.key, name: me.name, teacher: true });
            showClassWaiting(null);
          })
          .catch((err) => toast('⚠️ ' + err.message));
      } else openClassJoin(link.code, true);
    } else {
      if (savedHost) connectHost(savedHost);
      if (savedSession && (!savedHost || savedSession.host)) connectClass(savedSession);
    }
  }

  // Board wins started being counted when winning a board revealed the next one:
  // give credit for wins already in the game history (once).
  if (!progress.boardWinsFromHistory) {
    for (const g of loadHistory()) {
      if (!g.kind && g.vsComputer && g.players.some((p) => !p.cpu && p.result === 'win')) Progress.recordBoardWin(progress, g.size);
    }
    progress.boardWinsFromHistory = true;
    saveProgress();
    syncBoardLocks();
  }

  // ---------------------------------------------------------------- cheat codes
  // Press ~ anywhere (outside a text box) to open the cheat codes box.

  // code (lower case) -> { name, run() }. None yet.
  // Codes live in Progress.CHEAT_CODES. The menu lists the ones that are on by
  // what they do (never the code itself), each with a Turn off button.
  const cheatsEl = { box: $('cheats'), form: $('cheats-form'), input: $('cheats-input'), msg: $('cheats-msg'), close: $('cheats-close'), active: $('cheats-active') };
  const inClassGame = () => game && (game.mode === 'class' || game.mode === 'pair');

  // Unlocks changed: bring every menu, list and lock badge up to date.
  function refreshUnlocks() {
    enforceLocks();
    saveSettings();
    saveProgress();
    refreshAvailableFilters();
    if (!el.shopDialog.hidden) renderShop();
    if (!el.wardrobeDialog.hidden) renderWardrobe();
    syncSettingsUI();
    syncBoardLocks();
    syncModeLocks();
    updatePracticePreview();
    renderGameLevel();
    renderBoardHint();
    refreshOpenNudges();
    updateMenuBadges();
  }

  function renderActiveCheats() {
    const codes = Progress.activeCheats(progress);
    cheatsEl.active.hidden = !codes.length;
    cheatsEl.active.replaceChildren();
    if (!codes.length) return;
    cheatsEl.active.append(make('h3', null, 'Active'));
    for (const code of codes) {
      const row = make('div', 'cheat-row');
      const off = make('button', 'btn btn-small', 'Turn off');
      off.type = 'button';
      off.addEventListener('click', () => {
        Progress.cheatOff(progress, code);
        refreshUnlocks();
        renderActiveCheats();
        cheatsEl.msg.className = 'cheats-msg';
        cheatsEl.msg.textContent = 'Cheat turned off.';
      });
      row.append(make('span', null, `✨ ${Progress.CHEAT_CODES[code].name}`), off);
      cheatsEl.active.append(row);
    }
  }

  function openCheats() {
    cheatsEl.input.value = '';
    cheatsEl.input.classList.remove('wrong');
    cheatsEl.msg.className = 'cheats-msg';
    cheatsEl.msg.textContent = inClassGame() ? 'Cheats are switched off in class games. Nice try! 😄' : '';
    renderActiveCheats();
    cheatsEl.box.hidden = false;
    cheatsEl.input.focus();
  }
  const closeCheats = () => (cheatsEl.box.hidden = true);

  document.addEventListener('keydown', (e) => {
    if (e.key !== '~' && e.key !== '`') return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, select')) return;
    if ([...document.querySelectorAll('.overlay')].some((o) => !o.hidden)) return; // not on top of another dialog
    e.preventDefault();
    openCheats();
  });
  cheatsEl.close.addEventListener('click', closeCheats);
  cheatsEl.box.addEventListener('click', (e) => e.target === cheatsEl.box && closeCheats());
  cheatsEl.box.addEventListener('keydown', (e) => e.key === 'Escape' && closeCheats());
  cheatsEl.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = cheatsEl.input.value.trim().toLowerCase();
    if (!code || inClassGame()) return;
    cheatsEl.input.classList.remove('wrong');
    cheatsEl.input.value = '';
    if (Progress.CHEAT_CODES[code]) {
      const on = Progress.cheatOn(progress, code);
      if (on) {
        confettiFullScreen(3);
        celebrate(Progress.awardAchievements(progress, { event: 'cheat', code })); // Cheater, plus this code's secret
        refreshUnlocks();
      }
      renderActiveCheats();
      cheatsEl.msg.className = 'cheats-msg good';
      cheatsEl.msg.textContent = on ? `✨ ${Progress.CHEAT_CODES[code].name}` : 'That one is already on.';
      return;
    }
    void cheatsEl.input.offsetWidth; // restart the shake
    cheatsEl.input.classList.add('wrong');
    cheatsEl.msg.className = 'cheats-msg';
    cheatsEl.msg.textContent = 'Nothing happened…';
  });

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
    if (classSession && classSession.host) return showHostView(); // teacher: back to the class
    const inClass = game && (game.mode === 'class' || game.mode === 'pair');
    const question = inClass ? 'Leave the class game? Your score so far won’t count.' : 'Leave this game and go back to the menu?';
    if (game && game.phase !== 'over' && !confirm(question)) return;
    if (inClass) leaveClass();
    toMenu();
  });
  el.toMenuBtn.addEventListener('click', () => {
    if (classSession && classSession.host) {
      el.gameOver.hidden = true;
      return showHostView();
    }
    if (game && (game.mode === 'class' || game.mode === 'pair')) leaveClass();
    toMenu();
  });
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
  // Pips for a normal d6 (dots, or the Wardrobe's hearts/stars/…); 8- and
  // 12-sided dice show the number. `skin` defaults to the Wardrobe's dice.
  function renderDie(die, value, sides = game ? game.sides : 6, skin = settings.cosmetics.dice) {
    die.innerHTML = '';
    for (const c of [...die.classList]) if (c.startsWith('skin-')) die.classList.remove(c);
    die.classList.add(`skin-${skin}`);
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
    const glyph = look('pips').glyph; // e.g. '❤️'; plain dots when undefined
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('span');
      if (on.includes(i)) {
        cell.className = glyph ? 'pip pip-glyph' : 'pip';
        if (glyph) cell.textContent = glyph;
      }
      die.append(cell);
    }
  }

  function render() {
    if (!game) return;
    const p = currentPlayer();
    el.turnPanel.style.setProperty('--turn-color', p.color);
    el.turnLabel.textContent =
      game.phase === 'over'
        ? 'Game over'
        : game.mode === 'class'
          ? game.classroom.round
            ? `Roll ${game.classroom.round} of ${game.classroom.view.settings.rounds}`
            : 'Class game'
          : game.mode === 'pair'
            ? game.current === game.classroom.me
              ? 'Your turn'
              : `${p.name}'s turn`
          : game.mode === 'single' && !p.cpu
            ? 'Your turn'
            : `${p.name}'s turn`;
    el.rollBtn.disabled = game.phase !== 'roll';
    const realDice = game.diceMode === 'real';
    el.rollBtn.hidden = p.cpu || realDice || game.mode === 'class' || !['roll', 'rolling'].includes(game.phase);
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
      name.textContent = p.avatar ? `${p.avatar} ${p.name}` : p.name;
      if (p.title) {
        name.append(make('span', 'player-title', p.title));
      }
      const pts = document.createElement('span');
      pts.className = 'score-pts';
      pts.textContent = p.score;
      head.append(name, pts);
      card.append(head);
      if (game.mode === 'class' && game.classroom.view && game.classroom.view.of > 1) {
        const { you, of } = game.classroom.view;
        card.append(make('div', 'score-rank', `🏫 ${you.tied ? 'Tied for ' : ''}${ordinal(you.rank)} of ${of} in the class`));
      }

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
    Object.assign(pal, BOARD_THEMES[settings.cosmetics.board] || {}); // Wardrobe board
  }

  // Wardrobe boards: colours plus a little decoration. Graph paper follows the theme.
  const BOARD_THEMES = {
    graph: null,
    notebook: { bg: '#fdfdf6', grid: '#b9d3ea', edge: '#2b2a33', hint: '#8a8f99', fade: 'rgba(253, 253, 246, 0.65)', decor: 'notebook' },
    chalkboard: { bg: '#2f4f3a', grid: 'rgba(255, 255, 255, 0.16)', edge: '#1b3024', hint: '#d7e8dc', fade: 'rgba(47, 79, 58, 0.7)', wrong: '#c9d6cc', decor: 'chalk' },
    beach: { bg: '#f4e1b0', grid: 'rgba(150, 110, 50, 0.25)', edge: '#b58a4a', hint: '#8a6a3a', fade: 'rgba(244, 225, 176, 0.65)', decor: 'sand' },
    space: { bg: '#10143a', grid: 'rgba(255, 255, 255, 0.12)', edge: '#3a3f7a', hint: '#aab0e0', fade: 'rgba(16, 20, 58, 0.7)', wrong: '#aab0e0', decor: 'stars' },
    snow: { bg: '#eef6ff', grid: '#c8dcf0', edge: '#7a9cc0', hint: '#6d86a4', fade: 'rgba(238, 246, 255, 0.65)', decor: 'flakes' },
  };

  // Repeatable pseudo-random numbers so decorations don't jump around on every redraw.
  function decorRandom(seed) {
    let a = seed;
    return () => {
      a = (a * 1103515245 + 12345) % 2147483648;
      return a / 2147483648;
    };
  }

  function drawBoardDecor(kind, cell) {
    const r = decorRandom(7);
    ctx.save();
    if (kind === 'notebook') {
      ctx.strokeStyle = 'rgba(230, 110, 110, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cell * 0.5, 0);
      ctx.lineTo(cell * 0.5, cssSize);
      ctx.stroke();
    } else if (kind === 'stars' || kind === 'flakes' || kind === 'sand' || kind === 'chalk') {
      const count = kind === 'sand' ? 260 : kind === 'chalk' ? 40 : 90;
      for (let i = 0; i < count; i++) {
        const x = r() * cssSize;
        const y = r() * cssSize;
        const size = kind === 'chalk' ? 6 + r() * 14 : 0.6 + r() * (kind === 'flakes' ? 2.2 : 1.6);
        ctx.fillStyle =
          kind === 'stars' ? `rgba(255, 255, 255, ${0.35 + r() * 0.6})` :
          kind === 'flakes' ? 'rgba(160, 190, 225, 0.6)' :
          kind === 'sand' ? 'rgba(160, 120, 60, 0.35)' : 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Wardrobe rectangle patterns: light marks over your own rectangles.
  const patternCache = {};
  function rectPattern(kind) {
    if (patternCache[kind]) return patternCache[kind];
    const tile = document.createElement('canvas');
    tile.width = tile.height = 16;
    const g = tile.getContext('2d');
    g.strokeStyle = g.fillStyle = 'rgba(255, 255, 255, 0.35)';
    g.lineWidth = 3;
    if (kind === 'stripes') {
      g.beginPath();
      g.moveTo(-4, 20);
      g.lineTo(20, -4);
      g.moveTo(-4, 4);
      g.lineTo(4, -4);
      g.moveTo(12, 20);
      g.lineTo(20, 12);
      g.stroke();
    } else if (kind === 'dots') {
      g.beginPath();
      g.arc(4, 4, 2.5, 0, Math.PI * 2);
      g.arc(12, 12, 2.5, 0, Math.PI * 2);
      g.fill();
    } else if (kind === 'bricks') {
      g.lineWidth = 1.5;
      g.strokeRect(0, 0.75, 16, 7.5);
      g.beginPath();
      g.moveTo(8, 8);
      g.lineTo(8, 16);
      g.stroke();
    } else if (kind === 'checker') {
      g.fillRect(0, 0, 8, 8);
      g.fillRect(8, 8, 8, 8);
    } else if (kind === 'wood') {
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(0, 4);
      g.bezierCurveTo(5, 2, 11, 6, 16, 4);
      g.moveTo(0, 11);
      g.bezierCurveTo(5, 13, 11, 9, 16, 11);
      g.stroke();
    }
    return (patternCache[kind] = ctx.createPattern(tile, 'repeat'));
  }

  // ---- placing effects: redraw the board for a moment after a rectangle lands
  const PLACE_FX_MS = 650;
  let boardAnimUntil = 0;
  function animateBoard(ms) {
    const already = boardAnimUntil > performance.now();
    boardAnimUntil = Math.max(boardAnimUntil, performance.now() + ms);
    if (already) return;
    const step = () => {
      drawBoard();
      if (performance.now() < boardAnimUntil) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

  function drawBoard() {
    if (!game || !cssSize) return;
    readPalette();
    const n = game.size;
    const cell = cssSize / n;
    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, cssSize, cssSize);
    if (pal.decor) drawBoardDecor(pal.decor, cell);

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
    const t = rect.fx ? Math.min(1, (performance.now() - rect.placedAt) / PLACE_FX_MS) : 1;
    if (rect.fx === 'pop' && t < 1) return drawPopIn(rect, color, cell, t);
    const owner = game.players[rect.player];
    ctx.save();
    if (rect.fx === 'glow' && t < 1) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 36 * (1 - t);
    }
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.82;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    if (!owner.cpu && settings.cosmetics.pattern !== 'none') {
      ctx.fillStyle = rectPattern(settings.cosmetics.pattern);
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = shade(color, -0.35);
    ctx.lineWidth = highlight ? 3.5 : 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    if (rect.fx === 'ripple' && t < 1) {
      const grow = t * cell * 0.9;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x - grow, y - grow, w + grow * 2, h + grow * 2);
      ctx.restore();
    }
    if (game.counting && game.counting.rect === rect) drawCounting(game.counting, color, cell);
    else drawLabel(rect, x, y, w, h, cell);
  }

  // Pop-in: the squares spring up one after another.
  function drawPopIn(rect, color, cell, t) {
    const total = rect.w * rect.h;
    ctx.fillStyle = color;
    for (let k = 0; k < total; k++) {
      const local = Math.max(0, Math.min(1, (t - (k / total) * 0.55) / 0.45));
      if (!local) continue;
      const s = easeOutBack(local);
      const cx = (rect.x + (k % rect.w) + 0.5) * cell;
      const cy = (rect.y + Math.floor(k / rect.w) + 0.5) * cell;
      const half = (cell / 2) * s;
      ctx.globalAlpha = 0.82;
      ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
    }
    ctx.globalAlpha = 1;
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

  // For the account screens (js/accounts.js): what they need from the game.
  window.BlockoutGame = {
    progress: () => progress,
    replaceProgress,
    saveProgress,
    openHostSetup,
    startHost: (h) => connectHost(h),
    joinClass: (code) => openClassJoin(code, true),
    renderFactGrid,
    renderFactLegend,
    make,
    icon,
    toast,
    celebrate,
    menuShowing: () => !el.startScreen.hidden,
  };

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
