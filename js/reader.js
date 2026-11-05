// 読書.exe — a reader for Aozora Bunko books (青空文庫).
// Books are opened from files on this device (zip / txt / html), parsed locally and kept in
// IndexedDB on this device only. Nothing is uploaded and no book text is stored in the repo.
// English: the browser's on-device Translator (Chrome-based browsers) when available,
// otherwise per-page buttons that open Google Translate / DeepL.

const $ = (id) => document.getElementById(id);
const SETTINGS_KEY = 'n1q-reader';
const AOZORA_SAMPLE = 'https://www.aozora.gr.jp/cards/000035/card301.html'; // 人間失格

function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
}
const loadJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

/* ---------------- storage (IndexedDB) ---------------- */
function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('n1q-books', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('books', { keyPath: 'id' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function store(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction('books', mode);
    const req = fn(t.objectStore('books'));
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error);
  });
}
const listBooks = () => store('readonly', (s) => s.getAll());
const getBook = (id) => store('readonly', (s) => s.get(id));
const putBook = (b) => store('readwrite', (s) => s.put(b));
const deleteBook = (id) => store('readwrite', (s) => s.delete(id));

/* ---------------- file reading ---------------- */
function decode(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('shift_jis').decode(bytes);
  }
}

async function unzipText(buf) {
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  for (let k = 0; k < count; k++) {
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = new TextDecoder('shift_jis').decode(new Uint8Array(buf, p + 46, nameLen));
    p += 46 + nameLen + extraLen + commLen;
    if (!/\.(txt|html?)$/i.test(name)) continue;
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const data = new Uint8Array(buf, start, csize);
    let bytes;
    if (method === 0) bytes = data.slice();
    else if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error('zip-method');
    return { name, text: decode(bytes) };
  }
  throw new Error('zip-empty');
}

/* ---------------- parsing ---------------- */
// Book model: { title, author, paras: [{ t:'h'|'p'|'br', s:[ 'text' | ['漢字','かんじ'] ] }] }
const KANJI_RUN = '[\\u3400-\\u9FFF\\uF900-\\uFAFF々〆ヵヶ〇]+';
const RUBY_RE = new RegExp(`｜([^《｜]+)《([^》]+)》|(${KANJI_RUN})《([^》]+)》`, 'g');

function rubySegments(line) {
  const segs = [];
  let last = 0;
  for (const m of line.matchAll(RUBY_RE)) {
    if (m.index > last) segs.push(line.slice(last, m.index));
    segs.push(m[1] ? [m[1], m[2]] : [m[3], m[4]]);
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push(line.slice(last));
  return segs.filter((s) => (typeof s === 'string' ? s.length : true));
}

function parseAozoraText(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const title = (lines[0] || '').trim() || '無題';
  const author = (lines[1] || '').trim();
  let i = 2;
  const d1 = lines.findIndex((l, k) => k > 1 && k < 60 && /^-{10,}/.test(l));
  if (d1 >= 0) {
    const d2 = lines.findIndex((l, k) => k > d1 && /^-{10,}/.test(l));
    i = d2 >= 0 ? d2 + 1 : d1 + 1;
  }
  const paras = [];
  for (; i < lines.length; i++) {
    let l = lines[i];
    if (/^底本[：:]/.test(l)) break;
    if (/［＃改(ページ|丁|段)］/.test(l)) { paras.push({ t: 'br', s: [] }); continue; }
    const head = l.match(/［＃「(.+?)」は[大中小]?見出し］/);
    l = l.replace(/※［＃[^］]*］/g, '※').replace(/［＃[^］]*］/g, '').replace(/^[\s　]+$/, '');
    if (!l) continue;
    paras.push({ t: head ? 'h' : 'p', s: rubySegments(l.replace(/^　/, '')) });
  }
  return { title, author, paras };
}

function parseAozoraHTML(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const title = doc.querySelector('.title')?.textContent.trim() || doc.title || '無題';
  const author = doc.querySelector('.author')?.textContent.trim() || '';
  const main = doc.querySelector('.main_text') || doc.body;
  const paras = [];
  let cur = [];
  const flush = (t = 'p') => {
    const s = cur.filter((x) => (typeof x === 'string' ? x.trim() : true));
    if (s.length) paras.push({ t, s: cur });
    cur = [];
  };
  const walk = (node) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) cur.push(n.nodeValue.replace(/\n/g, ''));
      else if (n.nodeType === 1) {
        const tag = n.tagName.toLowerCase();
        if (tag === 'br') flush();
        else if (tag === 'ruby') {
          const rb = n.querySelector('rb')?.textContent || [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join('');
          const rt = n.querySelector('rt')?.textContent || '';
          cur.push(rt ? [rb, rt] : rb);
        } else if (/^h[1-6]$/.test(tag) || /midashi/.test(n.className || '')) {
          flush();
          cur = [n.textContent.trim()];
          flush('h');
        } else if (tag === 'rt' || tag === 'rp' || tag === 'script' || tag === 'style') {
          /* skip */
        } else if (tag === 'div' && /kaipage|page_break/.test(n.className || '')) {
          flush();
          paras.push({ t: 'br', s: [] });
        } else walk(n);
      }
    }
  };
  walk(main);
  flush();
  for (const p of paras) if (p.t === 'p' && typeof p.s[0] === 'string') p.s[0] = p.s[0].replace(/^[\s　]+/, '');
  return { title, author, paras };
}

async function readFile(file) {
  if (file.size > 30_000_000) throw new Error('too-big');
  const buf = await file.arrayBuffer();
  let name = file.name;
  let text;
  if (/\.zip$/i.test(name) || new DataView(buf).getUint32(0, true) === 0x04034b50) {
    ({ name, text } = await unzipText(buf));
  } else {
    const bytes = new Uint8Array(buf);
    const head = new TextDecoder('ascii').decode(bytes.slice(0, 2000));
    text = /charset=["']?shift_jis/i.test(head) ? new TextDecoder('shift_jis').decode(bytes) : decode(bytes);
  }
  const book = /\.html?$/i.test(name) || /<html/i.test(text.slice(0, 500)) ? parseAozoraHTML(text) : parseAozoraText(text);
  if (!book.paras.length) throw new Error('empty');
  const chars = book.paras.reduce((n, p) => n + plain(p.s).length, 0);
  book.id = `${book.title}|${book.author}|${chars}`.slice(0, 200);
  book.chars = chars;
  book.added = Date.now();
  return book;
}

/* ---------------- pagination ---------------- */
const plain = (segs) => segs.map((s) => (typeof s === 'string' ? s : s[0])).join('');
const segLen = (s) => (typeof s === 'string' ? s.length : s[0].length);

function paginate(book, perPage) {
  const pages = [];
  let page = [];
  let used = 0;
  let offset = 0;
  let pageStart = 0;
  const close = () => {
    if (page.length) pages.push({ paras: page, start: pageStart });
    page = [];
    used = 0;
    pageStart = offset;
  };
  for (const p of book.paras) {
    if (p.t === 'br') { close(); continue; }
    if (p.t === 'h') {
      if (used > perPage * 0.5) close();
      page.push(p);
      used += 40;
      continue;
    }
    let segs = p.s.slice();
    let cont = false;
    while (segs.length) {
      const room = perPage - used;
      const len = segs.reduce((n, s) => n + segLen(s), 0);
      if (len <= room) {
        page.push({ t: 'p', s: segs, cont });
        used += len + 10;
        offset += len;
        segs = [];
      } else if (room < 60) close();
      else {
        const take = [];
        let n = 0;
        while (segs.length && n < room) {
          const s = segs[0];
          const l = segLen(s);
          if (n + l <= room) { take.push(segs.shift()); n += l; }
          else if (typeof s === 'string') {
            let cut = room - n;
            const near = s.slice(0, cut).lastIndexOf('。');
            if (near > cut * 0.5) cut = near + 1;
            take.push(s.slice(0, cut));
            segs[0] = s.slice(cut);
            n += cut;
            break;
          } else break;
        }
        if (!take.length) { close(); continue; }
        page.push({ t: 'p', s: take, cont, split: true });
        offset += n;
        cont = true;
        close();
      }
    }
  }
  close();
  return pages;
}

/* ---------------- translation ---------------- */
let translatorPromise = null;
async function getTranslator(onProgress) {
  if (!('Translator' in self)) return null;
  const opts = { sourceLanguage: 'ja', targetLanguage: 'en' };
  try {
    const avail = await self.Translator.availability(opts);
    if (avail === 'unavailable' || avail === 'no') return null;
    if (!translatorPromise) {
      translatorPromise = self.Translator.create({
        ...opts,
        monitor(m) { m.addEventListener('downloadprogress', (e) => onProgress?.(e.loaded)); },
      }).catch((err) => { translatorPromise = null; throw err; });
    }
    return await translatorPromise;
  } catch {
    return null;
  }
}

/* ---------------- UI ---------------- */
let ui = null;
let state = { book: null, pages: [], page: 0, en: null };
const cache = new Map();

function settings() {
  return { ruby: true, tate: false, size: 18, en: false, ...loadJSON(SETTINGS_KEY, {}) };
}
function setSetting(k, v) {
  const s = settings();
  s[k] = v;
  saveJSON(SETTINGS_KEY, s);
}

function build() {
  const win = el('section', { class: 'win reader', id: 'reader', role: 'dialog', 'aria-label': '読書' },
    el('div', { class: 'tb' },
      el('span', { class: 'tt', id: 'rd-title' }, '読書.exe'),
      el('button', { class: 'tbtn', 'aria-label': '本棚', title: '本棚', onclick: showLibrary }, '≡'),
      el('button', { class: 'tbtn', 'aria-label': '最小化', onclick: () => hide() }, '–'),
      el('button', { class: 'tbtn', 'aria-label': '閉じる', onclick: () => hide() }, '×')),
    el('div', { class: 'rd-body', id: 'rd-body' }));
  document.body.append(win);
  document.addEventListener('keydown', (e) => {
    if (!win.classList.contains('open') || !state.book || e.target.closest('input,textarea,select')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); e.stopImmediatePropagation(); turn(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); e.stopImmediatePropagation(); turn(-1); }
    else if (e.key === 'Escape') hide();
  }, true);
  return win;
}

function show() {
  ui = ui || build();
  ui.classList.add('open');
  document.body.classList.add('reading');
  document.querySelectorAll('[data-task="reader"]').forEach((b) => b.classList.add('on'));
}
function hide() {
  ui?.classList.remove('open');
  document.body.classList.remove('reading');
}

export async function openReader() {
  show();
  if (state.book) return renderPage();
  const last = loadJSON('n1q-reader-last', null);
  const book = last ? await getBook(last).catch(() => null) : null;
  if (book) openBook(book);
  else showLibrary();
}

async function showLibrary() {
  state.book = null;
  $('rd-title').textContent = '読書.exe ‐ 本棚';
  const body = $('rd-body');
  const input = el('input', { type: 'file', accept: '.zip,.txt,.html,.htm,application/zip,text/plain,text/html', hidden: true });
  const msg = el('p', { class: 'rd-msg', role: 'status' });
  input.addEventListener('change', async () => {
    const f = input.files && input.files[0];
    if (!f) return;
    msg.textContent = 'よみこみ中…';
    try {
      const book = await readFile(f);
      await putBook(book);
      openBook(book);
    } catch (err) {
      msg.textContent = 'このファイルは読めませんでした。青空文庫の zip（テキスト・ルビあり）か HTML を選んでね。';
    }
  });
  const books = await listBooks().catch(() => []);
  body.replaceChildren(el('div', { class: 'rd-lib' },
    el('h2', null, '本棚'),
    books.length
      ? el('ul', { class: 'rd-books' }, books.sort((a, b) => b.added - a.added).map((b) => {
        const pos = loadJSON(`n1q-read-${b.id}`, { off: 0 }).off || 0;
        const pct = b.chars ? Math.min(100, Math.round((pos / b.chars) * 100)) : 0;
        return el('li', null,
          el('button', { class: 'rd-book', onclick: () => openBook(b) },
            el('b', null, b.title), el('span', null, b.author), el('small', null, `${b.chars.toLocaleString()}字・${pct}%`)),
          el('button', { class: 'wbtn', 'aria-label': `${b.title} を削除`, onclick: async (e) => {
            const btn = e.currentTarget;
            if (btn.dataset.armed) { await deleteBook(b.id); showLibrary(); return; }
            btn.dataset.armed = '1';
            btn.textContent = '本当に？';
            setTimeout(() => { delete btn.dataset.armed; btn.textContent = '削除'; }, 3000);
          } }, '削除'));
      }))
      : el('p', { class: 'small' }, 'まだ本がありません。'),
    el('div', { class: 'actions' }, el('button', { class: 'btn', onclick: () => input.click() }, '本を追加'), input),
    msg,
    el('div', { class: 'card rd-help' },
      el('h3', null, '本の入れ方（青空文庫）'),
      el('ol', null,
        el('li', null, '青空文庫で作品ページを開く（例：', el('a', { href: AOZORA_SAMPLE, target: '_blank', rel: 'noopener noreferrer' }, '太宰治『人間失格』'), '）'),
        el('li', null, '「ファイルのダウンロード」で「テキストファイル(ルビあり)」の zip を保存'),
        el('li', null, '上の「本を追加」でその zip を選ぶ（解凍しなくてOK・HTML でも可）')),
      el('p', { class: 'small' }, '本はこの端末の中だけに保存されます（アップロードされません）。英語はブラウザの翻訳機能か、Google翻訳 / DeepL を使います。'))));
}

function perPage() {
  const s = settings();
  const wide = window.matchMedia('(min-width:1100px)').matches;
  const base = wide ? (s.en ? 520 : 700) : 300;
  return Math.round(base * (18 / s.size) ** 2);
}

function openBook(book) {
  state.book = book;
  saveJSON('n1q-reader-last', book.id);
  repaginate();
}

function repaginate() {
  const book = state.book;
  state.pages = paginate(book, perPage());
  const off = loadJSON(`n1q-read-${book.id}`, { off: 0 }).off || 0;
  let idx = state.pages.findIndex((p, i) => i === state.pages.length - 1 || state.pages[i + 1].start > off);
  state.page = Math.max(0, idx);
  renderPage();
}

function turn(d) {
  const n = state.page + d;
  if (n < 0 || n >= state.pages.length) return;
  state.page = n;
  saveJSON(`n1q-read-${state.book.id}`, { off: state.pages[n].start });
  renderPage();
}

function renderSegs(segs) {
  return segs.map((s) => (typeof s === 'string' ? s : el('ruby', null, s[0], el('rp', null, '（'), el('rt', null, s[1]), el('rp', null, '）'))));
}

function renderPage() {
  const s = settings();
  const { book, pages, page } = state;
  if (!book) return;
  const pg = pages[page];
  $('rd-title').textContent = `読書.exe ‐ ${book.title}${book.author ? `（${book.author}）` : ''}`;
  const ja = el('div', { class: `rd-page ja${s.tate ? ' tate' : ''}${s.ruby ? '' : ' no-ruby'}`, lang: 'ja' },
    pg.paras.map((p) => (p.t === 'h' ? el('h3', null, renderSegs(p.s)) : el('p', { class: p.cont ? 'cont' : '' }, renderSegs(p.s)))));
  ja.style.fontSize = `${s.size}px`;
  const en = el('div', { class: 'rd-page en', lang: 'en', id: 'rd-en', hidden: !s.en });
  const slider = el('input', { type: 'range', min: '1', max: String(pages.length), value: String(page + 1), 'aria-label': 'ページ' });
  slider.addEventListener('change', () => { turn(Number(slider.value) - 1 - state.page); });
  const tog = (label, key, on) => el('button', { class: `rd-tog${on ? ' on' : ''}`, 'aria-pressed': String(on), onclick: () => {
    setSetting(key, !on);
    if (key === 'en') repaginate(); else renderPage();
  } }, label);

  const pager = el('div', { class: 'rd-pager' },
    el('button', { class: 'rbtn', 'aria-label': '前のページ', onclick: () => turn(-1), disabled: page === 0 }, '◀'),
    el('span', { class: 'rd-num' }, `${page + 1} / ${pages.length}`),
    slider,
    el('button', { class: 'rbtn', 'aria-label': '次のページ', onclick: () => turn(1), disabled: page >= pages.length - 1 }, '▶'));

  $('rd-body').replaceChildren(
    el('div', { class: 'rd-tools' },
      tog('ふりがな', 'ruby', s.ruby),
      tog('縦書き', 'tate', s.tate),
      el('button', { class: 'rd-tog', 'aria-label': '文字を小さく', onclick: () => { setSetting('size', Math.max(14, s.size - 2)); repaginate(); } }, 'A−'),
      el('button', { class: 'rd-tog', 'aria-label': '文字を大きく', onclick: () => { setSetting('size', Math.min(30, s.size + 2)); repaginate(); } }, 'A＋'),
      tog('English', 'en', s.en)),
    el('div', { class: `rd-spread${s.en ? ' with-en' : ''}` }, ja, en),
    pager);
  ja.scrollTop = 0;
  if (s.tate) ja.scrollLeft = ja.scrollWidth;
  bindSwipe(ja);
  bindWheel(ja, s.tate);
  if (s.en) fillEnglish(en, pg);
}

async function fillEnglish(box, pg) {
  const paras = pg.paras.map((p) => ({ h: p.t === 'h', text: plain(p.s) }));
  const key = `${state.book.id}#${pg.start}`;
  const textAll = paras.map((p) => p.text).join('\n');
  const status = el('p', { class: 'small' });
  const out = el('div');
  const ext = el('div', { class: 'rd-ext' },
    el('span', { class: 'small' }, 'このページを外部で翻訳：'),
    el('a', { class: 'wbtn', target: '_blank', rel: 'noopener noreferrer', href: `https://translate.google.com/?sl=ja&tl=en&op=translate&text=${encodeURIComponent(textAll)}` }, 'Google翻訳'),
    el('a', { class: 'wbtn', target: '_blank', rel: 'noopener noreferrer', href: `https://www.deepl.com/translator#ja/en/${encodeURIComponent(textAll.replace(/\//g, '\\/'))}` }, 'DeepL'));
  box.replaceChildren(status, out, ext);
  const still = () => state.book && state.pages[state.page] === pg && box.isConnected;
  const showEn = (list) => {
    status.textContent = '';
    out.replaceChildren(...list.map((p) => (p.h ? el('h3', null, p.text) : el('p', null, p.text))),
      el('p', { class: 'rd-note' }, '機械翻訳（ブラウザ内蔵）・参考用'));
  };
  if (cache.has(key)) return showEn(cache.get(key));
  if (!('Translator' in self)) {
    status.textContent = 'このブラウザには内蔵の翻訳機能がありません（Chrome / Edge の新しいバージョンなら、ここに英訳が出ます）。';
    return;
  }
  status.textContent = '翻訳中…';
  let progressed = false;
  const tr = await Promise.race([
    getTranslator((p) => { progressed = true; status.textContent = `翻訳モデルをダウンロード中… ${Math.round(p * 100)}%（初回だけ）`; }),
    new Promise((r) => setTimeout(() => r(progressed ? getTranslator() : null), 15000)),
  ]);
  if (!still()) return;
  if (!tr) {
    status.textContent = '内蔵の翻訳が使えませんでした。下のボタンで翻訳できます。';
    return;
  }
  try {
    const list = [];
    for (const p of paras) list.push({ h: p.h, text: p.text ? await tr.translate(p.text) : '' });
    cache.set(key, list);
    if (still()) showEn(list);
  } catch {
    if (still()) status.textContent = '翻訳に失敗しました。下のボタンで翻訳できます。';
  }
}

// Mouse wheel: scroll inside a long page first; at the edge, the wheel turns the page.
// One page per wheel gesture (short cooldown + small threshold so trackpads don't skip pages).
let wheelLock = 0;
let wheelAcc = 0;
function bindWheel(node, tate) {
  node.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // pinch-zoom
    const dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (!dy) return;
    const dir = dy > 0 ? 1 : -1;
    if (!tate) {
      const atEnd = node.scrollTop + node.clientHeight >= node.scrollHeight - 2;
      const atStart = node.scrollTop <= 1;
      if ((dir > 0 && !atEnd) || (dir < 0 && !atStart)) { wheelAcc = 0; return; } // let it scroll
    }
    e.preventDefault();
    const now = Date.now();
    if (now < wheelLock) return;
    wheelAcc += Math.abs(dy) * (e.deltaMode === 1 ? 30 : 1);
    if (wheelAcc < 40) return;
    wheelAcc = 0;
    wheelLock = now + 450;
    turn(dir);
  }, { passive: false });
}

function bindSwipe(node) {
  let x0 = null;
  let y0 = null;
  node.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  node.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) turn(dx < 0 ? 1 : -1);
  }, { passive: true });
}

window.matchMedia('(min-width:1100px)').addEventListener('change', () => { if (state.book) repaginate(); });
