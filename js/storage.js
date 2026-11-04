// Local-first storage. Everything is saved on this device first;
// sync.js (optional) copies it to Firestore in the background.

import { dayStr } from './srs.js';

const KEY = 'n1q-v1';
const ID_RE = /^[a-z0-9_-]{1,40}$/i;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const empty = () => ({ v: 1, progress: {}, days: {}, updatedAt: 0 });
const listeners = new Set();
let state = read();

function read() {
  try {
    return clean(JSON.parse(localStorage.getItem(KEY))) || empty();
  } catch {
    return empty();
  }
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}

/** Validate and normalise anything that claims to be saved data. */
export function clean(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = empty();
  const n = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  if (raw.progress && typeof raw.progress === 'object') {
    for (const [id, e] of Object.entries(raw.progress)) {
      if (!ID_RE.test(id) || !e || typeof e !== 'object' || !DAY_RE.test(e.d)) continue;
      out.progress[id] = { b: Math.min(n(e.b), 6), d: e.d, r: n(e.r), w: n(e.w), t: n(e.t) };
    }
  }
  if (raw.days && typeof raw.days === 'object') {
    for (const [day, c] of Object.entries(raw.days)) {
      if (!DAY_RE.test(day) || !c || typeof c !== 'object') continue;
      out.days[day] = { vocab: n(c.vocab), grammar: n(c.grammar) };
    }
  }
  out.updatedAt = n(raw.updatedAt);
  return out;
}

/** Combine two saves: per question the newer answer wins, per day the bigger count wins. */
export function merge(a, b) {
  const out = empty();
  out.progress = { ...a.progress };
  for (const [id, e] of Object.entries(b.progress)) {
    if (!out.progress[id] || e.t > out.progress[id].t) out.progress[id] = e;
  }
  out.days = { ...a.days };
  for (const [day, c] of Object.entries(b.days)) {
    const x = out.days[day] || { vocab: 0, grammar: 0 };
    out.days[day] = { vocab: Math.max(x.vocab, c.vocab), grammar: Math.max(x.grammar, c.grammar) };
  }
  out.updatedAt = Math.max(a.updatedAt, b.updatedAt);
  return out;
}

export function get() {
  return state;
}

export function onChange(fn) {
  listeners.add(fn);
}

/** Save after a local change (answers etc.). */
export function commit() {
  state.updatedAt = Date.now();
  pruneDays();
  write();
  listeners.forEach((fn) => fn(state, 'local'));
}

/** Replace with merged/imported data. */
export function replace(next, source = 'remote') {
  state = next;
  write();
  listeners.forEach((fn) => fn(state, source));
}

export function reset() {
  replace({ ...empty(), updatedAt: Date.now() }, 'reset');
}

export function countAnswer(cat) {
  const t = dayStr();
  const d = state.days[t] || (state.days[t] = { vocab: 0, grammar: 0 });
  if (cat === 'vocab' || cat === 'grammar') d[cat] += 1;
}

function pruneDays() {
  const keys = Object.keys(state.days).sort();
  while (keys.length > 120) delete state.days[keys.shift()];
}

export function streak() {
  const days = state.days;
  const has = (d) => days[d] && days[d].vocab + days[d].grammar > 0;
  const cur = new Date();
  if (!has(dayStr(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (has(dayStr(cur))) {
    n += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}
