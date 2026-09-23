// Blockout game rules, independent of the UI.
// Loaded as a plain script in the browser (window.BlockoutCore) and via require() in tests.
(function (root) {
  'use strict';

  const EMPTY = -1;

  // firstInCorner: the very first rectangle of the game must go in the top-left corner.
  function createBoard(size, { firstInCorner = false } = {}) {
    return { size, firstInCorner, cells: new Array(size * size).fill(EMPTY), rects: [] };
  }

  function fits(board, x, y, w, h) {
    const n = board.size;
    if (x < 0 || y < 0 || x + w > n || y + h > n) return false;
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (board.cells[r * n + c] !== EMPTY) return false;
      }
    }
    return true;
  }

  function mustUseCorner(board) {
    return board.firstInCorner && board.rects.length === 0;
  }

  function isValidPlacement(board, x, y, w, h) {
    if (mustUseCorner(board) && (x !== 0 || y !== 0)) return false;
    return fits(board, x, y, w, h);
  }

  // Both orientations of an a-by-b roll (only one when a === b).
  function orientations(a, b) {
    return a === b ? [[a, b]] : [[a, b], [b, a]];
  }

  function validPlacements(board, a, b) {
    const out = [];
    for (const [w, h] of orientations(a, b)) {
      for (let y = 0; y + h <= board.size; y++) {
        for (let x = 0; x + w <= board.size; x++) {
          if (isValidPlacement(board, x, y, w, h)) out.push({ x, y, w, h });
        }
      }
    }
    return out;
  }

  function place(board, x, y, w, h, player) {
    if (!isValidPlacement(board, x, y, w, h)) throw new Error('Invalid placement');
    const n = board.size;
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) board.cells[r * n + c] = player;
    }
    const rect = { x, y, w, h, player, area: w * h };
    board.rects.push(rect);
    return rect;
  }

  // Take a rectangle back off the board (e.g. when a player runs out of time).
  function removeRect(board, rect) {
    const i = board.rects.indexOf(rect);
    if (i === -1) throw new Error('Rectangle is not on this board');
    board.rects.splice(i, 1);
    const n = board.size;
    for (let r = rect.y; r < rect.y + rect.h; r++) {
      for (let c = rect.x; c < rect.x + rect.w; c++) board.cells[r * n + c] = EMPTY;
    }
  }

  function emptyCount(board) {
    return board.cells.reduce((sum, v) => sum + (v === EMPTY ? 1 : 0), 0);
  }

  function isOpen(board, c, r) {
    const n = board.size;
    return c >= 0 && r >= 0 && c < n && r < n && board.cells[r * n + c] === EMPTY;
  }

  // Number of perimeter neighbours that are walls or already filled.
  // Snug placements leave fewer awkward gaps.
  function contactScore(board, { x, y, w, h }) {
    let contact = 0;
    for (let c = x; c < x + w; c++) {
      if (!isOpen(board, c, y - 1)) contact++;
      if (!isOpen(board, c, y + h)) contact++;
    }
    for (let r = y; r < y + h; r++) {
      if (!isOpen(board, x - 1, r)) contact++;
      if (!isOpen(board, x + w, r)) contact++;
    }
    return contact;
  }

  // Count open cells that would end up fully walled in on all four sides
  // (only a 1x1 roll could ever use them).
  function isolatedHolesAround(board, { x, y, w, h }) {
    const n = board.size;
    const filled = new Set();
    for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) filled.add(r * n + c);
    const open = (c, r) => isOpen(board, c, r) && !filled.has(r * n + c);
    let holes = 0;
    for (let r = y - 1; r <= y + h; r++) {
      for (let c = x - 1; c <= x + w; c++) {
        if (!open(c, r)) continue;
        if (!open(c - 1, r) && !open(c + 1, r) && !open(c, r - 1) && !open(c, r + 1)) holes++;
      }
    }
    return holes;
  }

  // Computer strategy: pack rectangles tightly against walls and other
  // rectangles and avoid leaving single-cell holes. Returns null if nothing fits.
  function chooseComputerMove(board, a, b, rng = Math.random) {
    const options = validPlacements(board, a, b);
    if (options.length === 0) return null;
    let best = null;
    let bestScore = -Infinity;
    for (const p of options) {
      const perimeter = 2 * (p.w + p.h);
      const score =
        contactScore(board, p) / perimeter - 0.6 * isolatedHolesAround(board, p) + rng() * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  function rollDie(rng = Math.random, sides = 6) {
    return 1 + Math.floor(rng() * sides);
  }

  // Difficulty sets the dice: easy d6, medium d8, hard d12. After Hard the
  // facts stay within the times table (or just past it) but get harder:
  //   tricky  12-sided dice without the giveaways (no ×1, ×2, ×5, ×10, ×11)
  //   master  12-sided dice that lean towards the player's weakest facts
  //   legend  two-digit × one-digit: 11–19 on one die, 2–9 on the other
  // DIFFICULTY_SIDES is the biggest face (numbered dice, fit maths).
  const DIFFICULTIES = ['easy', 'medium', 'hard', 'tricky', 'master', 'legend'];
  const DIFFICULTY_SIDES = { easy: 6, medium: 8, hard: 12, tricky: 12, master: 12, legend: 19 };
  const TRICKY_FACES = [3, 4, 6, 7, 8, 9, 12];
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

  // The faces of each die: { a: [...], b: [...] } (the same for both except Legend).
  function diceFaces(difficulty) {
    if (difficulty === 'tricky') return { a: TRICKY_FACES, b: TRICKY_FACES };
    if (difficulty === 'legend') return { a: range(11, 19), b: range(2, 9) };
    const n = DIFFICULTY_SIDES[difficulty] || 6;
    return { a: range(1, n), b: range(1, n) };
  }

  // The new difficulties roll both dice at once from a list of pairs (Legend's
  // dice differ; Master weights each fact). Easy/Medium/Hard use createDice.
  const usesPairDice = (difficulty) => ['tricky', 'master', 'legend'].includes(difficulty);

  // weight(a, b): how likely a roll is (Master: weak facts more), default even.
  // Pairs that can't fit the board at all are left out (Legend on small boards).
  function createPairDice(boardSize, rng = Math.random, difficulty = 'tricky', weight = null) {
    const { a: A, b: B } = diceFaces(difficulty);
    const pairs = [];
    for (const a of A) for (const b of B) if (a <= boardSize && b <= boardSize) pairs.push([a, b]);
    const w = weight || (() => 1);
    return {
      sides: DIFFICULTY_SIDES[difficulty],
      pairs,
      // a weighted pick from `from` (default: every pair)
      rollPair(from = pairs) {
        const total = from.reduce((sum, [a, b]) => sum + w(a, b), 0);
        let r = rng() * total;
        for (const [a, b] of from) if ((r -= w(a, b)) <= 0) return [a, b];
        return from[from.length - 1];
      },
    };
  }

  // Can a difficulty be played on this board at all? (Legend needs 11×11 or bigger.)
  const fitsDifficulty = (difficulty, boardSize) => !usesPairDice(difficulty) || createPairDice(boardSize, Math.random, difficulty).pairs.length > 0;

  // "Loaded" dice matched to the board size, so small boards aren't swallowed
  // by huge rectangles and big boards don't take ages to fill with 1x1s.
  // Most rolls come from the common range; each rare face can only turn up a
  // limited number of times per game. For a d6 this gives:
  //   small  (<=13): mostly 1-4; 5 at most twice, 6 once
  //   medium (<=17): mostly 2-5; 1 at most once, 6 twice
  //   large  (18+):  mostly 3-6; 1 at most once, 2 twice
  // and the same shape stretched over 8 or 12 sides.
  function diceProfile(boardSize, sides = 6) {
    const rare = {};
    let common;
    if (boardSize <= 13) {
      common = [1, Math.round((sides * 2) / 3)];
      for (let f = common[1] + 1; f <= sides; f++) rare[f] = f === sides ? 1 : 2;
    } else if (boardSize <= 17) {
      common = [Math.floor(sides / 6) + 1, sides - Math.ceil(sides / 6)];
      for (let f = 1; f < common[0]; f++) rare[f] = 1;
      for (let f = common[1] + 1; f <= sides; f++) rare[f] = 2;
    } else {
      common = [Math.round(sides / 3) + 1, sides];
      for (let f = 1; f < common[0]; f++) rare[f] = f === 1 ? 1 : 2;
    }
    return { sides, common, rare };
  }

  // Chance per die of trying rare faces: about 1 in 6 overall, split between them.
  const RARE_TOTAL_CHANCE = 1 / 6;

  // Returns a per-game dice bag: bag.roll() gives one die.
  function createDice(boardSize, rng = Math.random, sides = 6) {
    const profile = diceProfile(boardSize, sides);
    const remaining = { ...profile.rare };
    const perFace = RARE_TOTAL_CHANCE / Math.max(1, Object.keys(remaining).length);
    const [lo, hi] = profile.common;
    return {
      sides,
      remaining,
      roll() {
        for (const face of Object.keys(remaining)) {
          if (remaining[face] > 0 && rng() < perFace) {
            remaining[face]--;
            return Number(face);
          }
        }
        return lo + Math.floor(rng() * (hi - lo + 1));
      },
    };
  }

  // "No room": when a roll doesn't fit anywhere the player has to pass. To keep
  // that from happening while there's still space, rolls can be limited to ones
  // that fit. Modes: 'end' (only near the end of the game), 'always', 'never'.
  // "Near the end" means fewer empty squares than the larger of the biggest
  // possible rectangle (36 / 64 / 144 for 6 / 8 / 12-sided dice) and a fifth of
  // the board, so it scales with both board size and difficulty.
  // The classic 12x12 board with a d6 gives 36.
  const FIT_MODES = ['end', 'always', 'never'];

  function fitThreshold(boardSize, sides = 6) {
    return Math.max(sides * sides, Math.round(boardSize * boardSize * 0.2));
  }

  function fitOnlyNow(board, sides = 6, mode = 'end') {
    if (mode === 'never') return false;
    if (mode === 'always') return true;
    return emptyCount(board) < fitThreshold(board.size, sides);
  }

  function canFit(board, a, b) {
    for (const [w, h] of orientations(a, b)) {
      for (let y = 0; y + h <= board.size; y++) {
        for (let x = 0; x + w <= board.size; x++) {
          if (isValidPlacement(board, x, y, w, h)) return true;
        }
      }
    }
    return false;
  }

  // Every [a, b] roll (1..sides each, both orders) that fits somewhere on the board.
  function fittingRolls(board, sides = 6) {
    const out = [];
    for (let a = 1; a <= sides; a++) {
      for (let b = 1; b <= sides; b++) if (canFit(board, a, b)) out.push([a, b]);
    }
    return out;
  }

  // Roll two dice from the bag. When fitOnlyNow() says so, re-roll until the
  // result fits (without using up rare faces on rejected rolls); if the bag
  // can't produce a fitting roll, pick one of the fitting rolls at random.
  function rollForBoard(board, bag, rng = Math.random, mode = 'end') {
    const sides = bag.sides || 6;
    if (bag.rollPair) {
      // pair dice: near the end (or always), only pairs that fit
      if (!fitOnlyNow(board, sides, mode)) return bag.rollPair();
      const fitting = bag.pairs.filter(([a, b]) => canFit(board, a, b));
      return fitting.length ? bag.rollPair(fitting) : bag.rollPair();
    }
    if (!fitOnlyNow(board, sides, mode)) return [bag.roll(), bag.roll()];
    const fitting = fittingRolls(board, sides);
    if (!fitting.length) return [bag.roll(), bag.roll()];
    const ok = new Set(fitting.map(([a, b]) => `${a}x${b}`));
    for (let i = 0; i < 100; i++) {
      const saved = { ...bag.remaining };
      const roll = [bag.roll(), bag.roll()];
      if (ok.has(`${roll[0]}x${roll[1]}`)) return roll;
      Object.assign(bag.remaining, saved);
    }
    return fitting[Math.floor(rng() * fitting.length)];
  }

  const api = {
    EMPTY,
    createBoard,
    fits,
    mustUseCorner,
    isValidPlacement,
    orientations,
    validPlacements,
    place,
    removeRect,
    emptyCount,
    chooseComputerMove,
    rollDie,
    DIFFICULTIES,
    DIFFICULTY_SIDES,
    TRICKY_FACES,
    diceFaces,
    usesPairDice,
    createPairDice,
    fitsDifficulty,
    diceProfile,
    createDice,
    FIT_MODES,
    fitThreshold,
    fitOnlyNow,
    fittingRolls,
    rollForBoard,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BlockoutCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
