const test = require('node:test');
const assert = require('node:assert');
const Rooms = require('../server/rooms.js');
const Core = require('../js/core.js');

// A class with players who are all "connected".
function classOf(names, settings = {}) {
  const room = Rooms.createRoom(settings, { rng: () => 0.1 });
  const players = names.map((n) => Object.assign(Rooms.join(room, n), { connections: 1 }));
  return { room, players };
}

function placeFor(room, player) {
  const [a, b] = room.roll;
  const [move] = Core.validPlacements(player.board, a, b);
  return { round: room.round, kind: 'placed', rect: { x: move.x, y: move.y, w: move.w, h: move.h }, firstTry: true, ms: 4000 };
}

test('codes are four easy-to-read letters; settings are cleaned', () => {
  const room = Rooms.createRoom({ size: 99, difficulty: 'hard', rounds: 10 });
  assert.match(room.code, /^[A-HJ-NP-Z]{4}$/);
  assert.deepEqual(room.settings, { size: 12, difficulty: 'hard', rounds: 10 });
  assert.equal(room.state, 'lobby');
});

test('names: first names only, no duplicates', () => {
  const { room } = classOf(['Maya']);
  assert.throws(() => Rooms.join(room, 'maya'), { code: 'taken' });
  assert.throws(() => Rooms.join(room, '   '), { code: 'name' });
  assert.throws(() => Rooms.join(room, '<b>hi</b>'), { code: 'name' });
  assert.equal(Rooms.join(room, '  José   María ').name, 'José María');
  assert.equal(Rooms.cleanName('A very long first name'), 'A very long fi');
});

test('everyone gets the same roll; a good answer scores squares plus the bonus', () => {
  const { room, players } = classOf(['Ann', 'Bo']);
  Rooms.start(room);
  assert.equal(room.round, 1);
  const [a, b] = room.roll;
  Rooms.submit(room, players[0], placeFor(room, players[0]));
  // first try (2) + under 5 s (3)
  assert.equal(players[0].score, a * b + 5);
  assert.equal(players[0].done, true);
  assert.equal(Rooms.allDone(room), false);
  assert.throws(() => Rooms.submit(room, players[0], placeFor(room, players[0])), { code: 'done' });
  Rooms.submit(room, players[1], { round: 1, kind: 'timeout' });
  assert.equal(players[1].score, 0);
  assert.equal(Rooms.allDone(room), true);
});

test('the server checks rectangles: right size, on the board, not overlapping', () => {
  const { room, players } = classOf(['Ann']);
  Rooms.start(room);
  const [a, b] = room.roll;
  const p = players[0];
  assert.throws(() => Rooms.submit(room, p, { round: 1, kind: 'placed', rect: { x: 0, y: 0, w: a + 1, h: b } }), { code: 'rect' });
  assert.throws(() => Rooms.submit(room, p, { round: 1, kind: 'placed', rect: { x: 11, y: 11, w: a, h: b } }), a * b > 1 ? { code: 'rect' } : undefined);
  assert.throws(() => Rooms.submit(room, p, { round: 2, kind: 'timeout' }), { code: 'stale' });
  assert.throws(() => Rooms.submit(room, p, { round: 1, kind: 'pass' }), { code: 'fits' });
  Rooms.submit(room, p, { round: 1, kind: 'placed', rect: { x: 0, y: 0, w: b, h: a } }); // either way round
  assert.equal(p.squares, a * b);
});

test('missed rolls, auto-passing when nothing fits, and the end after the last roll', () => {
  const { room, players } = classOf(['Ann', 'Bo'], { rounds: 10 });
  Rooms.start(room);
  Rooms.nextRound(room); // nobody answered roll 1
  assert.equal(players[0].missed, 1);
  // Fill Bo's board so the next roll can't fit
  players[1].board = Core.createBoard(12);
  Core.place(players[1].board, 0, 0, 12, 12, 0);
  Rooms.nextRound(room);
  assert.equal(players[1].done, true);
  assert.equal(players[1].result, 'pass');
  while (room.state === 'playing') Rooms.nextRound(room);
  assert.equal(room.round, 10);
  assert.equal(room.state, 'ended');
});

test('students who dropped off aren’t waited for', () => {
  const { room, players } = classOf(['Ann', 'Bo']);
  Rooms.start(room);
  Rooms.submit(room, players[0], placeFor(room, players[0]));
  players[1].connections = 0;
  assert.equal(Rooms.allDone(room), true);
});

test('leaderboard ranks share ties; the report finds the hardest facts', () => {
  const { room, players } = classOf(['Ann', 'Bo', 'Cy']);
  Rooms.start(room);
  const [a, b] = room.roll;
  Rooms.submit(room, players[0], placeFor(room, players[0]));
  Rooms.submit(room, players[1], placeFor(room, players[1]));
  Rooms.submit(room, players[2], { ...placeFor(room, players[2]), firstTry: false });
  const board = Rooms.leaderboard(room);
  assert.deepEqual(board.map((p) => [p.name, p.rank]), [['Ann', 1], ['Bo', 1], ['Cy', 3]]);
  Rooms.end(room);
  const view = Rooms.teacherView(room);
  assert.deepEqual(view.report.hardest, [{ fact: `${a} × ${b}`, asked: 3, missed: 1 }]);
  assert.equal(view.report.firstTry, 2);
  assert.equal(Rooms.studentView(room, players[0]).you.tied, true); // Ann and Bo have the same score
  const student = Rooms.studentView(room, players[2]);
  assert.equal(student.you.rank, 3);
  assert.equal(student.you.tied, false);
  assert.equal(student.top.length, 3);
  assert.equal(student.you.rects.length, 1);
});

test('back to the lobby clears boards and scores but keeps the class', () => {
  const { room, players } = classOf(['Ann']);
  Rooms.start(room);
  Rooms.submit(room, players[0], placeFor(room, players[0]));
  Rooms.backToLobby(room);
  assert.equal(room.state, 'lobby');
  assert.equal(players[0].score, 0);
  assert.equal(players[0].board.rects.length, 0);
  Rooms.start(room);
  assert.equal(room.game, 2);
});

test('joining mid-game waits for the next roll', () => {
  const { room } = classOf(['Ann']);
  Rooms.start(room);
  const late = Rooms.join(room, 'Zed');
  assert.equal(late.done, true);
  Rooms.nextRound(room);
  assert.equal(late.missed, 0);
});
