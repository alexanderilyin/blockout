// Classroom rooms: everyone plays the same rolls on their own board.
// Pure game logic over plain objects (no networking), so it can be tested on its own.
// The server keeps each student's board so it can check where rectangles go and
// work out the scores itself; the leaderboard can't be faked from a browser.
'use strict';

const crypto = require('crypto');
const Core = require('../js/core.js');
const Progress = require('../js/progress.js');

const SIZES = [12, 16, 20];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const ROUNDS = [10, 15, 20];
const MAX_PLAYERS = 40;
const NAME_MAX = 14;
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O: easy to read off the board
const CODE_LENGTH = 4;

class RoomError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const token = () => crypto.randomBytes(12).toString('hex');

function newCode(taken, rng = Math.random) {
  for (;;) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) code += CODE_LETTERS[Math.floor(rng() * CODE_LETTERS.length)];
    if (!taken.has(code)) return code;
  }
}

function cleanSettings(s = {}) {
  return {
    size: SIZES.includes(Number(s.size)) ? Number(s.size) : 12,
    difficulty: DIFFICULTIES.includes(s.difficulty) ? s.difficulty : 'easy',
    rounds: ROUNDS.includes(Number(s.rounds)) ? Number(s.rounds) : 15,
  };
}

function createRoom(settings, { taken = new Set(), rng = Math.random, now = Date.now() } = {}) {
  return {
    code: newCode(taken, rng),
    teacherKey: token(),
    settings: cleanSettings(settings),
    autoNext: true, // next roll by itself once everyone is done
    state: 'lobby', // lobby | playing | ended
    game: 0, // bumps every time a game starts
    round: 0,
    roll: null,
    bag: null,
    players: [],
    createdAt: now,
    touchedAt: now,
  };
}

// First names only: letters (any alphabet), spaces, hyphens and apostrophes.
function cleanName(name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  if (!n) throw new RoomError('name', 'Type your first name.');
  if (!/^[\p{L}\p{M}][\p{L}\p{M}0-9 '’-]*$/u.test(n)) throw new RoomError('name', 'Use letters for your name.');
  return n;
}

function freshScore(player, size) {
  Object.assign(player, {
    board: Core.createBoard(size),
    score: 0,
    squares: 0,
    bonus: 0,
    streak: 0,
    bestStreak: 0,
    answered: 0,
    firstTry: 0,
    timeouts: 0,
    passes: 0,
    missed: 0, // rounds that went by without an answer
    times: [],
    facts: {}, // '6 × 7' -> { asked, firstTry }
    done: false,
    result: null, // this round's: 'placed' | 'timeout' | 'pass'
  });
  return player;
}

function join(room, name) {
  const clean = cleanName(name);
  if (room.players.length >= MAX_PLAYERS) throw new RoomError('full', 'This class is full.');
  if (room.players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
    throw new RoomError('taken', `Someone called ${clean} is already in. Add your last initial, like “${clean} B”.`);
  }
  const player = freshScore({ id: token().slice(0, 8), key: token(), name: clean, connections: 0 }, room.settings.size);
  // Joining mid-game: you start with the next roll
  if (room.state === 'playing') player.done = true;
  room.players.push(player);
  return player;
}

function findPlayer(room, id, key) {
  const p = room.players.find((x) => x.id === id);
  if (!p || p.key !== key) throw new RoomError('player', 'You’re not in this class any more.');
  return p;
}

function removePlayer(room, id) {
  room.players = room.players.filter((p) => p.id !== id);
}

function setSettings(room, settings) {
  if (room.state === 'playing') throw new RoomError('state', 'Settings can’t change during a game.');
  room.settings = cleanSettings({ ...room.settings, ...settings });
}

function start(room, rng = Math.random) {
  if (!room.players.length) throw new RoomError('empty', 'Wait for someone to join first.');
  room.state = 'playing';
  room.game++;
  room.round = 0;
  room.startedAt = Date.now();
  for (const p of room.players) freshScore(p, room.settings.size);
  const sides = Core.DIFFICULTY_SIDES[room.settings.difficulty];
  room.bag = Core.createDice(room.settings.size, rng, sides);
  nextRound(room);
}

// Roll for everyone. Anyone who didn't answer the last roll has missed it; anyone
// whose board has no room for this one passes straight away.
function nextRound(room) {
  if (room.state !== 'playing') throw new RoomError('state', 'The game isn’t running.');
  for (const p of room.players) {
    if (room.round > 0 && !p.done) {
      p.missed++;
      p.streak = 0;
    }
  }
  if (room.round >= room.settings.rounds) return end(room);
  room.round++;
  room.roll = [room.bag.roll(), room.bag.roll()];
  for (const p of room.players) {
    p.result = null;
    p.done = false;
    if (!canFit(p.board, room.roll)) {
      p.done = true;
      p.result = 'pass';
      p.passes++;
    }
  }
}

function canFit(board, [a, b]) {
  return Core.validPlacements(board, a, b).length > 0;
}

// A student's answer for this round. Returns the player (updated).
//   { round, kind: 'placed', rect: { x, y, w, h }, firstTry, ms }
//   { round, kind: 'timeout' } or { round, kind: 'pass' }
function submit(room, player, r) {
  if (room.state !== 'playing' || Number(r.round) !== room.round) throw new RoomError('stale', 'That roll is over.');
  if (player.done) throw new RoomError('done', 'Already answered this roll.');
  const [a, b] = room.roll;
  const fact = `${a} × ${b}`;
  const f = (player.facts[fact] = player.facts[fact] || { asked: 0, firstTry: 0 });
  if (r.kind === 'placed') {
    const { x, y, w, h } = r.rect || {};
    if (![x, y, w, h].every(Number.isInteger)) throw new RoomError('rect', 'Bad rectangle.');
    if (!((w === a && h === b) || (w === b && h === a))) throw new RoomError('rect', 'That rectangle isn’t the roll.');
    if (!Core.isValidPlacement(player.board, x, y, w, h)) throw new RoomError('rect', 'That rectangle doesn’t fit there.');
    const rect = Core.place(player.board, x, y, w, h, 0);
    rect.a = a;
    rect.b = b;
    const firstTry = Boolean(r.firstTry);
    const ms = Math.max(0, Math.min(Number(r.ms) || 0, 10 * 60 * 1000));
    player.streak = firstTry ? player.streak + 1 : 0;
    player.bestStreak = Math.max(player.bestStreak, player.streak);
    const bonus = Progress.answerBonus({ firstTry, ms, streak: player.streak }).total;
    player.squares += rect.area;
    player.bonus += bonus;
    player.score = player.squares + player.bonus;
    player.answered++;
    if (firstTry) player.firstTry++;
    player.times.push(Math.round(ms));
    f.asked++;
    if (firstTry) f.firstTry++;
  } else if (r.kind === 'timeout') {
    player.timeouts++;
    player.streak = 0;
    f.asked++;
  } else if (r.kind === 'pass') {
    if (canFit(player.board, room.roll)) throw new RoomError('fits', 'There’s still room for that one.');
    player.passes++;
  } else {
    throw new RoomError('kind', 'Unknown answer.');
  }
  player.done = true;
  player.result = r.kind;
  return player;
}

const POLL_GRACE_MS = 35000; // a long-polling student counts as here this long after their last poll

// Here = an open event stream, or polled recently.
const connected = (p, now = Date.now()) => p.connections > 0 || (p.seenAt > 0 && now - p.seenAt < POLL_GRACE_MS);

// Everyone who's here has answered (students who dropped off aren't waited for).
function allDone(room) {
  const here = room.players.filter(connected);
  return room.state === 'playing' && here.length > 0 && here.every((p) => p.done);
}

function end(room) {
  room.state = 'ended';
  room.roll = null;
  room.endedAt = Date.now();
}

function backToLobby(room) {
  room.state = 'lobby';
  room.round = 0;
  room.roll = null;
  for (const p of room.players) freshScore(p, room.settings.size);
}

// Highest score first; ties share a rank (first-try answers break ties for order only).
function leaderboard(room) {
  const sorted = [...room.players].sort((p, q) => q.score - p.score || q.firstTry - p.firstTry || p.name.localeCompare(q.name));
  let rank = 0;
  return sorted.map((p, i) => {
    if (i === 0 || p.score !== sorted[i - 1].score) rank = i + 1;
    return {
      id: p.id,
      name: p.name,
      rank,
      score: p.score,
      squares: p.squares,
      firstTry: p.firstTry,
      asked: p.answered + p.timeouts,
      done: p.done,
      result: p.result,
      connected: connected(p),
    };
  });
}

// For the teacher: the facts the class found hardest.
function report(room) {
  const facts = new Map();
  let asked = 0;
  let firstTry = 0;
  const times = [];
  for (const p of room.players) {
    times.push(...p.times);
    for (const [fact, f] of Object.entries(p.facts)) {
      const t = facts.get(fact) || { fact, asked: 0, missed: 0 };
      t.asked += f.asked;
      t.missed += f.asked - f.firstTry;
      facts.set(fact, t);
      asked += f.asked;
      firstTry += f.firstTry;
    }
  }
  const hardest = [...facts.values()]
    .filter((f) => f.missed > 0)
    .sort((x, y) => y.missed / y.asked - x.missed / x.asked || y.missed - x.missed)
    .slice(0, 8);
  const avgMs = times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : null;
  return { asked, firstTry, avgMs, hardest };
}

function teacherView(room) {
  const board = leaderboard(room);
  const here = room.players.filter(connected);
  return {
    code: room.code,
    state: room.state,
    game: room.game,
    settings: room.settings,
    autoNext: room.autoNext,
    round: room.round,
    roll: room.roll,
    players: board,
    done: here.filter((p) => p.done).length,
    here: here.length,
    report: room.state === 'ended' ? report(room) : null,
  };
}

function studentView(room, player) {
  const board = leaderboard(room);
  const me = board.find((p) => p.id === player.id);
  return {
    code: room.code,
    state: room.state,
    game: room.game,
    settings: room.settings,
    round: room.round,
    roll: room.roll,
    you: {
      id: player.id,
      name: player.name,
      done: player.done,
      result: player.result,
      rank: me ? me.rank : null,
      tied: Boolean(me) && board.filter((p) => p.rank === me.rank).length > 1, // same score as someone else
      score: player.score,
      squares: player.squares,
      bonus: player.bonus,
      streak: player.streak,
      answered: player.answered,
      firstTry: player.firstTry,
      timeouts: player.timeouts,
      missed: player.missed,
      rects: player.board.rects.map(({ x, y, w, h, a, b }) => ({ x, y, w, h, a, b })),
    },
    of: board.length,
    // at the end everyone sees the top five
    top: room.state === 'ended' ? board.slice(0, 5).map(({ name, rank, score }) => ({ name, rank, score })) : null,
  };
}

module.exports = {
  SIZES,
  DIFFICULTIES,
  ROUNDS,
  MAX_PLAYERS,
  RoomError,
  createRoom,
  cleanName,
  join,
  findPlayer,
  removePlayer,
  setSettings,
  start,
  nextRound,
  submit,
  allDone,
  end,
  backToLobby,
  leaderboard,
  report,
  isHere: (p) => connected(p),
  teacherView,
  studentView,
};
