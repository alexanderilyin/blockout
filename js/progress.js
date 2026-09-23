// Blockout progress: the shared points wallet, shop unlocks, achievements,
// daily check-ins, answer bonuses and lifetime multiplication-fact stats.
// Pure functions over a plain state object; the page saves it to localStorage.
// Loaded as a plain script in the browser (window.BlockoutProgress) and via require() in tests.
(function (root) {
  'use strict';

  function createProgress() {
    return {
      version: 1,
      wallet: 0, // points available to spend
      earned: 0, // all points ever earned
      unlocks: [], // shop item ids
      achievements: {}, // id -> time earned
      checkIn: { last: null, streak: 0 },
      facts: {}, // player key -> { name, facts: { '3 × 4': FactStats } }; 3 × 4 and 4 × 3 are separate
      factsOrdered: true,
      counters: { games: 0, classGames: 0 },
      stickers: {}, // sticker id -> how many
    };
  }

  // Fill in anything missing from an older or partial saved state.
  function normalize(saved) {
    const fresh = createProgress();
    if (!saved || typeof saved !== 'object') return fresh;
    const state = {
      ...fresh,
      ...saved,
      checkIn: { ...fresh.checkIn, ...saved.checkIn },
      counters: { ...fresh.counters, ...saved.counters },
      unlocks: Array.isArray(saved.unlocks) ? saved.unlocks : [],
      achievements: saved.achievements || {},
      facts: saved.facts || {},
      stickers: saved.stickers || {},
      seen: { wardrobe: [], stickers: [], ...(saved.seen || {}) }, // for "new" badges
      factsOrdered: true,
    };
    if (!saved.factsOrdered) splitOldFacts(state.facts);
    // The old all-in-one timer unlock (10/20/30 s) becomes the 30 s and 10 s unlocks.
    if (state.unlocks.includes('answerTime')) {
      state.unlocks = state.unlocks.filter((id) => id !== 'answerTime');
      for (const id of ['answerTime30', 'answerTime10']) if (!state.unlocks.includes(id)) state.unlocks.push(id);
    }
    return state;
  }

  // Older saves merged 3 × 4 with 4 × 3 (stored as the smaller number first).
  // We can't tell which order was asked, so each old fact starts both orders.
  function splitOldFacts(facts) {
    for (const player of Object.values(facts)) {
      for (const [key, f] of Object.entries(player.facts || {})) {
        const [a, b] = key.split('×').map((n) => Number(n.trim()));
        const flipped = factKey(b, a);
        if (a !== b && !player.facts[flipped]) player.facts[flipped] = { ...f, said: [...(f.said || [])] };
      }
    }
  }

  function addPoints(state, points) {
    state.wallet += points;
    state.earned += points;
  }

  // ---------------------------------------------------------------- answer bonuses

  const BONUS = { firstTry: 2, quick: 3, quickMs: 5000, streakFrom: 3, streakMax: 5 };

  // Extra points for a correct answer, on top of the rectangle's squares.
  // Only first-try answers earn bonuses; a streak counts first-try answers in a row.
  function answerBonus({ firstTry, ms, streak }) {
    const parts = [];
    if (firstTry) {
      parts.push({ label: 'first try', points: BONUS.firstTry });
      if (ms <= BONUS.quickMs) parts.push({ label: 'speedy', points: BONUS.quick });
      if (streak >= BONUS.streakFrom) {
        parts.push({ label: `streak ${streak}`, points: Math.min(streak - BONUS.streakFrom + 1, BONUS.streakMax) });
      }
    }
    return { total: parts.reduce((sum, p) => sum + p.points, 0), parts };
  }

  // ---------------------------------------------------------------- shop

  const SHOP = [
    { id: 'multiplayer', group: 'Modes', name: 'Multiplayer (2 players)', price: 150 },
    { id: 'players3', group: 'Modes', name: 'Multiplayer: 3 players', price: 100, requires: 'multiplayer' },
    { id: 'players4', group: 'Modes', name: 'Multiplayer: 4 players', price: 100, requires: 'multiplayer' },
    { id: 'practice', group: 'Modes', name: 'Practice mode', price: 100 },
    { id: 'board16', group: 'Boards', name: 'Medium board (16×16)', price: 150 },
    { id: 'board20', group: 'Boards', name: 'Large board (20×20)', price: 300 },
    { id: 'boardCustom', group: 'Boards', name: 'Custom board size', price: 400 },
    { id: 'difficulty.medium', group: 'Difficulty', name: 'Medium: 8-sided dice', price: 250 },
    { id: 'difficulty.hard', group: 'Difficulty', name: 'Hard: 12-sided dice', price: 500, requires: 'difficulty.medium' },
    { id: 'placeMode', group: 'Settings', name: 'Click to place & Auto placing', price: 80 },
    { id: 'diceMode', group: 'Settings', name: 'Real dice', price: 60 },
    { id: 'autoRoll', group: 'Settings', name: 'Auto roll', price: 40 },
    { id: 'fitRolls', group: 'Settings', name: '"No room" options: Always fit & Original rules', price: 40 },
    { id: 'answerTime30', group: 'Settings', name: 'Answer timer: 30 seconds', price: 30 },
    { id: 'answerTime10', group: 'Settings', name: 'Answer timer: 10 seconds', price: 10 },
    { id: 'answerTime5', group: 'Settings', name: 'Answer timer: 5 seconds', price: 5 },
    { id: 'cpuSpeed', group: 'Settings', name: 'Slow & fast CPU explanations', price: 40 },
    { id: 'cpuEnd', group: 'Settings', name: 'Press a button after CPU turns', price: 40 },
    { id: 'cpuInstant', group: 'Settings', name: 'Instant CPU turns', price: 80 },
    { id: 'showProgress', group: 'Settings', name: 'Board progress bar', price: 30 },
    { id: 'firstInCorner', group: 'Settings', name: 'Corner rule', price: 30 },
    { id: 'practiceExpert', group: 'Practice', name: 'Expert practice: no picture, no help, ×2 bonus points', price: 200, requires: 'practice' },
    { id: 'timesMastered', group: 'Stats', name: 'Best times on Mastered cells', price: 50 },
    { id: 'timesLearning', group: 'Stats', name: 'Best times on Learning cells', price: 50 },
    { id: 'timesPractice', group: 'Stats', name: 'Best times on Needs practice cells', price: 50 },
    { id: 'goldenDice', group: 'Extras', name: 'Golden dice ✨', price: 10000 },
  ];

  function shopItem(id) {
    return SHOP.find((item) => item.id === id) || null;
  }

  // Free things (no id) are always unlocked.
  function isUnlocked(state, id) {
    return !id || state.unlocks.includes(id);
  }

  function canBuy(state, id, now = new Date()) {
    const item = shopItem(id);
    if (!item) return { ok: false, reason: 'unknown' };
    if (isUnlocked(state, id)) return { ok: false, reason: 'owned' };
    if (item.available && !item.available(now)) return { ok: false, reason: 'season', when: item.seasonLabel };
    if (item.requires && !isUnlocked(state, item.requires)) return { ok: false, reason: 'requires', requires: item.requires };
    if (state.wallet < item.price) return { ok: false, reason: 'points', missing: item.price - state.wallet };
    return { ok: true };
  }

  function buy(state, id, now = new Date()) {
    const check = canBuy(state, id, now);
    if (!check.ok) return check;
    state.wallet -= shopItem(id).price;
    state.unlocks.push(id);
    return { ok: true };
  }

  // ---------------------------------------------------------------- daily check-in

  function dayKey(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  // First visit of the day earns a bonus that grows with the streak of days in a row.
  // Returns null if already checked in today.
  function checkIn(state, now = new Date()) {
    const today = dayKey(now);
    if (state.checkIn.last === today) return null;
    const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const streak = state.checkIn.last === yesterday ? state.checkIn.streak + 1 : 1;
    const bonus = 20 + 5 * Math.min(streak - 1, 6);
    state.checkIn = { last: today, streak };
    addPoints(state, bonus);
    return { bonus, streak };
  }

  // ---------------------------------------------------------------- lifetime fact stats

  // Order matters: knowing 5 × 6 doesn't mean knowing 6 × 5, so they're separate facts.
  function factKey(a, b) {
    return `${a} × ${b}`;
  }

  function playerKey(name) {
    return name.trim().toLowerCase();
  }

  // One question answered (or timed out) by a human player.
  function recordAnswer(state, name, { a, b, firstTry, correct, wrongAnswers = [], timeout = false, ms = null }) {
    const key = playerKey(name);
    const player = state.facts[key] || (state.facts[key] = { name, facts: {} });
    player.name = name;
    const id = factKey(a, b);
    const f =
      player.facts[id] ||
      (player.facts[id] = { asked: 0, firstTry: 0, right: 0, wrong: 0, timeouts: 0, said: [], totalMs: 0, timed: 0 });
    f.asked++;
    if (firstTry) f.firstTry++;
    if (correct) f.right++;
    if (timeout) f.timeouts++;
    f.wrong += wrongAnswers.length;
    f.said = [...f.said, ...wrongAnswers].slice(-10);
    if (correct && ms !== null) {
      f.totalMs += ms;
      f.timed++;
      f.bestMs = f.bestMs === undefined ? ms : Math.min(f.bestMs, ms);
    }
  }

  // Fastest correct answer for a fact; older saves only have the average.
  function factBestMs(f) {
    if (!f || !f.timed) return null;
    return f.bestMs !== undefined ? f.bestMs : f.totalMs / f.timed;
  }

  // Is every fact in the n line at least `level` ('learning' or 'mastered')?
  // The line is both orders: n × 1 … n × size and 1 × n … size × n.
  function lineReached(facts, n, size, level) {
    const ok = level === 'mastered' ? ['mastered'] : ['learning', 'mastered'];
    for (let m = 1; m <= size; m++) {
      if (!ok.includes(factStatus(facts[factKey(n, m)]))) return false;
      if (!ok.includes(factStatus(facts[factKey(m, n)]))) return false;
    }
    return true;
  }

  // 'mastered': mostly right first time over a few tries; 'practice': missed
  // more often than not; 'learning': in between.
  function factStatus(f) {
    if (!f || !f.asked) return 'unseen';
    const rate = f.firstTry / f.asked;
    if (f.asked >= 3 && rate >= 0.8) return 'mastered';
    if (f.wrong + f.timeouts > 0 && rate < 0.6) return 'practice';
    return 'learning';
  }

  // ---------------------------------------------------------------- practice mode

  // How likely each kind of fact is to be picked for practice.
  const PRACTICE_WEIGHTS = { practice: 8, learning: 4, unseen: 3, mastered: 0.5 };

  // Pick `count` facts from 1..max for one player, favouring the ones they
  // need most. `tables` (e.g. [3, 4]) limits it to those times tables; empty
  // means the whole table. 3 × 4 and 4 × 3 are separate facts, each picked on
  // its own record. Each fact appears once (unless there are fewer facts than
  // questions): [a, b] exactly as it should be asked.
  function pickPracticeFacts(facts, max, count, rng = Math.random, tables = []) {
    const only = new Set(tables.filter((n) => n >= 1 && n <= max));
    const pool = [];
    for (let a = 1; a <= max; a++) {
      for (let b = 1; b <= max; b++) {
        if (only.size && !only.has(a) && !only.has(b)) continue;
        const status = factStatus(facts[factKey(a, b)]);
        let weight = PRACTICE_WEIGHTS[status];
        if ((a === 1 || b === 1) && status !== 'practice') weight /= 2; // ×1 facts are easy wins
        pool.push({ a, b, weight });
      }
    }
    const picked = [];
    while (picked.length < count && pool.length) {
      let r = rng() * pool.reduce((sum, f) => sum + f.weight, 0);
      let i = 0;
      while (i < pool.length - 1 && (r -= pool[i].weight) > 0) i++;
      picked.push(pool.splice(i, 1)[0]);
    }
    for (let i = 0; picked.length < count; i++) picked.push(picked[i]); // tiny tables: repeat
    return picked.map(({ a, b }) => [a, b]);
  }

  // ---------------------------------------------------------------- achievements

  // check(ctx) runs on events: 'answer', 'game', 'checkin', 'buy', 'practice', 'class'.
  // Answer events also carry the player's facts and their table size (6, 8 or 12).
  const GENERAL_ACHIEVEMENTS = [
    { id: 'first_game', icon: '🎲', name: 'First game', desc: 'Finish your first game.', reward: 10, check: (c) => c.event === 'game' },
    { id: 'first_win', icon: '🏆', name: 'Winner!', desc: 'Beat the CPU in single player.', reward: 20, check: (c) => c.event === 'game' && c.wonVsCpu },
    { id: 'full_house', icon: '🧱', name: 'Full house', desc: 'Finish a game with the board completely full.', reward: 15, check: (c) => c.event === 'game' && c.full },
    { id: 'perfect', icon: '⭐', name: 'Perfect game', desc: 'Get every answer right first time in a game (at least 5).', reward: 40, check: (c) => c.event === 'game' && c.perfect },
    { id: 'hard_win', icon: '💪', name: 'Tough cookie', desc: 'Win a game on Hard.', reward: 60, check: (c) => c.event === 'game' && c.humanWon && c.difficulty === 'hard' },
    { id: 'games5', icon: '🌱', name: 'Getting started', desc: 'Finish 5 games.', reward: 15, check: (c) => c.event === 'game' && c.games >= 5 },
    { id: 'games10', icon: '📅', name: 'Regular', desc: 'Finish 10 games.', reward: 30, check: (c) => c.event === 'game' && c.games >= 10 },
    { id: 'games25', icon: '🎯', name: 'Dedicated', desc: 'Finish 25 games.', reward: 60, check: (c) => c.event === 'game' && c.games >= 25 },
    { id: 'games50', icon: '🎖️', name: 'Blockout pro', desc: 'Finish 50 games.', reward: 100, check: (c) => c.event === 'game' && c.games >= 50 },
    { id: 'games100', icon: '💯', name: 'Century', desc: 'Finish 100 games.', reward: 200, check: (c) => c.event === 'game' && c.games >= 100 },
    { id: 'games250', icon: '🏅', name: 'Blockout master', desc: 'Finish 250 games.', reward: 400, check: (c) => c.event === 'game' && c.games >= 250 },
    { id: 'games500', icon: '🌟', name: 'Blockout legend', desc: 'Finish 500 games.', reward: 800, check: (c) => c.event === 'game' && c.games >= 500 },
    { id: 'streak5', icon: '🔥', name: 'Hot streak', desc: 'Get 5 answers in a row right first time.', reward: 20, check: (c) => c.event === 'answer' && c.streak >= 5 },
    { id: 'streak10', icon: '🚀', name: 'On fire', desc: 'Get 10 answers in a row right first time.', reward: 40, check: (c) => c.event === 'answer' && c.streak >= 10 },
    { id: 'speedy', icon: '⚡', name: 'Speedy', desc: 'Answer correctly in under 3 seconds.', reward: 15, check: (c) => c.event === 'answer' && c.correct && c.ms < 3000 },
    { id: 'big_block', icon: '🟧', name: 'Big block', desc: 'Score a rectangle of 30 squares or more.', reward: 15, check: (c) => c.event === 'answer' && c.correct && c.a * c.b >= 30 },
    { id: 'twelve', icon: '🧠', name: 'Twelve times', desc: 'Answer a 12 times fact correctly.', reward: 20, check: (c) => c.event === 'answer' && c.correct && (c.a === 12 || c.b === 12) },
    { id: 'checkin3', icon: '☀️', name: 'Three days in a row', desc: 'Play three days in a row.', reward: 20, check: (c) => c.event === 'checkin' && c.streak >= 3 },
    { id: 'checkin7', icon: '🗓️', name: 'Week streak', desc: 'Play seven days in a row.', reward: 50, check: (c) => c.event === 'checkin' && c.streak >= 7 },
    { id: 'practice', icon: '🎯', name: 'Practice makes perfect', desc: 'Finish a practice round.', reward: 10, check: (c) => c.event === 'practice' },
    { id: 'shopper', icon: '🛍️', name: 'Shopper', desc: 'Buy your first unlock in the shop.', reward: 10, check: (c) => c.event === 'buy' },
  ].map((a) => ({ ...a, group: 'General' }));

  // Classroom games (everyone plays the same rolls on their own board). The end of
  // a class game sends { event: 'class', classGames, rank, of, perfect, missed, rolls }.
  const BIG_CLASS = 4; // placing only counts against at least this many players
  const CLASS_ACHIEVEMENTS = [
    { id: 'class_first', icon: '🏫', name: 'Class act', desc: 'Finish a classroom game.', reward: 15, check: (c) => c.event === 'class' },
    { id: 'class_podium', icon: '🥉', name: 'On the podium', desc: `Finish in the top 3 of a classroom game with at least ${BIG_CLASS} players.`, reward: 30, check: (c) => c.event === 'class' && c.of >= BIG_CLASS && c.rank <= 3 },
    { id: 'class_top', icon: '🥇', name: 'Top of the class', desc: `Come first in a classroom game with at least ${BIG_CLASS} players.`, reward: 60, check: (c) => c.event === 'class' && c.of >= BIG_CLASS && c.rank === 1 },
    { id: 'class_perfect', icon: '🌟', name: 'Gold star', desc: 'Get every answer right first time in a classroom game (at least 5).', reward: 40, check: (c) => c.event === 'class' && c.perfect },
    { id: 'class_every', icon: '✋', name: 'Every roll', desc: 'Keep up with every roll in a classroom game of 10 rolls or more.', reward: 20, check: (c) => c.event === 'class' && c.rolls >= 10 && c.missed === 0 },
    { id: 'class5', icon: '📚', name: 'Class regular', desc: 'Finish 5 classroom games.', reward: 30, check: (c) => c.event === 'class' && c.classGames >= 5 },
    { id: 'class25', icon: '🎓', name: 'Class veteran', desc: 'Finish 25 classroom games.', reward: 100, check: (c) => c.event === 'class' && c.classGames >= 25 },
  ].map((a) => ({ ...a, group: 'Classroom' }));

  // One pair per times table: every fact in the line at least Learning, then all Mastered.
  const TABLE_ACHIEVEMENTS = [];
  for (let n = 1; n <= 12; n++) {
    const inReach = (c) => c.event === 'answer' && c.facts && n <= c.size;
    TABLE_ACHIEVEMENTS.push(
      {
        id: `table${n}_learn`,
        icon: '📗',
        name: `×${n} learner`,
        desc: `Every ${n} times fact up to your table size is Learning or better.`,
        reward: 15,
        group: 'Times tables',
        check: (c) => inReach(c) && lineReached(c.facts, n, c.size, 'learning'),
      },
      {
        id: `table${n}_master`,
        icon: '🏅',
        name: `×${n} master`,
        desc: `Every ${n} times fact up to your table size is Mastered.`,
        reward: 30,
        group: 'Times tables',
        check: (c) => inReach(c) && lineReached(c.facts, n, c.size, 'mastered'),
      }
    );
  }

  // Best score in one game (squares + bonus), by any human player. Several tiers.
  const SCORE_TIERS = [
    { score: 50, icon: '🥉', name: 'Bronze score', reward: 10 },
    { score: 100, icon: '🥈', name: 'Silver score', reward: 20 },
    { score: 150, icon: '🥇', name: 'Gold score', reward: 30 },
    { score: 250, icon: '💎', name: 'Diamond score', reward: 50 },
    { score: 400, icon: '👑', name: 'Champion score', reward: 100 },
  ];
  const SCORE_ACHIEVEMENTS = SCORE_TIERS.map((t) => ({
    id: `score${t.score}`,
    icon: t.icon,
    name: t.name,
    desc: `Score ${t.score} points or more in one game.`,
    reward: t.reward,
    group: 'Scores',
    check: (c) => c.event === 'game' && c.bestScore >= t.score,
  }));

  // Fact speed: for every fact 1 × 1 … 12 × 12 (each order), three tiers once it's
  // Mastered: best time under 10 s, 5 s and 1 s. 432 achievements, shown as a grid.
  // `minor`: celebrated with a toast only, no full-screen confetti.
  const FACT_SPEED_TIERS = [
    { ms: 10000, secs: 10, icon: '🥉', reward: 2 },
    { ms: 5000, secs: 5, icon: '🥈', reward: 5 },
    { ms: 1000, secs: 1, icon: '🥇', reward: 10 },
  ];
  const FACT_SPEED_ACHIEVEMENTS = [];
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) {
      for (const t of FACT_SPEED_TIERS) {
        FACT_SPEED_ACHIEVEMENTS.push({
          id: `fact_${a}x${b}_${t.secs}`,
          icon: t.icon,
          name: `${a} × ${b} under ${t.secs} s`,
          desc: `Master ${a} × ${b} with a best time under ${t.secs} seconds.`,
          reward: t.reward,
          group: 'Fact speed',
          minor: true,
          fact: [a, b],
          tier: t.secs,
          check: (c) => {
            if (c.event !== 'answer' || c.a !== a || c.b !== b || !c.facts) return false;
            const f = c.facts[factKey(a, b)];
            return factStatus(f) === 'mastered' && factBestMs(f) !== null && factBestMs(f) < t.ms;
          },
        });
      }
    }
  }

  const ACHIEVEMENTS = [...GENERAL_ACHIEVEMENTS, ...CLASS_ACHIEVEMENTS, ...SCORE_ACHIEVEMENTS, ...TABLE_ACHIEVEMENTS, ...FACT_SPEED_ACHIEVEMENTS];

  // Award every achievement this event completes; returns the new ones.
  function awardAchievements(state, ctx) {
    const earned = [];
    for (const a of ACHIEVEMENTS) {
      if (state.achievements[a.id] || !a.check(ctx)) continue;
      state.achievements[a.id] = Date.now();
      addPoints(state, a.reward);
      earned.push(a);
    }
    return earned;
  }

  const api = {
    createProgress,
    normalize,
    addPoints,
    BONUS,
    answerBonus,
    SHOP,
    shopItem,
    isUnlocked,
    canBuy,
    buy,
    dayKey,
    checkIn,
    factKey,
    playerKey,
    recordAnswer,
    factStatus,
    factBestMs,
    lineReached,
    PRACTICE_WEIGHTS,
    pickPracticeFacts,
    SCORE_TIERS,
    FACT_SPEED_TIERS,
    ACHIEVEMENTS,
    awardAchievements,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BlockoutProgress = api;
})(typeof window !== 'undefined' ? window : globalThis);
