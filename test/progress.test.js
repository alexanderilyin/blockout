const test = require('node:test');
const assert = require('node:assert');
const P = require('../js/progress.js');

test('answer bonuses: first try, speedy and streak', () => {
  assert.deepEqual(P.answerBonus({ firstTry: false, ms: 1000, streak: 0 }), { total: 0, parts: [] });
  assert.equal(P.answerBonus({ firstTry: true, ms: 9000, streak: 1 }).total, 2);
  assert.equal(P.answerBonus({ firstTry: true, ms: 4000, streak: 1 }).total, 5);
  assert.equal(P.answerBonus({ firstTry: true, ms: 4000, streak: 3 }).total, 6);
  assert.equal(P.answerBonus({ firstTry: true, ms: 9000, streak: 20 }).total, 2 + 5);
});

test('shop: buying needs points, prerequisites, and only happens once', () => {
  const s = P.createProgress();
  assert.equal(P.isUnlocked(s, null), true);
  assert.deepEqual(P.buy(s, 'board16'), { ok: false, reason: 'points', missing: 150 });
  s.wallet = 1000;
  assert.deepEqual(P.buy(s, 'difficulty.hard'), { ok: false, reason: 'requires', requires: 'difficulty.medium' });
  assert.deepEqual(P.buy(s, 'board16'), { ok: true });
  assert.equal(s.wallet, 850);
  assert.equal(P.isUnlocked(s, 'board16'), true);
  assert.deepEqual(P.buy(s, 'board16'), { ok: false, reason: 'owned' });
  assert.equal(P.buy(s, 'difficulty.medium').ok, true);
  assert.equal(P.buy(s, 'difficulty.hard').ok, true);
  assert.equal(s.wallet, 1000 - 150 - 250 - 500);
  assert.deepEqual(P.buy(s, 'goldenDice'), { ok: false, reason: 'points', missing: 10000 - 100 });
  s.wallet = 10000;
  assert.equal(P.buy(s, 'goldenDice').ok, true);
  assert.equal(s.wallet, 0);
});

test('modes: multiplayer, 3 and 4 players, practice and expert unlock in order', () => {
  const s = P.createProgress();
  s.wallet = 1000;
  assert.equal(P.buy(s, 'players3').reason, 'requires');
  assert.equal(P.buy(s, 'practiceExpert').reason, 'requires');
  assert.equal(P.buy(s, 'multiplayer').ok, true);
  assert.equal(P.buy(s, 'players4').ok, true); // 4 players doesn't need 3 players
  assert.equal(P.buy(s, 'players3').ok, true);
  assert.equal(P.buy(s, 'practice').ok, true);
  assert.equal(P.buy(s, 'practiceExpert').ok, true);
  assert.equal(s.wallet, 1000 - 150 - 100 - 100 - 100 - 200);
});

test('daily check-in: once a day, streak grows on consecutive days', () => {
  const s = P.createProgress();
  assert.deepEqual(P.checkIn(s, new Date(2026, 8, 20, 9)), { bonus: 20, streak: 1 });
  assert.equal(P.checkIn(s, new Date(2026, 8, 20, 18)), null);
  assert.deepEqual(P.checkIn(s, new Date(2026, 8, 21, 7)), { bonus: 25, streak: 2 });
  assert.deepEqual(P.checkIn(s, new Date(2026, 8, 22, 7)), { bonus: 30, streak: 3 });
  assert.deepEqual(P.checkIn(s, new Date(2026, 8, 25, 7)), { bonus: 20, streak: 1 });
  assert.equal(s.wallet, 20 + 25 + 30 + 20);
  // across a month boundary
  const t = P.createProgress();
  P.checkIn(t, new Date(2026, 8, 30));
  assert.equal(P.checkIn(t, new Date(2026, 9, 1)).streak, 2);
});

test('achievements are awarded once and pay their reward', () => {
  const s = P.createProgress();
  const first = P.awardAchievements(s, { event: 'answer', correct: true, ms: 2000, streak: 5, a: 6, b: 6 });
  assert.deepEqual(first.map((a) => a.id).sort(), ['big_block', 'speedy', 'streak5']);
  assert.equal(s.wallet, 15 + 15 + 20);
  assert.deepEqual(P.awardAchievements(s, { event: 'answer', correct: true, ms: 2000, streak: 5, a: 6, b: 6 }), []);
  const game = P.awardAchievements(s, { event: 'game', games: 1, wonVsCpu: true, humanWon: true, full: true, perfect: false, difficulty: 'easy' });
  assert.deepEqual(game.map((a) => a.id).sort(), ['first_game', 'first_win', 'full_house']);
});

test('lifetime facts keep each order separate and remember wrong answers', () => {
  const s = P.createProgress();
  P.recordAnswer(s, 'Maya', { a: 4, b: 3, firstTry: false, correct: true, wrongAnswers: [11, 13], ms: 6000 });
  P.recordAnswer(s, 'maya ', { a: 4, b: 3, firstTry: false, correct: false, timeout: true });
  P.recordAnswer(s, 'Maya', { a: 3, b: 4, firstTry: true, correct: true, ms: 2000 });
  const f = s.facts.maya.facts['4 × 3'];
  assert.deepEqual(
    { asked: f.asked, firstTry: f.firstTry, right: f.right, wrong: f.wrong, timeouts: f.timeouts, said: f.said, timed: f.timed },
    { asked: 2, firstTry: 0, right: 1, wrong: 2, timeouts: 1, said: [11, 13], timed: 1 }
  );
  assert.equal(P.factStatus(f), 'practice');
  const g = s.facts.maya.facts['3 × 4'];
  assert.deepEqual({ asked: g.asked, firstTry: g.firstTry }, { asked: 1, firstTry: 1 });
  assert.equal(P.factStatus(g), 'learning');
  assert.equal(P.factStatus({ asked: 4, firstTry: 4, wrong: 0, timeouts: 0 }), 'mastered');
  assert.equal(P.factStatus(undefined), 'unseen');
});

test('old saves (both orders merged) are split into both orders once', () => {
  const old = { wallet: 5, facts: { leo: { name: 'Leo', facts: { '3 × 5': { asked: 2, firstTry: 1, right: 2, wrong: 1, timeouts: 0, said: [14], totalMs: 8000, timed: 2 }, '4 × 4': { asked: 1, firstTry: 1, right: 1, wrong: 0, timeouts: 0, said: [], totalMs: 0, timed: 0 } } } } };
  const s = P.normalize(old);
  assert.equal(s.factsOrdered, true);
  assert.deepEqual(s.facts.leo.facts['5 × 3'], s.facts.leo.facts['3 × 5']);
  assert.notEqual(s.facts.leo.facts['5 × 3'].said, s.facts.leo.facts['3 × 5'].said, 'copies, not shared');
  assert.deepEqual(Object.keys(s.facts.leo.facts).sort(), ['3 × 5', '4 × 4', '5 × 3']);
  // already-ordered saves are left alone
  const again = P.normalize(JSON.parse(JSON.stringify({ ...s, facts: { leo: { name: 'Leo', facts: { '3 × 5': s.facts.leo.facts['3 × 5'] } } } })));
  assert.deepEqual(Object.keys(again.facts.leo.facts), ['3 × 5']);
});

test('practice picks favour the exact order that needs work, within the table size', () => {
  const s = P.createProgress();
  // 6 × 5 needs practice; every other 1..6 fact, including 5 × 6, is mastered
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
    const weak = a === 6 && b === 5;
    for (let i = 0; i < 4; i++) P.recordAnswer(s, 'Maya', { a, b, firstTry: !weak, correct: true, wrongAnswers: weak ? [35] : [] });
  }
  const facts = s.facts.maya.facts;
  let weakHits = 0;
  let flippedHits = 0;
  for (let round = 0; round < 200; round++) {
    const picks = P.pickPracticeFacts(facts, 6, 5);
    assert.equal(picks.length, 5);
    const keys = picks.map(([a, b]) => P.factKey(a, b));
    assert.equal(new Set(keys).size, 5, 'no repeats within a round');
    for (const [a, b] of picks) assert.ok(a >= 1 && b >= 1 && a <= 6 && b <= 6);
    if (keys.includes('6 × 5')) weakHits++;
    if (keys.includes('5 × 6')) flippedHits++;
  }
  assert.ok(weakHits > 150, `6 × 5 should come up in most rounds (was ${weakHits}/200)`);
  assert.ok(flippedHits < weakHits / 3, `5 × 6 is mastered and should come up much less (${flippedHits})`);
});

test('practice with no history uses unseen facts; tiny tables repeat', () => {
  const picks = P.pickPracticeFacts({}, 12, 20);
  assert.equal(picks.length, 20);
  assert.ok(picks.some(([a, b]) => a > 6 || b > 6), 'goes up to the table size');
  assert.equal(P.pickPracticeFacts({}, 1, 3).length, 3); // only 1 × 1 exists
});

test('best time per fact, with the average as a fallback for old saves', () => {
  const s = P.createProgress();
  P.recordAnswer(s, 'Leo', { a: 2, b: 3, firstTry: true, correct: true, ms: 4000 });
  P.recordAnswer(s, 'Leo', { a: 2, b: 3, firstTry: true, correct: true, ms: 2500 });
  P.recordAnswer(s, 'Leo', { a: 3, b: 2, firstTry: true, correct: true, ms: 1000 }); // the other order
  assert.equal(P.factBestMs(s.facts.leo.facts['2 × 3']), 2500);
  assert.equal(P.factBestMs(s.facts.leo.facts['3 × 2']), 1000);
  assert.equal(P.factBestMs({ timed: 2, totalMs: 7000 }), 3500);
  assert.equal(P.factBestMs({ timed: 0, totalMs: 0 }), null);
});

test('times-table line achievements need both orders: learner then master', () => {
  const s = P.createProgress();
  const answer = (a, b) => {
    P.recordAnswer(s, 'Leo', { a, b, firstTry: true, correct: true, ms: 3000 });
    return P.awardAchievements(s, { event: 'answer', correct: true, firstTry: true, ms: 3000, streak: 0, a, b, facts: s.facts.leo.facts, size: 6 }).map((x) => x.id);
  };
  // ×3 on Easy: 3 × 1 … 3 × 6 alone isn't enough …
  for (let m = 1; m <= 6; m++) assert.ok(!answer(3, m).includes('table3_learn'));
  // … the other order 1 × 3 … 6 × 3 completes it
  let got = [];
  for (let m = 1; m <= 6; m++) got.push(...answer(m, 3));
  assert.ok(got.includes('table3_learn'));
  // Mastered: 3 first-try answers on every fact in both orders
  got = [];
  for (let round = 0; round < 2; round++) for (let m = 1; m <= 6; m++) got.push(...answer(3, m), ...answer(m, 3));
  assert.ok(got.includes('table3_master'));
  assert.ok(!P.ACHIEVEMENTS.find((a) => a.id === 'table7_learn').check({ event: 'answer', facts: s.facts.leo.facts, size: 6 }));
  assert.equal(P.ACHIEVEMENTS.filter((a) => a.group === 'Times tables').length, 24);
});

test('practice can be limited to chosen times tables', () => {
  for (let round = 0; round < 100; round++) {
    const picks = P.pickPracticeFacts({}, 8, 10, Math.random, [3, 7]);
    assert.equal(picks.length, 10);
    for (const [a, b] of picks) assert.ok([a, b].includes(3) || [a, b].includes(7), `${a} × ${b} is not a 3 or 7 fact`);
  }
  // one table on Easy has only 6 facts, so a 10-question round repeats some
  const threes = P.pickPracticeFacts({}, 6, 10, Math.random, [3]);
  assert.equal(threes.length, 10);
  assert.ok(threes.every(([a, b]) => a === 3 || b === 3));
  // tables beyond the table size are ignored; none left means the whole table (36 ordered facts)
  const all = P.pickPracticeFacts({}, 6, 36, Math.random, [9]);
  assert.equal(new Set(all.map(([a, b]) => P.factKey(a, b))).size, 36);
});

test('old timer unlock becomes the 30 s and 10 s unlocks', () => {
  const s = P.normalize({ unlocks: ['answerTime', 'board16'] });
  assert.deepEqual(s.unlocks.sort(), ['answerTime10', 'answerTime30', 'board16']);
  assert.equal(P.shopItem('answerTime5').price, 5);
  assert.equal(P.shopItem('answerTime10').price, 10);
  assert.equal(P.shopItem('answerTime30').price, 30);
});

test('best-score tiers: one game can unlock several at once, each only once', () => {
  const s = P.createProgress();
  const game = (bestScore) => P.awardAchievements(s, { event: 'game', games: 1, bestScore }).map((a) => a.id).filter((id) => id.startsWith('score'));
  assert.deepEqual(game(49), []);
  assert.deepEqual(game(160), ['score50', 'score100', 'score150']);
  assert.deepEqual(game(160), []);
  assert.deepEqual(game(420), ['score250', 'score400']);
  assert.equal(P.ACHIEVEMENTS.filter((a) => a.group === 'Scores').length, 5);
});

test('fact speed tiers: mastered plus best time under 10, 5 and 1 seconds, per fact and order', () => {
  assert.equal(P.ACHIEVEMENTS.filter((a) => a.group === 'Fact speed').length, 144 * 3);
  const s = P.createProgress();
  const answer = (a, b, ms) => {
    P.recordAnswer(s, 'Leo', { a, b, firstTry: true, correct: true, ms });
    return P.awardAchievements(s, { event: 'answer', correct: true, firstTry: true, ms, streak: 0, a, b, facts: s.facts.leo.facts, size: 12 })
      .map((x) => x.id).filter((id) => id.startsWith('fact_'));
  };
  // not mastered yet after 1-2 answers, even if fast
  assert.deepEqual(answer(7, 8, 4000), []);
  assert.deepEqual(answer(7, 8, 6000), []);
  // third first-try answer → mastered, best 4 s → 10 s and 5 s tiers
  assert.deepEqual(answer(7, 8, 9000).sort(), ['fact_7x8_10', 'fact_7x8_5']);
  assert.deepEqual(answer(7, 8, 800), ['fact_7x8_1']);
  // 8 × 7 is a different fact
  assert.deepEqual(answer(8, 7, 500), []);
});

test('normalize fills in missing fields', () => {
  const s = P.normalize({ wallet: 42, unlocks: ['board16'] });
  assert.equal(s.wallet, 42);
  assert.deepEqual(s.unlocks, ['board16']);
  assert.deepEqual(s.checkIn, { last: null, streak: 0 });
  assert.deepEqual(P.normalize(null), P.createProgress());
});
