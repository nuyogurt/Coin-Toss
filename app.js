'use strict';

/* ==========================================================
   Coin Toss — app.js
   ========================================================== */

const coin = document.querySelector('#coin');
const shadow = document.querySelector('#shadow');
const ripple = document.querySelector('#ripple');
const flipBtn = document.querySelector('#flip-button');
const fastBtn = document.querySelector('#fast-button');
const resetBtn = document.querySelector('#reset-button');
const resultEl = document.querySelector('#result');
const headCountEl = document.querySelector('#head-count');
const tailCountEl = document.querySelector('#tail-count');
const headPctEl = document.querySelector('#head-pct');
const tailPctEl = document.querySelector('#tail-pct');
const totalEl = document.querySelector('#totalCount');
const actualFill = document.querySelector('#actualFill');
const actualTarget = document.querySelector('#actualTarget');
const streakText = document.querySelector('#streakText');
const oddsInput = document.querySelector('#oddsInput');
const oddsValue = document.querySelector('#oddsValue');
const presets = document.querySelectorAll('.preset');
const historyEl = document.querySelector('#history');
const bubbleContainer = document.querySelector('#bubbleContainer');

const STORAGE_KEY = 'coin-toss-v2';
const HISTORY_MAX = 30;
const FLIP_MS = 2200;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LABEL = { head: 'HEADS', tail: 'TAILS' };

const state = {
    heads: 0,
    tails: 0,
    odds: 50,          // chance of HEADS, in percent
    history: [],       // terbaru di depan: 'head' | 'tail'
    angle: 0,          // sudut rotasi koin saat ini
    flipping: false,
    flipId: 0,         // used to cancel an in-progress flip on reset
};

/* ---------- Storage (optional; safe if the browser blocks it) ---------- */
function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved) return;
        state.heads = saved.heads | 0;
        state.tails = saved.tails | 0;
        state.odds = Math.min(100, Math.max(0, Number(saved.odds) || 50));
        state.history = Array.isArray(saved.history) ? saved.history.slice(0, HISTORY_MAX) : [];
    } catch { /* ignore */ }
}

function save() {
    try {
        const { heads, tails, odds, history } = state;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ heads, tails, odds, history }));
    } catch { /* ignore */ }
}

/* ---------- Flip logic ---------- */
function toss() {
    return Math.random() * 100 < state.odds ? 'head' : 'tail';
}

function record(side) {
    if (side === 'head') state.heads++;
    else state.tails++;
    state.history.unshift(side);
    state.history.length = Math.min(state.history.length, HISTORY_MAX);
}

/* ---------- Rendering ---------- */
function renderScores(bumpSide) {
    const total = state.heads + state.tails;
    const headPct = total ? (state.heads / total) * 100 : 0;
    const tailPct = total ? 100 - headPct : 0;

    headCountEl.textContent = state.heads;
    tailCountEl.textContent = state.tails;
    headPctEl.textContent = `${headPct.toFixed(1).replace('.0', '')}%`;
    tailPctEl.textContent = `${tailPct.toFixed(1).replace('.0', '')}%`;
    totalEl.textContent = total;
    actualFill.style.width = `${total ? headPct : 50}%`;

    if (bumpSide) {
        const el = bumpSide === 'head' ? headCountEl : tailCountEl;
        el.classList.remove('is-bump');
        void el.offsetWidth;
        el.classList.add('is-bump');
    }

    renderStreak();
    renderHistory();
}

function renderStreak() {
    const [first] = state.history;
    if (!first) {
        streakText.textContent = 'No flips yet';
        return;
    }
    let streak = 0;
    while (state.history[streak] === first) streak++;
    const total = state.heads + state.tails;
    const realPct = Math.round((state.heads / total) * 100);
    streakText.innerHTML =
        `Actual heads <b>${realPct}%</b> (target ${state.odds}%)` +
        (streak > 1 ? ` · Streak <b>${streak}× ${LABEL[first]}</b>` : '');
}

function renderHistory() {
    historyEl.innerHTML = state.history
        .map((side, i) => `<li class="is-${side}" title="${LABEL[side]}" style="animation-delay:${i === 0 ? 0 : -1}s">${side === 'head' ? 'H' : 'T'}</li>`)
        .join('');
}

function renderOdds() {
    const p = state.odds;
    oddsInput.value = p;
    oddsInput.style.setProperty('--p', `${p}%`);
    oddsValue.innerHTML = `<b>Heads ${p}%</b> · <b>Tails ${100 - p}%</b>`;
    actualTarget.style.left = `${p}%`;
    presets.forEach((btn) => btn.classList.toggle('is-active', Number(btn.dataset.odds) === p));
}

function showResult(side) {
    resultEl.className = `result is-${side}`;
    resultEl.textContent = `${LABEL[side]}!`;
}

function setBusy(busy) {
    state.flipping = busy;
    flipBtn.disabled = busy;
    fastBtn.disabled = busy;
}

/* ---------- Coin animation ---------- */
function flip() {
    if (state.flipping) return;
    const side = toss();
    const id = ++state.flipId;
    setBusy(true);
    resultEl.className = 'result';
    resultEl.textContent = 'Flipping…';
    coin.classList.remove('is-landed');
    createBubbles();

    // Random number of full turns, then stop on the result side (0° = heads, 180° = tails)
    const start = state.angle;
    const turns = 5 + Math.floor(Math.random() * 3);
    const base = Math.ceil(start / 360) * 360 + turns * 360;
    const end = base + (side === 'tail' ? 180 : 0);
    const mid = start + (end - start) * 0.55;
    const duration = reduceMotion ? 300 : FLIP_MS;

    const coinAnim = coin.animate([
        { transform: `translateY(0) rotateX(${start}deg) scale(1)`, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
        { transform: `translateY(-90px) rotateX(${mid}deg) scale(1.12)`, offset: 0.45, easing: 'cubic-bezier(0.6, 0, 0.9, 0.5)' },
        { transform: `translateY(0) rotateX(${end - 8}deg) scale(1)`, offset: 0.86, easing: 'ease-out' },
        { transform: `translateY(-14px) rotateX(${end + 4}deg) scale(1.02)`, offset: 0.93, easing: 'ease-in' },
        { transform: `translateY(0) rotateX(${end}deg) scale(1)` },
    ], { duration, fill: 'forwards' });

    shadow.animate([
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.45)', opacity: 0.35, offset: 0.45 },
        { transform: 'scale(1)', opacity: 1, offset: 0.86 },
        { transform: 'scale(0.9)', opacity: 0.85, offset: 0.93 },
        { transform: 'scale(1)', opacity: 1 },
    ], { duration });

    coinAnim.finished.then(() => {
        if (id !== state.flipId) return; // reset happened mid-flip
        state.angle = end % 360;
        coin.style.transform = `rotateX(${state.angle}deg)`;
        coinAnim.cancel();

        record(side);
        save();
        renderScores(side);
        showResult(side);
        landEffects(side);
        setBusy(false);
    }).catch(() => { /* animation was cancelled by reset */ });
}

function landEffects(side) {
    coin.classList.add('is-landed');
    ripple.style.setProperty('--ripple', side === 'head' ? 'var(--head)' : 'var(--tail)');
    ripple.classList.remove('is-active');
    void ripple.offsetWidth;
    ripple.classList.add('is-active');
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(30);
}

function fastToss(times = 10) {
    if (state.flipping) return;
    let last = null;
    for (let n = 0; n < times; n++) {
        last = toss();
        record(last);
    }
    state.angle = last === 'tail' ? 180 : 0;
    coin.style.transform = `rotateX(${state.angle}deg)`;
    save();
    renderScores(last);
    resultEl.className = `result is-small is-${last}`;
    resultEl.textContent = `Flipped ${times}× · last one ${LABEL[last]}`;
    landEffects(last);
    createBubbles(6);
}

function reset() {
    state.flipId++; // cancel any flip that is still running
    coin.getAnimations().forEach((a) => a.cancel());
    state.heads = 0;
    state.tails = 0;
    state.history = [];
    state.angle = 0;
    coin.style.transform = 'rotateX(0deg)';
    coin.classList.remove('is-landed');
    setBusy(false);
    resultEl.className = 'result';
    resultEl.innerHTML = 'Press <b>FLIP</b> to start';
    save();
    renderScores();
}

/* ---------- Bubbles ---------- */
function createBubbles(count = 10) {
    if (reduceMotion) return;
    for (let i = 0; i < count; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        const size = Math.random() * 90 + 20;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * 100}vw`;
        bubble.style.setProperty('--h', Math.round(Math.random() * 360));
        bubble.style.setProperty('--dur', `${Math.random() * 2 + 3}s`);
        bubble.style.setProperty('--sway', `${(Math.random() - 0.5) * 120}px`);
        bubble.style.animationDelay = `${Math.random() * 0.4}s`;
        bubble.addEventListener('animationend', () => bubble.remove());
        bubbleContainer.appendChild(bubble);
    }
}

/* ---------- Event ---------- */
flipBtn.addEventListener('click', flip);
fastBtn.addEventListener('click', () => fastToss(10));
resetBtn.addEventListener('click', reset);

oddsInput.addEventListener('input', () => {
    state.odds = Number(oddsInput.value);
    renderOdds();
    renderStreak();
    save();
});

presets.forEach((btn) => btn.addEventListener('click', () => {
    state.odds = Number(btn.dataset.odds);
    renderOdds();
    renderStreak();
    save();
}));

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const onControl = e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement;
    if ((e.key === ' ' || e.key === 'Enter') && !onControl) {
        e.preventDefault();
        flip();
    } else if ((e.key === 'r' || e.key === 'R') && !(e.target instanceof HTMLInputElement)) {
        reset();
    }
});

/* ---------- Start ---------- */
load();
const lastSide = state.history[0];
state.angle = lastSide === 'tail' ? 180 : 0;
coin.style.transform = `rotateX(${state.angle}deg)`;
renderOdds();
renderScores();
