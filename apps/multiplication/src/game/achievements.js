// Achievements: part of the multiplication game (split from the old js/game.js).

import * as Progress from '@blockout/progress';
import { el } from './base.js';
import { progress } from './wallet.js';
import { icon } from './wardrobe.js';
import { make, unlockedTableSize } from './play.js';

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

// What this part does when the page loads (main.js runs every part in order)
export function run() {
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
}
