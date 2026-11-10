// N1 クイズ — screens and quiz flow.
import { h, clear, mount, icon, loadJSON, saveJSON } from './ui.js';
import { cat, say } from './mascot.js';
import { buildSession, grade, isDue, dayStr, shuffle, STEPS } from './srs.js';
import * as store from './storage.js';
import { initPlayer } from './player.js';
import { initWidgets, refreshWidgets, widgetList, setWidgetOn, themePicker, examInfo, setExam, todayCount } from './widgets.js';

const $ = (id) => document.getElementById(id);
const screen = $('screen');
const desktop = window.matchMedia('(min-width: 1000px)');

const TYPES = {
  yomi: { name: '漢字読み', cat: 'vocab', inst: '＿＿の言葉の読み方として、最もよいものを選びなさい。' },
  bunmyaku: { name: '文脈規定', cat: 'vocab', inst: '（　　）に入れるのに最もよいものを選びなさい。' },
  iikae: { name: '言い換え', cat: 'vocab', inst: '＿＿の言葉に意味が最も近いものを選びなさい。' },
  youhou: { name: '用法', cat: 'vocab', inst: '次の言葉の使い方として、最もよいものを選びなさい。' },
  bunpou: { name: '文法形式', cat: 'grammar', inst: '（　　）に入れるのに最もよいものを選びなさい。' },
  narabe: { name: '文の組み立て', cat: 'grammar', inst: '★に入る最もよいものを選びなさい。' },
  bunshou: { name: '文章の文法', cat: 'grammar', inst: '文章を読んで、（　）に入る最もよいものを選びなさい。' },
};
const ZEN = '０１２３４５６７８９';

let questions = [];
const passages = new Map();
let session = null;
let tab = 'home';
let syncApi = null;
let syncState = { s: 'off', user: null };

/* ---------- preferences (this device only) ---------- */
const PREFS_KEY = 'n1q-prefs';
const prefs = (() => {
  const p = loadJSON(PREFS_KEY, {}) || {};
  return { goal: [10, 20, 30, 50].includes(p.goal) ? p.goal : 20, size: [10, 20, 30].includes(p.size) ? p.size : 20 };
})();
const savePrefs = () => saveJSON(PREFS_KEY, prefs);

/* ---------- small helpers ---------- */
function toast(text) {
  document.querySelector('.toast')?.remove();
  const t = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}
const railCat = $('rail-cat');
const railSay = $('rail-say');
function mood(m, text, anim = 'bob') {
  mount(railCat, cat(m, anim));
  if (text) railSay.textContent = text;
}
railCat.addEventListener('click', () => mood('happy', say('pet'), 'hop'));

function stats() {
  const p = store.get().progress;
  const today = dayStr();
  const known = questions.filter((q) => p[q.id]);
  return {
    seen: known.length,
    due: questions.filter((q) => isDue(p[q.id], today)).length,
    weak: questions.filter((q) => isWeak(p[q.id])).map((q) => q.id),
    mastered: known.filter((q) => p[q.id].b >= 4).length,
    right: known.reduce((n, q) => n + p[q.id].r, 0),
    wrong: known.reduce((n, q) => n + p[q.id].w, 0),
  };
}
const isWeak = (e) => !!e && e.w > 0 && (e.b <= 2 || e.w >= e.r);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/* ---------- navigation ---------- */
const NAV = [['home', 'ホーム', 'home'], ['stats', 'せいせき', 'chart'], ['widgets', 'ウィジェット', 'grid'], ['settings', 'せってい', 'gear']];
function buildNav() {
  for (const host of [$('nav-rail'), $('nav-tabs')]) {
    for (const [id, name, ic] of NAV) {
      host.append(h('button', { class: 'tab', type: 'button', dataset: { tab: id }, onclick: () => go(id) }, icon(ic), h('span', null, name)));
    }
  }
}
function go(next) {
  if (next === 'widgets' && desktop.matches) next = 'home';
  tab = next;
  session = null;
  document.body.dataset.tab = next;
  for (const b of document.querySelectorAll('.tab')) {
    if (b.dataset.tab === next) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  if (next === 'home') renderHome();
  else if (next === 'stats') renderStats();
  else if (next === 'settings') renderSettings();
  window.scrollTo(0, 0);
  $('main').scrollTop = 0;
}
desktop.addEventListener('change', () => { if (tab === 'widgets') go('home'); });

/* ---------- home ---------- */
function renderHome() {
  const s = stats();
  const today = todayCount();
  const streak = store.streak();
  const heroCat = cat(s.due > 0 ? 'fight' : today >= prefs.goal ? 'happy' : 'normal', 'bob');
  const bubble = h('div', { class: 'bubble' }, today >= prefs.goal ? '今日の目標クリア！えらい！' : s.due > 0 ? `復習が${s.due}問たまってるよ。` : say('greet'));
  heroCat.addEventListener('click', () => { bubble.textContent = say('pet'); heroCat.classList.remove('bob'); heroCat.classList.add('hop'); });
  const fill = h('i');
  fill.style.width = `${Math.min(100, pct(today, prefs.goal))}%`;
  if (today >= prefs.goal) fill.dataset.full = '';

  const mode = (cls, title, sub, deco, m, extra = {}) => h('button', { class: `mode ${cls}`, type: 'button', onclick: () => start(m), ...extra },
    h('b', null, title), h('span', null, sub), h('em', { 'aria-hidden': 'true' }, deco));
  const count = (c) => questions.filter((q) => q.cat === c).length;
  const p = store.get().progress;

  mount(screen, 
    h('section', { class: 'hero card' },
      h('div', { class: 'row hero-hi' }, heroCat), h('div', { class: 'hero-hi' }, bubble),
      h('div', { class: 'hero-stats' },
        h('div', { class: 'stat' }, h('b', null, String(streak)), h('span', null, '日連続')),
        h('div', { class: 'stat' }, h('b', null, String(today)), h('span', null, '今日の問題')),
        h('div', { class: 'stat' }, h('b', null, String(s.due)), h('span', null, '復習まち'))),
      h('div', { class: 'goal' }, h('span', null, '今日の目標'), h('div', { class: 'bar' }, fill), h('span', null, `${Math.min(today, prefs.goal)} / ${prefs.goal}`))),
    h('h2', { class: 'sec' }, 'れんしゅう'),
    h('div', { class: 'modes' },
      mode('big', `おまかせ ${prefs.size}問`, '復習と新しい問題をまぜて出します', '混', 'mix'),
      mode('rev', 'ふくしゅう', s.due ? `今日の復習 ${s.due}問` : '今日の復習はありません', '復', 'review', { disabled: !s.due }),
      mode('', '語彙', `${count('vocab')}問`, '語', 'vocab'),
      mode('', '文法', `${count('grammar')}問`, '文', 'grammar'),
      mode('', 'にがて', s.weak.length ? `まちがえた問題 ${s.weak.length}問` : 'まだありません', '苦', { ids: s.weak.slice(0, 30) }, { disabled: !s.weak.length })),
    h('h2', { class: 'sec' }, 'タイプ別'),
    h('div', { class: 'types' }, Object.entries(TYPES).map(([id, t]) => {
      const qs = questions.filter((q) => q.type === id);
      const seen = qs.filter((q) => p[q.id]);
      const r = seen.reduce((n, q) => n + p[q.id].r, 0); const w = seen.reduce((n, q) => n + p[q.id].w, 0);
      return h('button', { class: 'type', type: 'button', onclick: () => start({ type: id }) },
        h('b', null, t.name), h('small', null, `${seen.length} / ${qs.length}問`), h('span', { class: 'pct' }, r + w ? `${pct(r, r + w)}%` : '—'));
    })),
  );
  mood(s.due > 0 ? 'fight' : 'normal', bubble.textContent);
}

/* ---------- quiz ---------- */
function start(mode) {
  const list = buildSession(questions, store.get().progress, mode, prefs.size);
  if (!list.length) { toast('出せる問題がありません'); return; }
  session = { mode, i: 0, items: list.map((q) => ({ q, order: shuffle([0, 1, 2, 3]), pick: null, ok: null, retry: false })) };
  tab = 'quiz';
  for (const b of document.querySelectorAll('.tab')) b.removeAttribute('aria-current');
  document.body.dataset.tab = 'quiz';
  renderQuiz();
}

function questionBody(q, item) {
  if (q.type === 'youhou') return h('p', { class: 'q-word' }, q.q);
  const p = h('p', { class: 'q-text' });
  if (q.type === 'bunshou') return null;
  const parts = q.q.split(/(\{.+?\}|（　+）|＿＿|★)/);
  for (const s of parts) {
    if (!s) continue;
    if (s[0] === '{') p.append(h('u', null, s.slice(1, -1)));
    else if (/^（　+）$/.test(s)) p.append(h('span', { class: 'blank' }, item.pick != null ? q.opts[q.a] : '　'));
    else if (s === '＿＿') p.append(h('span', { class: 'blank' }, '　'));
    else if (s === '★') p.append(h('span', { class: 'blank star' }, '★'));
    else p.append(s);
  }
  return p;
}

function passageBox(q) {
  const ps = passages.get(q.pid);
  if (!ps) return null;
  const box = h('div', { class: 'passage', tabindex: '0' }, h('h3', null, ps.title));
  const answered = new Map(session.items.filter((it) => it.q.pid === q.pid && it.pick != null).map((it) => [it.q.n, it.q.opts[it.q.a]]));
  let nowEl = null;
  for (const para of ps.text.split('\n')) {
    const p = h('p');
    for (const s of para.split(/(（[０-９]+）)/)) {
      const m = s.match(/^（([０-９]+)）$/);
      if (!m) { p.append(s); continue; }
      const n = Number([...m[1]].map((c) => ZEN.indexOf(c)).join(''));
      if (n === q.n && !answered.has(n)) { nowEl = h('mark', { class: 'now' }, s); p.append(nowEl); }
      else if (answered.has(n)) p.append(h('mark', { class: n === q.n ? 'now' : 'done' }, `（${m[1]}：${answered.get(n)}）`));
      else p.append(h('mark', null, s));
    }
    box.append(p);
  }
  if (nowEl) requestAnimationFrame(() => { box.scrollTop = Math.max(0, nowEl.offsetTop - box.offsetTop - 60); });
  return box;
}

function renderQuiz() {
  const item = session.items[session.i];
  const q = item.q;
  const t = TYPES[q.type];
  const done = item.pick != null;
  const fill = h('i');
  fill.style.width = `${pct(session.i + (done ? 1 : 0), session.items.length)}%`;

  const opts = h('div', { class: 'opts' }, item.order.map((oi, k) => {
    let cls = 'opt' + (q.type === 'youhou' ? ' long' : '');
    let markTxt = '';
    if (done) {
      if (oi === q.a) { cls += ' right'; markTxt = '○'; }
      else if (oi === item.pick) { cls += ' wrong'; markTxt = '×'; }
      else cls += ' dim';
    }
    return h('button', { class: cls, type: 'button', disabled: done, onclick: () => answer(oi) },
      h('span', { class: 'key' }, String(k + 1)), h('span', null, q.opts[oi]), h('span', { class: 'mark' }, markTxt));
  }));

  mount(screen, 
    h('div', { class: 'q-top' },
      h('button', { class: 'btn icon sm', type: 'button', 'aria-label': 'やめてホームへ', onclick: () => go('home') }, icon('x')),
      h('div', { class: 'bar' }, fill),
      h('span', { class: 'q-count' }, `${session.i + 1} / ${session.items.length}`)),
    h('section', { class: 'q-card card' },
      h('div', { class: 'q-tag' }, h('span', { class: 'chip' }, t.name), item.retry ? h('span', { class: 'chip mint' }, 'もう一度') : null, h('span', { class: 'q-inst' }, t.inst)),
      q.type === 'bunshou' ? passageBox(q) : null,
      questionBody(q, item),
      opts),
    done ? feedback(item) : null,
  );
  if (done && !desktop.matches) screen.querySelector('.fb')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function answer(oi) {
  const item = session.items[session.i];
  if (item.pick != null) return;
  const q = item.q;
  item.pick = oi;
  item.ok = oi === q.a;
  if (!item.retry) {
    const st = store.get();
    st.progress[q.id] = grade(st.progress[q.id], item.ok);
    store.countAnswer(q.cat);
    store.commit();
    // A missed question comes back a few questions later in the same session.
    if (!item.ok && q.type !== 'bunshou') {
      const at = Math.min(session.items.length, session.i + 5);
      session.items.splice(at, 0, { q, order: shuffle([0, 1, 2, 3]), pick: null, ok: null, retry: true });
    }
  }
  mood(item.ok ? 'happy' : 'sad', say(item.ok ? 'right' : 'wrong'), item.ok ? 'hop' : 'droop');
  renderQuiz();
}

function feedback(item) {
  const q = item.q;
  const last = session.i + 1 >= session.items.length;
  const e = store.get().progress[q.id];
  const wait = e ? STEPS[e.b] : 1;
  return h('section', { class: `fb card ${item.ok ? 'ok' : 'ng'}` },
    h('div', { class: 'fb-head' }, cat(item.ok ? 'happy' : 'sad', item.ok ? 'hop' : 'droop'),
      h('div', null, h('h2', null, item.ok ? 'せいかい！' : 'ざんねん…'),
        h('p', { class: 'hint' }, item.retry ? 'もう一度チャレンジ' : item.ok ? `つぎは${wait}日後に出します` : 'このあともう一度、明日も出します'))),
    h('p', { class: 'fb-ans' }, '正解：', q.type === 'narabe' ? q.full : q.opts[q.a]),
    h('p', { class: 'fb-exp' }, q.exp),
    q.ex ? h('p', { class: 'fb-ex' }, '例：', q.ex) : null,
    h('div', { class: 'fb-next' },
      h('button', { class: 'btn primary', type: 'button', id: 'next', onclick: () => next() }, last ? 'けっかを見る' : 'つぎへ', icon('arrow')),
      h('span', { class: 'hint kbd-hint' }, 'Enter'), h('span', { class: 'hint swipe-hint' }, '← スワイプ')));
}

function next(fromSwipe) {
  if (!session || session.items[session.i].pick == null) return;
  session.i += 1;
  if (session.i >= session.items.length) return finish();
  renderQuiz();
  if (fromSwipe) { screen.classList.remove('slide-in'); void screen.offsetWidth; screen.classList.add('slide-in'); }
  window.scrollTo(0, 0);
  $('main').scrollTop = 0;
}

function finish() {
  const first = session.items.filter((it) => !it.retry);
  const right = first.filter((it) => it.ok).length;
  const missed = first.filter((it) => !it.ok);
  const rate = pct(right, first.length);
  const mode = session.mode;
  session = null;
  tab = 'result';
  const m = rate === 100 ? 'wow' : rate >= 70 ? 'happy' : rate >= 40 ? 'normal' : 'sad';
  const line = rate === 100 ? 'パーフェクト！' : rate >= 70 ? 'いい感じ！' : rate >= 40 ? 'おつかれさま！' : 'ここからのびるよ！';
  const short = (q) => (q.type === 'bunshou' ? `${passages.get(q.pid)?.title || ''} ${q.q}` : q.q.replace(/[{}]/g, ''));
  mount(screen, h('section', { class: 'result card' },
    cat(m, 'hop'), h('h2', null, line),
    h('p', { class: 'score' }, String(right), h('small', null, ` / ${first.length}問`)),
    h('p', { class: 'muted' }, `正解率 ${rate}% ・ 今日 ${todayCount()}問`),
    h('div', { class: 'fb-next' },
      missed.length ? h('button', { class: 'btn mint', type: 'button', onclick: () => start({ ids: missed.map((it) => it.q.id) }) }, 'まちがいだけ') : null,
      h('button', { class: 'btn primary', type: 'button', id: 'next', onclick: () => start(mode && mode.ids ? 'mix' : mode) }, 'もう1セット'),
      h('button', { class: 'btn', type: 'button', onclick: () => go('home') }, 'ホーム')),
    missed.length ? h('ul', { class: 'miss' }, missed.map((it) => h('li', null, `${short(it.q)} → ${it.q.type === 'narabe' ? it.q.full : it.q.opts[it.q.a]}`))) : null));
  mood(m, line, 'hop');
  refreshWidgets();
}

/* ---------- stats ---------- */
function renderStats() {
  const s = stats();
  const p = store.get().progress;
  const days = store.get().days;
  const boxes = Array(7).fill(0);
  for (const q of questions) if (p[q.id]) boxes[Math.min(6, p[q.id].b)] += 1;
  const maxBox = Math.max(1, ...boxes);
  const last7 = [...Array(7)].map((_, k) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - k));
    const c = days[dayStr(d)]; return { d, n: c ? c.vocab + c.grammar : 0 };
  });
  const max7 = Math.max(1, ...last7.map((x) => x.n));
  const bar = (v, max, h100) => { const i = h('i'); i.style.height = `${Math.round((v / max) * h100)}px`; return i; };
  const weakQs = questions.filter((q) => isWeak(p[q.id])).sort((a, b) => p[b.id].w - p[a.id].w).slice(0, 8);

  mount(screen, 
    h('section', { class: 'panel card' }, h('h2', null, 'ぜんたい'),
      h('div', { class: 'kv' },
        h('div', { class: 'stat' }, h('b', null, String(s.seen)), h('span', null, `/ ${questions.length} といた`)),
        h('div', { class: 'stat' }, h('b', null, String(s.mastered)), h('span', null, 'おぼえた')),
        h('div', { class: 'stat' }, h('b', null, `${pct(s.right, s.right + s.wrong)}%`), h('span', null, '正解率')),
        h('div', { class: 'stat' }, h('b', null, String(store.streak())), h('span', null, '日連続')))),
    h('section', { class: 'panel card' }, h('h2', null, 'この7日間'),
      h('div', { class: 'boxes' }, last7.map((x) => h('div', null, x.n ? String(x.n) : '', bar(x.n, max7, 62), '日月火水木金土'[x.d.getDay()])))),
    h('section', { class: 'panel card' }, h('h2', null, 'タイプ別の正解率'),
      Object.entries(TYPES).map(([id, t]) => {
        const seen = questions.filter((q) => q.type === id && p[q.id]);
        const r = seen.reduce((n, q) => n + p[q.id].r, 0); const w = seen.reduce((n, q) => n + p[q.id].w, 0);
        const i = h('i'); i.style.width = `${pct(r, r + w)}%`;
        return h('div', { class: 'trow' }, h('span', null, t.name), h('div', { class: 'bar' }, i), h('span', null, r + w ? `${pct(r, r + w)}%` : '—'));
      })),
    h('section', { class: 'panel card' }, h('h2', null, '記憶のレベル'),
      h('div', { class: 'boxes' }, boxes.map((n, b) => h('div', null, n ? String(n) : '', bar(n, maxBox, 62), b === 0 ? '新' : `${STEPS[b]}日`))),
      h('p', { class: 'note' }, '正解するたびに右へ進み、次に出るまでの日数がのびます。まちがえると「1日」に戻ります。')),
    h('section', { class: 'panel card' }, h('h2', null, 'にがてな問題'),
      weakQs.length ? h('ul', { class: 'miss' }, weakQs.map((q) => h('li', null, `${q.type === 'bunshou' ? TYPES.bunshou.name : q.q.replace(/[{}]/g, '')}（×${p[q.id].w}）`))) : h('p', { class: 'note' }, 'まだありません。'),
      weakQs.length ? h('div', { class: 'fb-next' }, h('button', { class: 'btn primary', type: 'button', onclick: () => start({ ids: s.weak.slice(0, 30) }) }, 'にがてを練習する')) : null),
  );
}

/* ---------- settings ---------- */
function seg(values, current, onPick, label = (v) => String(v)) {
  const box = h('div', { class: 'seg' });
  const draw = (cur) => { clear(box); for (const v of values) box.append(h('button', { type: 'button', 'aria-pressed': String(v === cur), onclick: () => { onPick(v); draw(v); } }, label(v))); };
  draw(current);
  return box;
}

function renderSettings() {
  const exam = examInfo();
  const date = h('input', { type: 'date', value: exam.date, min: '2024-01-01', max: '2099-12-31', 'aria-label': '試験日' });
  const place = h('input', { type: 'text', value: exam.place, maxlength: '20', 'aria-label': '受験地' });
  date.addEventListener('change', () => { if (date.value) setExam(date.value, place.value); });
  place.addEventListener('change', () => setExam(date.value, place.value));

  const toggles = h('div', { class: 'toggles' });
  const drawToggles = () => {
    clear(toggles);
    for (const w of widgetList()) toggles.append(h('button', { class: 'btn sm', type: 'button', 'aria-pressed': String(w.on), onclick: () => { setWidgetOn(w.id, !w.on); drawToggles(); } }, w.title));
  };
  drawToggles();

  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    file.value = '';
    if (!f) return;
    if (f.size > 2e6) return toast('ファイルが大きすぎます');
    try {
      const data = store.clean(JSON.parse(await f.text()));
      if (!data) throw new Error('bad');
      store.replace(store.merge(store.get(), data), 'import');
      toast('読み込みました（今のデータと合わせました）');
      renderSettings();
    } catch { toast('このファイルは読み込めません'); }
  });
  let armed = false;
  const resetBtn = h('button', { class: 'btn danger', type: 'button' }, 'データを全部消す');
  resetBtn.addEventListener('click', () => {
    if (!armed) { armed = true; resetBtn.textContent = '本当に消す？もう一度押す'; setTimeout(() => { armed = false; resetBtn.textContent = 'データを全部消す'; }, 4000); return; }
    store.reset(); toast('消しました'); renderSettings();
  });

  mount(screen, 
    h('section', { class: 'panel card' }, h('h2', null, 'テーマ'), themePicker()),
    h('section', { class: 'panel card' }, h('h2', null, 'べんきょう'),
      h('div', { class: 'field' }, h('span', null, '1日の目標'), seg([10, 20, 30, 50], prefs.goal, (v) => { prefs.goal = v; savePrefs(); refreshWidgets(); }, (v) => `${v}問`)),
      h('div', { class: 'field' }, h('span', null, '1セットの問題数'), seg([10, 20, 30], prefs.size, (v) => { prefs.size = v; savePrefs(); }, (v) => `${v}問`)),
      h('div', { class: 'field' }, h('span', null, '試験日'), date),
      h('div', { class: 'field' }, h('span', null, '受験地'), place)),
    h('section', { class: 'panel card' }, h('h2', null, 'ウィジェット'), toggles,
      h('p', { class: 'note' }, '押すと表示・非表示が切りかわります。')),
    h('section', { class: 'panel card', id: 'sync-panel' }, h('h2', null, icon('cloud'), 'クラウド同期'), syncBody()),
    h('section', { class: 'panel card' }, h('h2', null, 'データ'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', type: 'button', onclick: exportData }, 'バックアップを保存'),
        h('button', { class: 'btn', type: 'button', onclick: () => file.click() }, 'バックアップを読み込む'), file, resetBtn),
      h('p', { class: 'note' }, `問題 ${questions.length}問 ・ 学習データはこの端末に保存され、ログインするとあなたのアカウントだけに同期されます。`)),
    h('section', { class: 'panel card' }, h('h2', null, 'クレジット'),
      h('p', { class: 'note' }, '音楽：Open Goldberg Variations（Kimiko Ishizaka, CC0）、Musopen（CC0 / パブリックドメイン）、Wikimedia Commons の自由ライセンス録音。曲ごとの演奏者とライセンスは曲リストに表示しています。'),
      h('p', { class: 'note' }, 'キャラクター（みけ・だるま・ぴよ）はこのアプリのために描いたオリジナルで、CC0 です。')),
  );
}

function exportData() {
  const blob = new Blob([JSON.stringify(store.get())], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `n1-quiz-${dayStr()}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- sync ---------- */
const SYNC_TEXT = { off: '同期オフ', loading: '同期中…', ok: '同期ずみ', offline: 'オフライン', error: '同期エラー', denied: '許可なし' };
function syncBody() {
  const { s, user } = syncState;
  const box = h('div', null);
  if (user) {
    box.append(h('p', { class: 'note' }, `${user.email || 'ログイン中'} ・ ${SYNC_TEXT[s] || ''}`),
      h('div', { class: 'row' },
        h('button', { class: 'btn mint', type: 'button', onclick: () => syncApi?.syncNow() }, '今すぐ同期'),
        h('button', { class: 'btn', type: 'button', onclick: async () => { try { localStorage.removeItem('n1q-sync'); } catch { /* ignore */ } await syncApi?.logout(); } }, 'ログアウト')));
  } else {
    box.append(
      h('p', { class: 'note' }, s === 'denied' ? 'このアカウントには同期の許可がありません。' : 'Google でログインすると、スマホとパソコンで学習データが同じになります。'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', disabled: s === 'loading', onclick: login }, s === 'loading' ? '接続中…' : 'Google でログイン')));
  }
  return box;
}
async function loadSync() {
  if (syncApi) return syncApi;
  const mod = await import('./sync.js');
  syncApi = mod.createSync(store, onSync);
  return syncApi;
}
async function login() {
  try {
    onSync('loading', null);
    const api = await loadSync();
    try { localStorage.setItem('n1q-sync', '1'); } catch { /* ignore */ }
    await api.login();
  } catch (e) {
    console.error(e);
    onSync('error', null);
    toast('ログインできませんでした');
  }
}
function onSync(s, user) {
  syncState = { s, user };
  for (const el of [$('sync-top'), $('sync-rail')]) {
    el.dataset.s = s;
    el.lastChild.textContent = SYNC_TEXT[s] || s;
  }
  const panel = $('sync-panel');
  if (panel && tab === 'settings') { while (panel.children.length > 1) panel.lastChild.remove(); panel.append(syncBody()); }
}
for (const el of [$('sync-top'), $('sync-rail')]) el.addEventListener('click', () => go('settings'));

/* ---------- keyboard ---------- */
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,select,dialog')) return;
  if (session) {
    const item = session.items[session.i];
    if (item.pick == null && /^[1-4]$/.test(e.key)) { e.preventDefault(); answer(item.order[Number(e.key) - 1]); }
    else if (item.pick != null && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) { e.preventDefault(); next(); }
    else if (e.key === 'Escape') go('home');
  } else if (tab === 'result' && e.key === 'Enter') { e.preventDefault(); $('next')?.click(); }
});

/* ---------- phone: drag the card sideways to move on ---------- */
(() => {
  let x0 = null; let y0 = 0; let t0 = 0; let axis = null; let dx = 0;
  const canGo = () => !!session && session.items[session.i].pick != null;
  const reset = (animate) => {
    screen.style.transition = animate ? 'transform .2s ease-out, opacity .2s ease-out' : '';
    screen.style.transform = ''; screen.style.opacity = '';
  };
  screen.addEventListener('touchstart', (e) => {
    if (desktop.matches || e.touches.length !== 1 || !session || e.target.closest('input')) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); axis = null; dx = 0;
    screen.style.transition = '';
  }, { passive: true });
  screen.addEventListener('touchmove', (e) => {
    if (x0 == null) return;
    dx = e.touches[0].clientX - x0;
    const dy = e.touches[0].clientY - y0;
    if (!axis && Math.abs(dx) + Math.abs(dy) > 8) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (axis !== 'x') return;
    const free = dx < 0 && canGo();
    screen.style.transform = `translateX(${free ? dx : dx * 0.2}px)`;
    screen.style.opacity = free ? String(Math.max(0.35, 1 + dx / 500)) : '';
  }, { passive: true });
  const end = () => {
    if (x0 == null) return;
    const speed = Math.abs(dx) / Math.max(1, Date.now() - t0);
    const ok = axis === 'x' && dx < 0 && canGo() && (dx < -window.innerWidth * 0.22 || (speed > 0.4 && dx < -30));
    x0 = null;
    if (!ok) return reset(true);
    screen.style.transition = 'transform .16s ease-in, opacity .16s ease-in';
    screen.style.transform = 'translateX(-105%)'; screen.style.opacity = '0';
    setTimeout(() => { reset(false); next(true); }, 160);
  };
  screen.addEventListener('touchend', end);
  screen.addEventListener('touchcancel', () => { x0 = null; reset(true); });
})();

/* ---------- boot ---------- */
async function boot() {
  buildNav();
  $('sync-top').append(h('span', { class: 'dot' }), h('span', null, SYNC_TEXT.off));
  $('sync-rail').append(h('span', { class: 'dot' }), h('span', null, SYNC_TEXT.off));
  mood('normal', say('greet'));
  try { initPlayer($('player'), $('tracks')); } catch (e) { console.error(e); }

  try {
    const get = async (f) => { const r = await fetch(f); if (!r.ok) throw new Error(f); return r.json(); };
    const [v, g, ps] = await Promise.all([get('data/vocab.json'), get('data/grammar.json'), get('data/passages.json')]);
    questions = [...v, ...g].filter((q) => q && TYPES[q.type] && Array.isArray(q.opts) && q.opts.length === 4);
    for (const p of ps) passages.set(p.id, p);
  } catch (e) {
    console.error(e);
    mount(screen, h('section', { class: 'panel card center' }, cat('sad'), h('p', null, '問題を読み込めませんでした。'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => location.reload() }, 'もう一度')));
    return;
  }
  try { initWidgets($('widgets'), { questions, prefs: () => prefs }); } catch (e) { console.error(e); }
  store.onChange((_, source) => { if (source !== 'local' && !session) { if (tab === 'home') renderHome(); else if (tab === 'stats') renderStats(); } });
  go('home');

  if (loadJSON('n1q-sync', null) === 1) {
    const run = () => loadSync().catch((e) => { console.error(e); onSync('offline', null); });
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 }); else setTimeout(run, 800);
  }
  try { indexedDB.deleteDatabase('n1q-books'); } catch { /* the old reader's storage; nothing to do if it is missing */ }
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    let had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (had && !session) location.reload();
      had = true;
    });
  }
}
boot();
