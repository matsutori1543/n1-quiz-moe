// Spaced repetition (simplified Leitner / SM-2 style).
// Each question has a "box". Right answers move it up a box (longer wait),
// a wrong answer drops it to box 1 (due again tomorrow).

export const STEPS = [0, 1, 3, 7, 14, 30, 60]; // days to wait for each box

export function dayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return dayStr(new Date(y, m - 1, d + n));
}

/** Returns a new progress entry after answering. */
export function grade(entry, ok, today = dayStr()) {
  const e = entry ? { ...entry } : { b: 0, d: today, r: 0, w: 0, t: 0 };
  if (ok) {
    e.r += 1;
    e.b = entry ? Math.min(e.b + 1, STEPS.length - 1) : 2; // first try right: wait 3 days
    e.d = addDays(today, STEPS[e.b]);
  } else {
    e.w += 1;
    e.b = 1;
    e.d = addDays(today, 1);
  }
  e.t = Date.now();
  return e;
}

export function isDue(entry, today = dayStr()) {
  return !!entry && entry.d <= today;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick questions for a session.
 * mode: 'vocab' | 'grammar' | 'mix' | 'review' | {ids:[...]}
 */
export function buildSession(questions, progress, mode, size = 20, today = dayStr()) {
  let pool = questions;
  if (mode && mode.ids) {
    const want = new Set(mode.ids);
    return shuffle(questions.filter((q) => want.has(q.id)));
  }
  if (mode === 'vocab' || mode === 'grammar') pool = questions.filter((q) => q.cat === mode);
  if (mode && mode.type) {
    pool = questions.filter((q) => q.type === mode.type);
    if (mode.type === 'bunshou') return passageSession(pool, progress, size, today);
  }

  const due = pool
    .filter((q) => isDue(progress[q.id], today))
    .sort((a, b) => progress[a.id].d.localeCompare(progress[b.id].d));
  if (mode === 'review') return shuffle(due.slice(0, size));

  const unseen = shuffle(pool.filter((q) => !progress[q.id]));
  const rest = shuffle(pool.filter((q) => progress[q.id] && !isDue(progress[q.id], today)));
  const picked = [...due.slice(0, Math.ceil(size / 2)), ...unseen, ...due.slice(Math.ceil(size / 2)), ...rest];
  return shuffle(picked.slice(0, size));
}

/** 文章の文法: whole passages, blanks in order. Passages with due/unseen blanks come first. */
function passageSession(pool, progress, size, today) {
  const byPassage = new Map();
  for (const q of pool) {
    if (!byPassage.has(q.pid)) byPassage.set(q.pid, []);
    byPassage.get(q.pid).push(q);
  }
  const score = (qs) => qs.some((q) => isDue(progress[q.id], today)) ? 0 : qs.some((q) => !progress[q.id]) ? 1 : 2;
  const groups = shuffle([...byPassage.values()]).sort((a, b) => score(a) - score(b));
  const out = [];
  for (const g of groups) {
    if (out.length >= size) break;
    out.push(...g.sort((a, b) => a.n - b.n));
  }
  return out;
}
