// More games: a card for each game built on @blockout/game-kit.
import '@blockout/game-kit/style.css';
import { VARIANTS } from '@blockout/engine/variants';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const BOARD_KIND = { grid: 'Grid board', bars: 'Fraction bars' };

document.getElementById('hub-grid').innerHTML = VARIANTS.map((v) => {
  const kind = BOARD_KIND[v.newBoard('easy').kind];
  return `<article class="hub-card">
    <h2><span class="op-badge">${esc(v.op)}</span> ${esc(v.name)}</h2>
    <p class="grade">${esc(v.title)} · ${esc(v.grade)}</p>
    <p class="tag">${esc(v.tagline)}</p>
    <p class="idea">${esc(v.concept)}</p>
    <span class="kind">${kind}${v.answer === 'frac' ? ' · fraction answers' : ''}</span>
    <a class="btn btn-primary" href="/${v.id}/">Play ›</a>
  </article>`;
}).join('');
