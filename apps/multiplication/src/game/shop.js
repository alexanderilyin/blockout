// Shop: part of the multiplication game (split from the old js/game.js).

import * as Cosmetics from '@blockout/progress/cosmetics';
import * as Progress from '@blockout/progress';
import { $, el } from './base.js';
import { celebrate, formatPoints, progress, saveProgress, toast } from './wallet.js';
import { applyTheme, chooseCosmetic, icon, openStickers, openWardrobe, setWardrobeFilter, syncBoardLocks, syncModeLocks, syncSettingsUI, wardrobeAvailable, wardrobeFilter } from './wardrobe.js';
import { make } from './play.js';
import { tablesLabel, updatePracticePreview } from './practice.js';

let ACTIVATE;

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
    setWardrobeFilter(new Set([...wardrobeAvailable(), ...owned]));
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

function activatePurchase(item) {
  const source = shopSource;
  shopSource = null;
  if (item.cosmetic) chooseCosmetic(item.cosmetic[0], item.cosmetic[1]); // put it on
  else if (source && source.item === item.id && source.el.isConnected) source.el.click(); // the exact thing tapped
  else if (ACTIVATE[item.id]) ACTIVATE[item.id]();
  applyTheme(false); // e.g. golden dice
}

// What this part does when the page loads (main.js runs every part in order)
export function run() {
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

  // Bought straight from the shop list: switch on the obvious choice. Items with
  // more than one choice and no clear favourite (CPU speed, placing) are left alone.
  ACTIVATE = {
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

  el.shopDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeShop();
  });
}

export { affordableCount, affordableLooks, confirmUnlock, filterNote, markSeen, newStickers, newWardrobe, refreshAvailableFilters, refreshNudges, refreshOpenNudges, renderShop, renderWalletBar, seenList, spareStickers, tap, wardrobeKeys };
