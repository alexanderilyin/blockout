// All-time stats: part of the multiplication game (split from the old js/game.js).

import * as Progress from '@blockout/progress';
import { $, el } from './base.js';
import { progress, saveProgress } from './wallet.js';
import { game, isDefaultPlayer, make, renderFactGrid, renderFactLegend, renderPractice } from './play.js';
import { playerFacts } from './practice.js';
import { TOURNAMENT_NAMES, ordinal } from './classroom.js';

let howto;

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

// What this part does when the page loads (main.js runs every part in order)
export function run() {
  el.historyBtn.addEventListener('click', openHistory);

  // How to play popup
  howto = $('howto');

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
}

export { loadHistory, recordGame, recordPracticeRound, saveHistory };
