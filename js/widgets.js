// Desktop widgets: minimise/restore, exam countdown, おみくじ, keyboard indicator, taskbar date.

const $ = (id) => document.getElementById(id);
const KEY = 'n1q-widgets';
const EXAM_KEY = 'n1q-exam';
const OMIKUJI_KEY = 'n1q-omikuji';
const DEFAULT_EXAM = { date: '2026-12-06', place: 'ウィーン' };

const load = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
}

/* ---------- minimise / restore ---------- */
function initMinimise() {
  const state = load(KEY, {});
  document.querySelectorAll('.widget').forEach((w) => {
    const id = w.dataset.w;
    const btn = w.querySelector('.wmin');
    const set = (min) => {
      w.classList.toggle('min', min);
      btn.textContent = min ? '+' : '–';
      btn.setAttribute('aria-label', min ? '元に戻す' : '最小化');
    };
    set(!!state[id]);
    btn.addEventListener('click', () => {
      const min = !w.classList.contains('min');
      set(min);
      state[id] = min;
      save(KEY, state);
    });
  });
}

/* ---------- exam countdown ---------- */
export function examInfo() {
  const e = load(EXAM_KEY, DEFAULT_EXAM);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : DEFAULT_EXAM.date;
  const [y, m, d] = date.split('-').map(Number);
  const now = new Date();
  const days = Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  return { date, place: typeof e.place === 'string' ? e.place.slice(0, 20) : DEFAULT_EXAM.place, days, y, m, d };
}

function renderExam(editing = false) {
  const box = $('exam');
  const info = examInfo();
  if (editing) {
    const date = el('input', { type: 'date', value: info.date, 'aria-label': '試験日' });
    const place = el('input', { type: 'text', value: info.place, maxlength: '20', 'aria-label': '会場' });
    box.replaceChildren(
      el('label', null, '試験日 ', date),
      el('label', null, '会場 ', place),
      el('div', { class: 'wrow' },
        el('button', { class: 'wbtn', onclick: () => renderExam(false) }, 'やめる'),
        el('button', { class: 'wbtn main', onclick: () => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(date.value)) save(EXAM_KEY, { date: date.value, place: place.value.trim() || '—' });
          renderExam(false);
          window.dispatchEvent(new Event('n1q-exam'));
        } }, 'ほぞん')));
    return;
  }
  const wd = '日月火水木金土'[new Date(info.y, info.m - 1, info.d).getDay()];
  let big;
  if (info.days > 0) big = el('p', { class: 'exam-days' }, 'あと', el('b', null, String(info.days)), '日');
  else if (info.days === 0) big = el('p', { class: 'exam-days' }, el('b', null, 'きょう!!'));
  else big = el('p', { class: 'exam-days small' }, 'おつかれさま！');
  box.replaceChildren(
    el('p', { class: 'exam-t' }, `JLPT N1 ・ ${info.place}`),
    big,
    el('p', { class: 'exam-d' }, `${info.y}年${info.m}月${info.d}日（${wd}）`),
    info.days > 7 ? el('p', { class: 'exam-s' }, `のこり約${Math.ceil(info.days / 7)}週間`) : null,
    el('button', { class: 'wbtn', onclick: () => renderExam(true) }, '日付を変える'));
}

/* ---------- おみくじ ---------- */
const FORTUNES = [
  ['大吉', '覚えたことが全部頭に残る日。新しい問題にどんどん挑戦！'],
  ['中吉', 'ふくしゅうが吉。ミスした問題を見直すと運気アップ。'],
  ['小吉', '文法の日。並べ替えを10問やってみよう。'],
  ['吉', 'コツコツが一番。10問だけでも、えらい。'],
  ['末吉', '漢字読みから始めると、あとで良いことがある。'],
  ['凶', '無理は禁物。音楽を聴きながら、のんびり5問だけ。'],
];
const LUCKY = ['をもって', 'をよそに', 'ならでは', 'にかたくない', 'を皮切りに', 'ずくめ', 'にほかならない', 'んばかり', 'ずじまい', 'べく', 'といったらない', 'ともなく'];

function renderOmikuji() {
  const box = $('omikuji');
  const saved = load(OMIKUJI_KEY, null);
  if (!saved || saved.day !== today()) {
    box.replaceChildren(
      el('p', { class: 'omi-q' }, 'きょうの運勢は…？'),
      el('button', { class: 'wbtn main', onclick: () => {
        const f = Math.floor(Math.random() * FORTUNES.length);
        const l = Math.floor(Math.random() * LUCKY.length);
        save(OMIKUJI_KEY, { day: today(), f, l });
        renderOmikuji();
        box.querySelector('.omi-r')?.classList.add('boing');
      } }, 'おみくじをひく'));
    return;
  }
  const [rank, msg] = FORTUNES[saved.f % FORTUNES.length];
  box.replaceChildren(
    el('p', { class: 'omi-r' + (rank === '凶' ? ' bad' : '') }, rank),
    el('p', { class: 'omi-m' }, msg),
    el('p', { class: 'omi-l' }, 'ラッキー文法：', el('b', null, LUCKY[saved.l % LUCKY.length])),
    el('p', { class: 'omi-n' }, 'また明日ひいてね'));
}

/* ---------- keyboard indicator (best guess: browsers can't read the OS setting) ---------- */
const LANG = { hu: 'HUN', de: 'DEU', en: 'ENG', ja: 'JPN', fr: 'FRA', it: 'ITA', es: 'ESP', pl: 'POL', cs: 'CES', sk: 'SLK', nl: 'NLD', ru: 'RUS', zh: 'CHN', ko: 'KOR' };
function initKeyboard() {
  const out = $('kbd');
  const lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
  let label = LANG[lang] || lang.toUpperCase();
  let layout = '';
  const show = () => {
    out.textContent = label;
    out.title = `キーボード：${label}${layout ? `（${layout}）` : ''} ※ブラウザから推定`;
  };
  const guess = (map) => {
    const y = map('KeyY');
    const q = map('KeyQ');
    if (y === 'z') layout = 'QWERTZ';
    else if (q === 'a') layout = 'AZERTY';
    else if (y === 'y') layout = 'QWERTY';
  };
  show();
  if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
    navigator.keyboard.getLayoutMap().then((m) => { guess((c) => m.get(c)); show(); }).catch(() => {});
  }
  document.addEventListener('keydown', (e) => {
    if (!e.code || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Process' || e.isComposing || /[぀-ヿ]/.test(e.key)) {
      label = 'JPN あ';
    } else if (/^Key[A-Z]$/.test(e.code) && e.key.length === 1) {
      if (label === 'JPN あ') label = LANG[lang] || 'ENG';
      if (e.code === 'KeyY' && e.key.toLowerCase() === 'z') layout = 'QWERTZ';
      else if (e.code === 'KeyQ' && e.key.toLowerCase() === 'a') layout = 'AZERTY';
      else if (e.code === 'KeyY' && e.key.toLowerCase() === 'y') layout = 'QWERTY';
    } else return;
    show();
  }, true);
}

/* ---------- theme picker (PC widget + せってい) ---------- */
export function themePicker() {
  const T = window.N1Theme;
  const box = el('div', { class: 'themes', role: 'group', 'aria-label': 'テーマ' });
  const draw = () => {
    if (!T) return;
    box.replaceChildren(...T.list().map((t) => el('button', {
      class: 'theme-btn', 'aria-pressed': String(T.get() === t.id), onclick: () => T.set(t.id),
    }, el('span', { class: `theme-sw ${t.id}`, 'aria-hidden': 'true' }), t.name)));
  };
  draw();
  const onTheme = () => (box.isConnected ? draw() : window.removeEventListener('n1q-theme', onTheme));
  window.addEventListener('n1q-theme', onTheme);
  return box;
}

export function initWidgets() {
  $('theme-widget')?.replaceChildren(themePicker());
  initMinimise();
  renderExam();
  renderOmikuji();
  initKeyboard();
}

/** Called every 15s by app.js — also refreshes things that change at midnight. */
export function tickWidgets(d) {
  $('tdate').textContent = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  if (d.getHours() === 0 && d.getMinutes() === 0) {
    renderExam();
    renderOmikuji();
  }
}
