// N1 クイズ — main app (no framework, no build step).
import * as store from './storage.js';
import { buildSession, grade, isDue, dayStr, shuffle } from './srs.js';
import { initRadio } from './radio.js';
import { initWidgets, tickWidgets, examInfo, themePicker } from './widgets.js';

const TYPES = {
  yomi: { label: '漢字読み', short: '読み', prompt: '＿＿の言葉の読み方として最もよいものを選びなさい。' },
  bunmyaku: { label: '文脈規定', short: '文脈', prompt: '（　　）に入れるのに最もよいものを選びなさい。' },
  iikae: { label: '言い換え類義', short: '言換', prompt: '＿＿の言葉に意味が最も近いものを選びなさい。' },
  youhou: { label: '用法', short: '用法', prompt: '次の言葉の使い方として最もよいものを選びなさい。' },
  bunpou: { label: '文法形式', short: '文法', prompt: '（　　）に入れるのに最もよいものを選びなさい。' },
  narabe: { label: '並べ替え', short: '並替', prompt: '★に入る最もよいものを選びなさい。' },
  bunshou: { label: '文章の文法', short: '文章', prompt: '文章を読んで、（　）に入る最もよいものを選びなさい。' },
};
const FW = '０１２３４５６７８９';
const fullNum = (n) => String(n).split('').map((d) => FW[Number(d)]).join('');
const passages = new Map();
const TYPE_ORDER = Object.keys(TYPES);
const MODE_LABEL = { vocab: '語彙', grammar: '文法', mix: 'ミックス', review: 'ふくしゅう' };
const SESSION_SIZE = 20;
const SYNC_TEXT = {
  off: '未ログイン', loading: '同期中…', ok: '同期OK', offline: 'オフライン',
  denied: '同期できないアカウント', error: '同期エラー',
};

const $ = (sel) => document.querySelector(sel);
const screen = $('#screen');
const desktopMQ = window.matchMedia('(min-width:1100px)');

let questions = [];
let session = null;
let lastMissed = [];
let current = 'home';
let sync = null;
let syncStatus = 'off';
let syncUser = null;

/* ---------- tiny DOM helper (text only, never innerHTML) ---------- */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

/** {word} → underlined, （　　） → blank, ★ → red star. */
function rich(text) {
  return text.split(/(\{[^}]+\}|（　　）|★)/).filter(Boolean).map((part) => {
    if (part.startsWith('{') && part.endsWith('}')) return h('u', null, part.slice(1, -1));
    if (part === '（　　）') return h('span', { class: 'blank' }, '（　　）');
    if (part === '★') return h('span', { class: 'star' }, '★');
    return part;
  });
}
const plain = (t) => t.replace(/[{}]/g, '');

/* ---------- data ---------- */
function validQ(q) {
  return q && typeof q.id === 'string' && /^[a-z0-9_-]{1,40}$/i.test(q.id) &&
    (q.cat === 'vocab' || q.cat === 'grammar') && TYPES[q.type] &&
    typeof q.q === 'string' && Array.isArray(q.opts) && q.opts.length === 4 &&
    q.opts.every((o) => typeof o === 'string') && Number.isInteger(q.a) && q.a >= 0 && q.a < 4 &&
    typeof q.exp === 'string' &&
    (q.type !== 'bunshou' || (passages.has(q.pid) && Number.isInteger(q.n) && q.n > 0 && q.n < 10));
}

async function loadData() {
  const files = ['data/vocab.json', 'data/grammar.json', 'data/passages.json'];
  const [vocab, grammar, texts] = await Promise.all(files.map(async (f) => {
    const r = await fetch(f);
    if (!r.ok) throw new Error(f);
    return r.json();
  }));
  for (const p of Array.isArray(texts) ? texts : []) {
    if (p && typeof p.id === 'string' && typeof p.text === 'string') passages.set(p.id, p);
  }
  const seen = new Set();
  for (const q of [...vocab, ...grammar]) {
    if (!validQ(q) || seen.has(q.id)) continue;
    seen.add(q.id);
    questions.push(q);
  }
}

/* ---------- numbers ---------- */
function dueCount() {
  const p = store.get().progress;
  const t = dayStr();
  return questions.filter((q) => isDue(p[q.id], t)).length;
}

function accuracy() {
  const p = store.get().progress;
  const acc = {};
  for (const k of [...TYPE_ORDER, 'vocab', 'grammar', 'all']) acc[k] = { r: 0, w: 0, seen: 0 };
  for (const q of questions) {
    const e = p[q.id];
    if (!e) continue;
    for (const k of [q.type, q.cat, 'all']) {
      acc[k].r += e.r;
      acc[k].w += e.w;
      acc[k].seen += 1;
    }
  }
  for (const v of Object.values(acc)) v.pct = v.r + v.w ? Math.round((v.r / (v.r + v.w)) * 100) : null;
  return acc;
}

function todayCounts() {
  return store.get().days[dayStr()] || { vocab: 0, grammar: 0 };
}

/* ---------- titles ---------- */
function setTitle(num, label, score = '') {
  const t = `${String(num ?? 0).padStart(3, '0')} ${label}`;
  $('#ptitle').textContent = t;
  $('#wtitle').textContent = num != null ? `もんだい ‐ ${t}` : label;
  $('#pscore').textContent = score;
  document.title = `${label} | N1 クイズ`;
}

/* ---------- home ---------- */
function renderHome() {
  if (current !== 'home') window.dispatchEvent(new Event('n1q-home'));
  current = 'home';
  session = null;
  setTitle(null, 'ホーム');
  const acc = accuracy();
  const due = dueCount();
  const tc = todayCounts();
  const item = (go, label, count, cls) =>
    h('button', { 'data-go': go, class: cls }, h('span', null, label), h('span', { class: 'cnt' }, count));
  screen.replaceChildren(
    h('div', { class: 'half tl' }),
    h('h2', { class: 'sfx title-sfx' }, 'N1 クイズ!!'),
    h('p', { class: 'sub' }, `れんぞく ${store.streak()}日目　きょう ${tc.vocab + tc.grammar}問`),
    (() => {
      const ex = examInfo();
      return ex.days >= 0 ? h('p', { class: 'sub exam-line' }, `JLPT（${ex.place}）まで `, h('b', null, `あと${ex.days}日`)) : null;
    })(),
    h('div', { class: 'menu' },
      item('vocab', '語彙', SESSION_SIZE),
      item('grammar', '文法', SESSION_SIZE),
      item('mix', 'ミックス', SESSION_SIZE),
      item('review', 'ふくしゅう（ミスした問題）', due, 'rev'),
    ),
    h('h3', { class: 'sub types-h' }, 'タイプ別'),
    h('div', { class: 'types' }, TYPE_ORDER.map((t) => {
      const n = questions.filter((q) => q.type === t).length;
      return h('button', { 'data-go': `type:${t}`, disabled: n === 0 },
        h('span', null, TYPES[t].label),
        h('small', null, `${questions.find((q) => q.type === t)?.cat === 'grammar' ? '文法' : '語彙'}・${n}問`));
    })),
    h('div', { class: 'tiles' },
      tile(acc.vocab.pct, '%', '語彙'),
      tile(acc.grammar.pct, '%', '文法'),
      tile(acc.all.seen, '', 'といた問題'),
    ),
  );
  updateSide();
}

function tile(value, unit, label) {
  return h('div', { class: 'tile' }, h('b', null, value == null ? '0' : String(value), unit), h('span', null, label));
}

/* ---------- quiz ---------- */
function start(mode) {
  const qs = buildSession(questions, store.get().progress, mode, SESSION_SIZE);
  current = 'quiz';
  if (!qs.length) {
    session = null;
    setTitle(null, mode === 'review' ? 'ふくしゅう' : 'クイズ');
    screen.replaceChildren(
      h('p', { class: 'empty' }, mode === 'review' ? 'いま ふくしゅうする問題はないよ！' : '問題がありません'),
      h('div', { class: 'actions' }, h('button', { class: 'btn', 'data-go': 'home' }, 'ホーム')),
    );
    return;
  }
  session = {
    label: typeof mode === 'string' ? MODE_LABEL[mode] : mode.type ? TYPES[mode.type].label : 'ミスだけ',
    items: qs.map((q) => ({ q, order: shuffle([0, 1, 2, 3]), first: true, res: null })),
    i: 0, ok: 0, ng: 0, missed: [],
  };
  renderQuestion();
}

function segs() {
  const s = session;
  return h('div', { class: 'segs', 'aria-hidden': 'true' },
    s.items.map((it, i) => h('div', { class: 'seg' + (it.res ? ' ' + it.res : i === s.i ? ' now' : '') })));
}

function renderQuestion() {
  const s = session;
  const it = s.items[s.i];
  const q = it.q;
  const t = TYPES[q.type];
  setTitle(s.i + 1, t.label, `○${s.ok} ×${s.ng}`);
  const long = q.type === 'youhou' || q.opts.some((o) => o.length > 9);
  screen.replaceChildren(
    h('div', { class: 'half tr' }),
    h('p', { class: 'sfx top-sfx pop', 'aria-hidden': 'true' }, 'どっち!?'),
    segs(),
    h('p', { class: 'meta' }, `${s.label} ${s.i + 1} / ${s.items.length}　○${s.ok} ×${s.ng}${it.first ? '' : '　（もう一回）'}`),
    h('p', { class: 'prompt' }, q.type === 'bunshou' ? t.prompt.replace('（　）', `（${fullNum(q.n)}）`) : t.prompt),
    q.type === 'youhou' ? h('p', { class: 'word' }, q.q)
      : q.type === 'bunshou' ? passageBox(q)
      : h('p', { class: 'sent' }, rich(q.q)),
    h('div', { class: 'opts' + (long ? ' long' : '') },
      it.order.map((oi, k) => h('button', { class: 'opt', onclick: () => answer(k) },
        h('span', { class: 'num' }, String(k + 1)), h('span', null, q.opts[oi])))),
    h('div', { class: 'actions' },
      h('span', { class: 'hint' }, 'キーボード 1〜4 でもOK'),
      h('button', { class: 'btn ghost', onclick: () => answer(-1) }, 'わからない'),
      h('button', { class: 'btn', onclick: finish }, 'やめる')),
  );
  updateSide();
}

/** Passage with numbered blanks; the current one is highlighted. */
function passageBox(q) {
  const p = passages.get(q.pid);
  const box = h('div', { class: 'passage', tabindex: '0', 'aria-label': p.title },
    h('h4', null, p.title),
    p.text.split('\n').map((para) => h('p', null, para.split(/(（[０-９]+）)/).filter(Boolean).map((part) => {
      const m = part.match(/^（([０-９]+)）$/);
      if (!m) return part;
      const num = [...m[1]].map((c) => FW.indexOf(c)).join('');
      return h('span', { class: 'pblank' + (Number(num) === q.n ? ' cur' : '') }, part);
    }))));
  requestAnimationFrame(() => {
    const cur = box.querySelector('.cur');
    if (cur) box.scrollTop = Math.max(0, cur.offsetTop - box.offsetTop - box.clientHeight / 2);
  });
  return box;
}

function answer(k) {
  const s = session;
  if (!s) return;
  const it = s.items[s.i];
  if (it.res) return;
  const q = it.q;
  const ok = k >= 0 && it.order[k] === q.a;
  it.res = ok ? 'ok' : 'ng';
  let nextDue = null;
  if (it.first) {
    const st = store.get();
    st.progress[q.id] = grade(st.progress[q.id], ok);
    nextDue = st.progress[q.id].d;
    store.countAnswer(q.cat);
    store.commit();
    if (ok) s.ok += 1;
    else {
      s.ng += 1;
      s.missed.push(q.id);
      const at = Math.min(s.i + 5, s.items.length);
      s.items.splice(at, 0, { q, order: shuffle([0, 1, 2, 3]), first: false, res: null });
    }
  }
  renderFeedback(it, k, ok, nextDue);
}

function daysUntil(day) {
  const [y, m, d] = day.split('-').map(Number);
  const now = new Date();
  return Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}

function renderFeedback(it, k, ok, nextDue) {
  const s = session;
  const q = it.q;
  setTitle(s.i + 1, TYPES[q.type].label, `○${s.ok} ×${s.ng}`);

  screen.querySelectorAll('.opt').forEach((btn, kk) => {
    const oi = it.order[kk];
    btn.disabled = true;
    if (oi === q.a) {
      btn.classList.add('right');
      btn.append(h('span', { class: 'tag' }, '○ せいかい'));
    } else if (kk === k) {
      btn.classList.add('wrong');
      btn.append(h('span', { class: 'tag' }, '× あなた'));
    } else btn.classList.add('dim');
  });

  screen.querySelector('.top-sfx')?.remove();
  screen.querySelector('.half')?.remove();
  screen.querySelector('.segs').replaceWith(segs());
  screen.querySelector('.meta').textContent =
    `${s.label} ${s.i + 1} / ${s.items.length}　○${s.ok} ×${s.ng}${it.first ? '' : '　（もう一回）'}`;
  screen.prepend(h('div', { class: 'banner ' + (ok ? 'speed' : 'rain') },
    h('div', { class: 'half c' + (ok ? '' : ' gray') }),
    h('p', { class: 'sfx ' + (ok ? 'boing' : 'shake') }, ok ? 'せいかい!!' : 'ざんねん!!')));

  let note;
  if (!it.first) note = ok ? 'よし！ おぼえたね' : 'あしたもう一回でるよ。がんばろう！';
  else if (ok) note = `→ つぎは ${daysUntil(nextDue)}日後にでるよ`;
  else note = '→ ふくしゅうリストに追加。このあとと明日またでるよ';

  const board = h('div', { class: 'board' },
    h('h3', null, 'かいせつ'),
    q.exp.split('\n').map((line) => h('p', null, line)),
    q.full ? h('p', { class: 'full' }, '正しい順番：' + q.full) : null,
    q.ex ? h('p', { class: 'ex' }, '例）' + q.ex) : null);
  const last = s.i >= s.items.length - 1;
  const nextBtn = h('button', { class: 'btn', onclick: () => next() }, last ? 'けっか →' : 'つぎ →');
  screen.querySelector('.actions').replaceWith(
    board,
    h('p', { class: 'note' }, note),
    h('p', { class: 'swipe-hint', 'aria-hidden': 'true' }, '← スワイプでつぎへ'),
    h('div', { class: 'actions' }, h('span', { class: 'hint' }, 'Enter でつぎへ'), nextBtn),
  );
  nextBtn.focus({ preventScroll: true });
  if (!desktopMQ.matches) board.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  updateSide();
}

function next(fromSwipe = false) {
  if (!session) return;
  session.i += 1;
  if (session.i >= session.items.length) finish();
  else {
    renderQuestion();
    window.scrollTo({ top: 0 });
  }
  if (fromSwipe) {
    screen.classList.remove('slide-in');
    void screen.offsetWidth; // restart the animation
    screen.classList.add('slide-in');
  }
}

function finish() {
  const s = session;
  if (!s || s.ok + s.ng === 0) return renderHome();
  session = null;
  current = 'result';
  lastMissed = [...new Set(s.missed)];
  const total = s.ok + s.ng;
  const pct = Math.round((s.ok / total) * 100);
  const [txt, cls] = pct >= 80 ? ['やったね!!', 'speed'] : pct >= 50 ? ['まあまあ!?', 'speed'] : ['がんばれ!!', 'rain'];
  setTitle(null, 'けっか');
  const byId = new Map(questions.map((q) => [q.id, q]));
  screen.replaceChildren(
    h('div', { class: 'banner ' + cls },
      h('div', { class: 'half c' + (cls === 'rain' ? ' gray' : '') }),
      h('p', { class: 'sfx boing' }, txt)),
    h('p', { class: 'big-score' }, `${s.ok}/${total}`),
    h('p', { class: 'sub' }, `せいかい率 ${pct}%　れんぞく ${store.streak()}日目`),
    lastMissed.length ? h('h3', { class: 'sub' }, 'ミスした問題') : h('p', { class: 'sub' }, 'ノーミス！ すごい！'),
    h('ul', { class: 'misslist' }, lastMissed.map((id) => {
      const q = byId.get(id);
      const label = q.type === 'bunshou' ? `「${passages.get(q.pid).title}」${q.q}` : plain(q.q);
      return h('li', null, label, h('br'), h('span', { class: 'a' }, '○ ' + q.opts[q.a]));
    })),
    h('div', { class: 'actions' },
      lastMissed.length ? h('button', { class: 'btn alt', 'data-go': 'retry' }, 'ミスだけもういちど') : null,
      h('button', { class: 'btn', 'data-go': 'home' }, 'ホーム')),
  );
  window.scrollTo({ top: 0 });
  updateSide();
}

/* ---------- stats ---------- */
function renderStats() {
  current = 'stats';
  session = null;
  setTitle(null, 'せいせき');
  const acc = accuracy();
  const st = store.get();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayStr(d);
    const c = st.days[key] || { vocab: 0, grammar: 0 };
    days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, n: c.vocab + c.grammar });
  }
  const max = Math.max(1, ...days.map((d) => d.n));
  const bar = (label, pct, text) => {
    const fill = h('div', { class: 'fill' });
    fill.style.width = `${pct || 0}%`;
    return h('div', { class: 'bar' }, h('span', null, label), h('div', { class: 'track' }, fill), h('span', null, text));
  };
  screen.replaceChildren(
    h('div', { class: 'card' },
      h('h3', null, 'ぜんたい'),
      h('p', null, `といた問題：${acc.all.seen} / ${questions.length}`),
      h('p', null, `せいかい率：${acc.all.pct ?? '-'}%`),
      h('p', null, `ふくしゅう待ち：${dueCount()}問　れんぞく：${store.streak()}日`)),
    h('div', { class: 'card' },
      h('h3', null, 'タイプ別 せいかい率'),
      h('div', { class: 'bars' }, TYPE_ORDER.map((t) => bar(TYPES[t].label, acc[t].pct, acc[t].pct == null ? '-' : acc[t].pct + '%')))),
    h('div', { class: 'card' },
      h('h3', null, 'さいきん7日'),
      h('div', { class: 'bars' }, days.map((d) => bar(d.label, (d.n / max) * 100, d.n + '問')))),
    h('div', { class: 'actions' }, h('button', { class: 'btn', 'data-go': 'home' }, 'ホーム')),
  );
  window.scrollTo({ top: 0 });
}

/* ---------- settings ---------- */
function renderSettings() {
  current = 'settings';
  session = null;
  setTitle(null, 'せってい');
  const loggedIn = !!syncUser;
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: importFile });
  let armed = false;
  const resetBtn = h('button', { class: 'btn alt', onclick: () => {
    if (!armed) {
      armed = true;
      resetBtn.textContent = 'ほんとうに消す？（もう一回押す）';
      setTimeout(() => { armed = false; resetBtn.textContent = 'きろくを全部消す'; }, 4000);
      return;
    }
    store.reset();
    renderSettings();
  } }, 'きろくを全部消す');

  screen.replaceChildren(
    h('div', { class: 'card' },
      h('h3', null, 'テーマ'),
      themePicker()),
    h('div', { class: 'card' },
      h('h3', null, '同期（パソコン ⇄ スマホ）'),
      h('p', null, `状態：${SYNC_TEXT[syncStatus] || syncStatus}`),
      loggedIn ? h('p', { class: 'small' }, `ログイン中：${syncUser.email || ''}`) : h('p', { class: 'small' }, 'Googleでログインすると、きろくが他の端末と同期されます。'),
      h('div', { class: 'actions' },
        loggedIn
          ? [h('button', { class: 'btn ghost', onclick: () => sync?.syncNow() }, 'いますぐ同期'),
             h('button', { class: 'btn', onclick: logout }, 'ログアウト')]
          : h('button', { class: 'btn', onclick: login }, 'Googleでログイン'))),
    h('div', { class: 'card' },
      h('h3', null, 'データ'),
      h('p', { class: 'small' }, 'きろくはこの端末に自動でほぞんされます。バックアップ用にファイルにも書き出せます。'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn ghost', onclick: exportFile }, '書き出す'),
        h('button', { class: 'btn ghost', onclick: () => fileInput.click() }, '読み込む'),
        fileInput, resetBtn)),
    h('div', { class: 'card' },
      h('h3', null, 'ぴくちゃ窓の画像'),
      h('p', { class: 'small' }, 'リポジトリの img/ に画像を入れて、img/list.json にファイル名を書くと、パソコン画面の「ぴくちゃ.jpg」に出ます。')),
    h('div', { class: 'actions' }, h('button', { class: 'btn', 'data-go': 'home' }, 'ホーム')),
  );
  window.scrollTo({ top: 0 });
}

function exportFile() {
  const blob = new Blob([JSON.stringify(store.get())], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `n1-quiz-backup-${dayStr()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || file.size > 5_000_000) return;
  try {
    const data = store.clean(JSON.parse(await file.text()));
    if (!data) throw new Error('bad file');
    store.replace(store.merge(store.get(), data), 'import');
    renderSettings();
  } catch {
    alert('このファイルは読み込めませんでした。');
  }
}

/* ---------- sync (loaded only when needed) ---------- */
async function loadSync() {
  if (sync) return sync;
  const mod = await import('./sync.js');
  sync = mod.createSync(store, (status, user) => {
    syncStatus = status;
    syncUser = user;
    $('#sync-state').textContent = SYNC_TEXT[status] || status;
    if (status === 'ok') localStorage.setItem('n1q-sync', '1');
    if (current === 'settings') renderSettings();
  });
  return sync;
}

async function login() {
  try {
    const s = await loadSync();
    await s.login();
  } catch (err) {
    syncStatus = 'error';
    $('#sync-state').textContent = SYNC_TEXT.error;
    if (current === 'settings') renderSettings();
  }
}

async function logout() {
  localStorage.removeItem('n1q-sync');
  if (sync) await sync.logout();
}

/* ---------- desktop side widgets ---------- */
function tick() {
  const d = new Date();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  $('#clock').textContent = hm;
  $('#tclock').textContent = hm;
  $('#date').replaceChildren(
    h('span', null, `${d.getMonth() + 1}月${d.getDate()}日`),
    h('span', null, '日月火水木金土'[d.getDay()] + '曜日'));
  try { tickWidgets(d); } catch (err) { console.error(err); }
}
window.addEventListener('n1q-exam', () => { if (current === 'home') renderHome(); });

function updateSide() {
  const due = dueCount();
  const badge = $('#icon-due');
  badge.textContent = String(due);
  badge.hidden = due === 0;
  if (!desktopMQ.matches) return;

  const tc = todayCounts();
  const li = (done, text) => h('li', { class: done ? 'done' : '' }, (done ? '☑ ' : '☐ ') + text);
  $('#todo').replaceChildren(
    li(tc.vocab >= SESSION_SIZE, `語彙 ${Math.min(tc.vocab, SESSION_SIZE)}/${SESSION_SIZE}問`),
    li(tc.grammar >= SESSION_SIZE, `文法 ${Math.min(tc.grammar, SESSION_SIZE)}/${SESSION_SIZE}問`),
    li(due === 0, `ふくしゅう のこり ${due}問`),
    li(false, 'N1 ごうかく！！'));

  const s = session;
  $('#lcd').textContent = s
    ? `▶ now studying… ${s.label} ${String(s.i + 1).padStart(2, '0')}/${s.items.length}`
    : `▶ ready… 全 ${questions.length}問`;

  const acc = accuracy();
  $('#eq').replaceChildren(...TYPE_ORDER.map((t) => {
    const bar = h('div', { class: 'eqb' });
    bar.style.height = `${Math.max(3, acc[t].pct ?? 0) * 0.8}%`;
    return h('div', { class: 'eqc', title: `${TYPES[t].label} ${acc[t].pct ?? '-'}%` }, bar, h('span', null, TYPES[t].short));
  }));
  const weakest = TYPE_ORDER.filter((t) => acc[t].pct != null).sort((a, b) => acc[a].pct - acc[b].pct).slice(0, 3);
  $('#tracks').replaceChildren(...(weakest.length
    ? weakest.map((t, i) => h('li', null, h('span', null, `0${i + 1}. ${TYPES[t].label}`), h('b', null, `${acc[t].pct}%`)))
    : [h('li', null, h('span', null, '01. まだデータなし'), h('b', null, '--'))]));
}

/* ---------- picture window ---------- */
let pics = [];
let picIndex = 0;
async function loadPics() {
  if (!desktopMQ.matches) return;
  try {
    const r = await fetch('img/list.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const list = await r.json();
    pics = shuffle((Array.isArray(list) ? list : []).filter((n) => typeof n === 'string' && /^[\w.-]+\.(png|jpe?g|webp|gif|avif)$/i.test(n)));
    showPic();
  } catch { /* no pictures: keep placeholder */ }
}
function showPic() {
  if (!pics.length) return;
  picIndex %= pics.length;
  $('#pic').replaceChildren(h('img', { src: 'img/' + encodeURIComponent(pics[picIndex]), alt: '', decoding: 'async' }));
}
$('#pic-next').addEventListener('click', () => { picIndex += 1; showPic(); });

/* ---------- navigation & keys ---------- */
function go(target) {
  if (target === 'home') renderHome();
  else if (target === 'stats') renderStats();
  else if (target === 'settings') renderSettings();
  else if (target === 'reader') { import('./reader.js').then((m) => m.openReader()); return; }
  else if (target === 'retry') start({ ids: lastMissed });
  else if (target.startsWith('type:') && TYPES[target.slice(5)]) start({ type: target.slice(5) });
  else if (MODE_LABEL[target]) start(target);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-go]');
  if (el) go(el.getAttribute('data-go'));
});

// Phone: drag the question sideways; let go past the threshold (or flick) to go to the next one.
(() => {
  let x0 = null;
  let y0 = null;
  let t0 = 0;
  let axis = null;
  let dx = 0;
  const canGo = () => (session && session.items[session.i]?.res) || current === 'result';
  const reset = (animate) => {
    screen.style.transition = animate ? 'transform .22s ease-out, opacity .22s ease-out' : '';
    screen.style.transform = '';
    screen.style.opacity = '';
  };
  screen.addEventListener('touchstart', (e) => {
    if (desktopMQ.matches || e.touches.length !== 1 || e.target.closest('input,textarea,.passage')) { x0 = null; return; }
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
    t0 = Date.now();
    axis = null;
    dx = 0;
    screen.style.transition = '';
  }, { passive: true });
  screen.addEventListener('touchmove', (e) => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0;
    const my = e.touches[0].clientY - y0;
    if (!axis && (Math.abs(mx) > 8 || Math.abs(my) > 8)) axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    if (axis !== 'x') return;
    dx = mx;
    const free = dx < 0 && canGo();
    const shown = free ? dx : dx * 0.2; // locked or wrong direction: just a little rubber-band
    screen.style.transform = `translateX(${shown}px)`;
    screen.style.opacity = free ? String(Math.max(0.35, 1 + dx / (screen.offsetWidth * 1.2))) : '';
  }, { passive: true });
  const end = () => {
    if (x0 == null) return;
    x0 = null;
    if (axis !== 'x') return reset(false);
    const speed = Math.abs(dx) / Math.max(1, Date.now() - t0);
    const go = dx < 0 && canGo() && (dx < -screen.offsetWidth * 0.22 || (speed > 0.4 && dx < -30));
    if (!go) return reset(true);
    screen.style.transition = 'transform .16s ease-in, opacity .16s ease-in';
    screen.style.transform = 'translateX(-105%)';
    screen.style.opacity = '0';
    setTimeout(() => {
      reset(false);
      if (current === 'result') renderHome();
      else next(true);
    }, 160);
  };
  screen.addEventListener('touchend', end, { passive: true });
  screen.addEventListener('touchcancel', () => { x0 = null; reset(true); }, { passive: true });
})();

document.addEventListener('keydown', (e) => {
  if (!session || e.target.closest('input,textarea,select') || e.metaKey || e.ctrlKey || e.altKey) return;
  const it = session.items[session.i];
  if (!it) return;
  if (!it.res && /^[1-4]$/.test(e.key)) {
    e.preventDefault();
    answer(Number(e.key) - 1);
  } else if (it.res && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) {
    e.preventDefault();
    next();
  }
});

store.onChange((_, source) => {
  if (source === 'remote' || source === 'import' || source === 'reset') {
    if (current === 'home') renderHome();
    else if (current === 'stats') renderStats();
  }
  updateSide();
});

desktopMQ.addEventListener('change', () => { updateSide(); if (!pics.length) loadPics(); });

/* ---------- boot ---------- */
async function boot() {
  for (const init of [initWidgets, initRadio]) {
    try { init(); } catch (err) { console.error(err); }
  }
  tick();
  setInterval(tick, 15000);
  screen.replaceChildren(h('p', { class: 'empty' }, 'よみこみ中…'));
  try {
    await loadData();
  } catch {
    screen.replaceChildren(h('p', { class: 'empty' }, '問題データを読み込めませんでした。再読み込みしてね。'));
    return;
  }
  renderHome();
  loadPics();
  if (localStorage.getItem('n1q-sync') === '1') {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
    idle(() => loadSync().catch(() => {}));
  }
  if ('serviceWorker' in navigator) {
    // When a new version takes over, reload once (but never in the middle of a quiz).
    const hadController = !!navigator.serviceWorker.controller;
    let pending = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      if (current === 'home' || current === 'settings' || current === 'stats') location.reload();
      else pending = true;
    });
    window.addEventListener('n1q-home', () => { if (pending) location.reload(); });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  }
}
boot();
