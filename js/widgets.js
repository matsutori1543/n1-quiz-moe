// Side widgets. Each one is a small card that can be minimised or switched off in settings.
import { h, clear, mount, icon, loadJSON, saveJSON, dayIndex } from './ui.js';
import { daruma, chick } from './mascot.js';
import { KOTOWAZA, OMIKUJI } from './words.js';
import { dayStr, addDays } from './srs.js';
import * as store from './storage.js';
import { ambience } from './player.js';

const KEY = 'n1q-widgets-v2';
const EXAM_KEY = 'n1q-exam';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
let state = loadJSON(KEY, {});
if (!state || typeof state !== 'object') state = {};
const ticks = [];
const refreshers = [];
let ctx = { questions: [], prefs: () => ({ goal: 20 }) };

export function todayCount() {
  const d = store.get().days[dayStr()];
  return d ? d.vocab + d.grammar : 0;
}

/* ---------- exam date ---------- */
export function examInfo() {
  const raw = loadJSON(EXAM_KEY, null) || {};
  const date = DAY_RE.test(raw.date) ? raw.date : '2026-12-06';
  const place = typeof raw.place === 'string' && raw.place.trim() ? raw.place.trim().slice(0, 20) : 'ウィーン';
  const [y, m, d] = date.split('-').map(Number);
  const now = new Date();
  const days = Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
  return { date, place, days, label: `${y}年${m}月${d}日` };
}
export function setExam(date, place) {
  const cur = examInfo();
  saveJSON(EXAM_KEY, { date: DAY_RE.test(date) ? date : cur.date, place: (place ?? cur.place).slice(0, 20) });
  refreshWidgets();
}

/* ---------- widgets ---------- */
const WIDGETS = [
  { id: 'clock', title: 'とけい', build(body) {
    const t = h('div', { class: 'clock-t' });
    const d = h('div', { class: 'clock-d' });
    const s = h('div', { class: 'clock-s' });
    body.append(t, d, s);
    const wareki = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', { era: 'long', year: 'numeric' });
    const tick = () => {
      const n = new Date();
      mount(t, `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`, h('small', null, `:${String(n.getSeconds()).padStart(2, '0')}`));
      d.textContent = `${n.getMonth() + 1}月${n.getDate()}日（${'日月火水木金土'[n.getDay()]}）`;
      const left = Math.round((new Date(n.getFullYear() + 1, 0, 1) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5);
      s.textContent = `${wareki.format(n)} ・ 今年はあと${left}日`;
    };
    ticks.push(tick); tick();
  } },
  { id: 'exam', title: '試験まで', build(body) {
    const draw = () => {
      const e = examInfo();
      const done = todayCount() >= ctx.prefs().goal;
      mount(body, h('div', { class: 'exam' }, daruma(done),
        h('div', null,
          e.days > 0 ? h('p', { class: 'exam-n' }, 'あと', h('b', null, String(e.days)), '日')
            : e.days === 0 ? h('p', { class: 'exam-n' }, h('b', null, '今日'), 'が本番！')
              : h('p', { class: 'exam-n' }, 'おつかれさま！'),
          h('p', { class: 'small muted' }, `${e.place}の N1 ・ ${e.label}`),
          h('p', { class: 'small muted' }, done ? '今日の目標クリア。だるまに目が入ったよ。' : '今日の目標をクリアすると、目が入るよ。'))));
    };
    refreshers.push(draw); draw();
  } },
  { id: 'pomo', title: 'ポモドーロ', build(body) {
    const WORK = 25 * 60e3; const REST = 5 * 60e3;
    let p = loadJSON('n1q-pomo', null);
    if (!p || typeof p !== 'object' || !['work', 'rest'].includes(p.mode)) p = { mode: 'work', end: 0, left: WORK, n: 0, day: dayStr() };
    if (p.day !== dayStr()) { p.n = 0; p.day = dayStr(); }
    const time = h('div', { class: 'pomo-t' });
    const label = h('div', { class: 'small muted' });
    const go = h('button', { class: 'btn sm primary', type: 'button' });
    const reset = h('button', { class: 'btn sm', type: 'button' }, 'リセット');
    body.append(h('div', { class: 'pomo' }, label, time, h('div', { class: 'row' }, go, reset)));
    const save = () => saveJSON('n1q-pomo', p);
    const draw = () => {
      let left = p.end ? p.end - Date.now() : p.left;
      if (p.end && left <= 0) {
        ambience.ding();
        if (p.mode === 'work') { p.n = (Number(p.n) || 0) + 1; p.mode = 'rest'; p.left = REST; } else { p.mode = 'work'; p.left = WORK; }
        p.end = 0; left = p.left; save();
      }
      left = Math.max(0, Math.min(left, WORK));
      const s = Math.ceil(left / 1000);
      time.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      label.textContent = `${p.mode === 'work' ? '集中タイム（25分）' : 'きゅうけい（5分）'} ・ 今日 ${Number(p.n) || 0} 回`;
      go.textContent = p.end ? 'ストップ' : 'スタート';
    };
    go.addEventListener('click', () => {
      if (p.end) { p.left = Math.max(0, p.end - Date.now()); p.end = 0; } else p.end = Date.now() + (Number(p.left) || WORK);
      save(); draw();
    });
    reset.addEventListener('click', () => { p.mode = 'work'; p.end = 0; p.left = WORK; save(); draw(); });
    ticks.push(draw); draw();
  } },
  { id: 'wotd', title: '今日の単語', build(body) {
    const pool = ctx.questions.filter((q) => q.type === 'yomi' && /\{(.+?)\}/.test(q.q));
    if (!pool.length) return;
    let i = dayIndex(pool.length, 3);
    const draw = () => {
      const q = pool[i];
      const word = q.q.match(/\{(.+?)\}/)[1];
      mount(body, 
        h('div', { class: 'wotd-w' }, word), h('div', { class: 'wotd-r' }, q.opts[q.a]),
        h('div', { class: 'wotd-m' }, q.exp.split('\n')[0]),
        q.ex ? h('div', { class: 'fb-ex' }, q.ex) : null,
        h('div', { class: 'row' }, h('button', { class: 'btn sm', type: 'button', onclick: () => { i = Math.floor(Math.random() * pool.length); draw(); } }, 'べつの単語')));
    };
    draw();
  } },
  { id: 'koto', title: '今日のことば', build(body) {
    let i = dayIndex(KOTOWAZA.length, 7);
    const draw = () => {
      const [text, yomi, mean] = KOTOWAZA[i];
      mount(body, h('div', { class: 'wotd-w' }, text), h('div', { class: 'wotd-r' }, yomi), h('div', { class: 'wotd-m' }, mean),
        h('div', { class: 'row' }, h('button', { class: 'btn sm', type: 'button', onclick: () => { i = (i + 1) % KOTOWAZA.length; draw(); } }, 'つぎ')));
    };
    draw();
  } },
  { id: 'cal', title: '学習カレンダー', build(body) {
    const draw = () => {
      const days = store.get().days;
      const today = dayStr();
      const heat = h('div', { class: 'heat' });
      const start = addDays(today, -(7 * 11 + new Date().getDay()));
      for (let k = 0; ; k++) {
        const d = addDays(start, k);
        if (d > today) break;
        const n = days[d] ? days[d].vocab + days[d].grammar : 0;
        heat.append(h('i', { dataset: { l: String(n === 0 ? 0 : n < 10 ? 1 : n < 30 ? 2 : 3) }, 'data-today': d === today ? '' : null, title: `${d}：${n}問` }));
      }
      const st = store.streak();
      mount(body, h('div', { class: 'pet' }, chick(), h('div', null,
        h('p', { class: 'exam-n' }, h('b', null, String(st)), '日連続'),
        h('p', { class: 'small muted' }, `今日 ${todayCount()}問`))), heat);
    };
    refreshers.push(draw); draw();
  } },
  { id: 'omikuji', title: 'おみくじ', build(body) {
    const draw = () => {
      const saved = loadJSON('n1q-omikuji', null);
      const has = saved && saved.day === dayStr() && Number.isInteger(saved.i) && OMIKUJI[saved.i];
      clear(body);
      if (has) {
        body.append(h('div', { class: 'omi' }, h('div', { class: 'omi-r' }, OMIKUJI[saved.i][0]), h('div', { class: 'omi-m' }, OMIKUJI[saved.i][1]),
          h('p', { class: 'small muted' }, 'おみくじは一日一回。また明日！')));
      } else {
        body.append(h('div', { class: 'omi' }, h('p', { class: 'omi-m' }, '今日の勉強運をうらなう'),
          h('button', { class: 'btn primary', type: 'button', onclick: () => { saveJSON('n1q-omikuji', { day: dayStr(), i: Math.floor(Math.random() * OMIKUJI.length) }); draw(); } }, 'おみくじを引く')));
      }
    };
    draw();
  } },
  { id: 'amb', title: '環境音', build(body) {
    const row = h('div', { class: 'row' });
    for (const [k, name] of ambience.kinds) {
      const b = h('button', { class: 'btn sm', type: 'button', 'aria-pressed': String(ambience.isOn(k)) }, name);
      b.addEventListener('click', () => { const on = ambience.toggle(k); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('mint', on); });
      row.append(b);
    }
    const vol = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(ambience.volume()), 'aria-label': '環境音の音量' });
    vol.addEventListener('input', () => ambience.setVolume(Number(vol.value)));
    body.append(h('div', { class: 'amb' }, row, h('div', { class: 'row' }, icon('vol'), h('div', { class: 'grow' }, vol)),
      h('p', { class: 'small muted' }, '音楽と重ねて流せます。')));
  } },
  { id: 'theme', title: 'テーマ', build(body) { body.append(themePicker()); } },
];

export function themePicker() {
  const box = h('div', { class: 'themes' });
  const draw = () => {
    clear(box);
    for (const [id, name] of window.N1Theme.list) {
      box.append(h('button', { class: 'sw', type: 'button', dataset: { t: id }, 'aria-pressed': String(window.N1Theme.get() === id), onclick: () => window.N1Theme.set(id) }, h('i'), name));
    }
  };
  draw();
  window.addEventListener('n1q-theme', draw);
  return box;
}

export const widgetList = () => WIDGETS.map((w) => ({ id: w.id, title: w.title, on: !state[w.id]?.off }));
export function setWidgetOn(id, on) {
  state[id] = { ...state[id], off: !on };
  saveJSON(KEY, state);
  render();
}

let root = null;
function render() {
  ticks.length = 0; refreshers.length = 0;
  clear(root);
  for (const w of WIDGETS) {
    if (state[w.id]?.off) continue;
    const body = h('div', { class: 'w-body' });
    const btn = h('button', { type: 'button' });
    const card = h('section', { class: 'w card' }, h('div', { class: 'w-head' }, w.title, btn), body);
    const setMin = (m) => {
      card.classList.toggle('min', m);
      mount(btn, icon(m ? 'plus' : 'minus'));
      btn.setAttribute('aria-label', `${w.title}を${m ? 'ひらく' : 'たたむ'}`);
    };
    btn.addEventListener('click', () => {
      const m = !card.classList.contains('min');
      state[w.id] = { ...state[w.id], min: m };
      saveJSON(KEY, state); setMin(m);
    });
    setMin(!!state[w.id]?.min);
    try { w.build(body); } catch (e) { body.textContent = '表示できませんでした'; console.error(e); }
    root.append(card);
  }
}

export function refreshWidgets() { refreshers.forEach((f) => { try { f(); } catch { /* keep the rest alive */ } }); }

export function initWidgets(el, context) {
  root = el; ctx = context;
  render();
  setInterval(() => { if (!document.hidden) ticks.forEach((f) => { try { f(); } catch { /* ignore */ } }); }, 1000);
  store.onChange(refreshWidgets);
}
