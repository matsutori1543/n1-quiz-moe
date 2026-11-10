// Music player + generated ambient sounds.
// Every recording is CC0 / public domain or under a free licence that only asks for credit;
// the credit and a link to the source are shown in the track list.
import { h, clear, mount, icon, loadJSON, saveJSON } from './ui.js';

const IA = 'https://archive.org/download/';
const WM = 'https://upload.wikimedia.org/wikipedia/commons/';
const TRACKS = [];

// --- Bach: Goldberg Variations — Kimiko Ishizaka, "Open Goldberg Variations" (CC0, studio recording on a Bösendorfer 290)
const GB = 'The_Open_Goldberg_Variations-11823';
[
  'Aria', 'Variatio_1_a_1_Clav', 'Variatio_2_a_1_Clav', 'Variatio_3_a_1_Clav_Canone_allUnisuono', 'Variatio_4_a_1_Clav',
  'Variatio_5_a_1_ovvero_2_Clav', 'Variatio_6_a_1_Clav_Canone_alla_Seconda', 'Variatio_7_a_1_ovvero_2_Clav', 'Variatio_8_a_2_Clav',
  'Variatio_9_a_1_Clav_Canone_alla_Terza', 'Variatio_10_a_1_Clav_Fughetta', 'Variatio_11_a_2_Clav', 'Variatio_12_Canone_alla_Quarta',
  'Variatio_13_a_2_Clav', 'Variatio_14_a_2_Clav', 'Variatio_15_a_1_Clav_Canone_alla_Quinta', 'Variatio_16_a_1_Clav_Ouverture',
  'Variatio_17_a_2_Clav', 'Variatio_18_a_1_Clav_Canone_alla_Sexta', 'Variatio_19_a_1_Clav', 'Variatio_20_a_2_Clav',
  'Variatio_21_Canone_alla_Settima', 'Variatio_22_a_1_Clav', 'Variatio_23_a_2_Clav', 'Variatio_24_a_1_Clav_Canone_allOttava',
  'Variatio_25_a_2_Clav', 'Variatio_26_a_2_Clav', 'Variatio_27_a_2_Clav_Canone_alla_Nona', 'Variatio_28_a_2_Clav',
  'Variatio_29_a_1_ovvero_2_Clav', 'Variatio_30_a_1_Clav_Quodlibet', 'Aria_da_Capo__Fine',
].forEach((name, i) => {
  const title = i === 0 ? 'アリア' : i === 31 ? 'アリア・ダ・カーポ' : `第${i}変奏`;
  TRACKS.push({
    pl: 'bach', title: `ゴルトベルク変奏曲 ${title}`, composer: 'バッハ', by: 'Kimiko Ishizaka', lic: 'CC0',
    src: [`${IA}${GB}/Kimiko_Ishizaka_-_${String(i + 1).padStart(2, '0')}_-_${name}.mp3`],
    page: `https://archive.org/details/${GB}`,
  });
});

// --- Chopin — Musopen "Complete Chopin Collection" (CC0)
[
  ['NocturneOp.9No.1InBFlatMinor', 'ノクターン 第1番 Op.9-1'],
  ['Nocturne Op. 15 no. 1 In F major', 'ノクターン Op.15-1'],
  ['NocturneOp27No2', 'ノクターン Op.27-2'],
  ['Nocturne Op. 32 no. 1 in B major', 'ノクターン Op.32-1'],
  ['Nocturne Op. 32 no. 2 in A flat major', 'ノクターン Op.32-2'],
  ['Nocturne Op. 55 no. 1 in F minor', 'ノクターン Op.55-1'],
  ['Nocturne Op. 55 no. 2 in E flat major', 'ノクターン Op.55-2'],
  ['NocturneOp.72No.1InEMinor', 'ノクターン Op.72-1'],
  ["Nocturne B. 49 in C sharp minor 'Lento con gran espressione' (1)", 'ノクターン 第20番（遺作）'],
  ['Waltz Op. 69 no. 1 in A flat major', 'ワルツ Op.69-1「別れ」'],
  ['Waltz Op. 64 no. 2 in C sharp minor', 'ワルツ Op.64-2'],
  ['WaltzOp.34No.2InAMinor', 'ワルツ Op.34-2'],
  ['Prelude Op. 28 no. 6', '前奏曲 Op.28-6'],
  ['Prelude Op. 28 no. 13', '前奏曲 Op.28-13'],
  ['Prelude Op. 28 no. 15', '前奏曲 Op.28-15「雨だれ」'],
  ['Prelude Op. 28 no. 17', '前奏曲 Op.28-17'],
].forEach(([file, title]) => TRACKS.push({
  pl: 'chopin', title, composer: 'ショパン', by: 'Musopen', lic: 'CC0',
  src: [IA + 'musopen-chopin/' + encodeURIComponent(`${file}.mp3`)], page: 'https://archive.org/details/musopen-chopin',
}));

// --- Wikimedia Commons: [hash dir, file, title, composer, performer, licence, playlist]
const PD = 'パブリックドメイン';
[
  ['e/e8', 'Chopin_Nocturne_Op_37_no_2_in_G_major_Olga_Gurevich.ogg', 'ノクターン Op.37-2', 'ショパン', 'Olga Gurevich (Musopen)', PD, 'chopin'],
  ['a/a0', 'Chopin_Nocturne_in_F_sharp_minor_Op_48_no_2_Luke_Faulkner.ogg', 'ノクターン Op.48-2', 'ショパン', 'Luke Faulkner (Musopen)', PD, 'chopin'],
  ['f/fd', 'Fryderyk_Chopin_-_Nocturne_op._9_n.3_H-dur_-_Patrizia_Prati.ogg', 'ノクターン 第3番 Op.9-3', 'ショパン', 'Patrizia Prati', 'CC BY-SA 4.0', 'chopin'],
  ['8/8d', 'Claude_Debussy_-_I_Livre_Prelude_VIII..._(...La_fille_aux_cheveux_de_lin)_-_Patrizia_Prati.ogg', '亜麻色の髪の乙女', 'ドビュッシー', 'Patrizia Prati', 'CC BY-SA 4.0', 'france'],
  ['0/0f', 'Claude_Debussy_-_Première_Arabesque_-_Patrizia_Prati.ogg', 'アラベスク 第1番', 'ドビュッシー', 'Patrizia Prati', 'CC BY-SA 4.0', 'france'],
  ['8/89', 'Claude_Debussy_-_Deuxième_Arabesque_-_Patrizia_Prati.ogg', 'アラベスク 第2番', 'ドビュッシー', 'Patrizia Prati', 'CC BY-SA 4.0', 'france'],
  ['9/90', 'Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg', 'ジムノペディ 第1番', 'サティ', 'Musopen', PD, 'france'],
  ['9/91', 'Satie_-_Gnossienne_1.ogg', 'グノシエンヌ 第1番', 'サティ', 'La Pianista', 'CC BY-SA 3.0', 'france'],
  ['c/c8', 'Gnossienne_2_(Satie).ogg', 'グノシエンヌ 第2番', 'サティ', 'La Pianista', 'CC BY-SA 3.0', 'france'],
  ['0/07', 'Gnossienne_5_(Satie).ogg', 'グノシエンヌ 第5番', 'サティ', 'La Pianista', 'CC BY-SA 3.0', 'france'],
  ['2/2b', 'Gnossienne_6_(Satie).ogg', 'グノシエンヌ 第6番', 'サティ', 'La Pianista', 'CC BY-SA 3.0', 'france'],
].forEach(([dir, file, title, composer, by, lic, pl]) => {
  const enc = encodeURIComponent(file);
  const ogg = `${WM}${dir}/${enc}`;
  const mp3 = `${WM}transcoded/${dir}/${enc}/${enc}.mp3`;
  TRACKS.push({ pl, title, composer, by, lic, ogg, mp3, page: `https://commons.wikimedia.org/wiki/File:${enc}` });
});

const LISTS = [['all', 'ぜんぶ'], ['bach', 'バッハ'], ['chopin', 'ショパン'], ['france', 'ドビュッシー・サティ']];
const KEY = 'n1q-player';
const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '-:--');

export function initPlayer(root, dialog) {
  const audio = new Audio();
  audio.preload = 'none';
  const canOgg = !!audio.canPlayType('audio/ogg; codecs="vorbis"');
  TRACKS.forEach((t) => { if (!t.src) t.src = canOgg ? [t.ogg, t.mp3] : [t.mp3, t.ogg]; });

  const saved = loadJSON(KEY, {});
  let pl = LISTS.some((l) => l[0] === saved.pl) ? saved.pl : 'all';
  let queue = [];
  let pos = 0;
  let srcTry = 0;
  let fails = 0;
  let seeking = false;
  audio.volume = typeof saved.vol === 'number' ? Math.min(1, Math.max(0, saved.vol)) : 0.6;

  const title = h('div', { class: 'p-title' }, 'BGM');
  const sub = h('div', { class: 'p-sub' }, '再生ボタンで音楽スタート');
  const playBtn = h('button', { class: 'btn icon primary', type: 'button', 'aria-label': '再生', onclick: toggle }, icon('play'));
  const cur = h('span', null, '0:00');
  const dur = h('span', null, '-:--');
  const seek = h('input', { type: 'range', min: '0', max: '1000', value: '0', 'aria-label': '再生位置' });
  const vol = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(audio.volume), 'aria-label': '音量' });
  root.append(
    h('div', { class: 'disc' }),
    h('div', { class: 'p-meta' }, title, sub),
    h('div', { class: 'p-ctl' },
      h('button', { class: 'btn icon p-prev', type: 'button', 'aria-label': '前の曲', onclick: () => step(-1) }, icon('prev')),
      playBtn,
      h('button', { class: 'btn icon', type: 'button', 'aria-label': '次の曲', onclick: () => step(1) }, icon('next')),
      h('button', { class: 'btn icon', type: 'button', 'aria-label': '曲リスト', onclick: openList }, icon('list'))),
    h('div', { class: 'p-seek' }, cur, seek, dur),
    h('div', { class: 'p-extra' }, icon('vol'), vol),
  );

  function save() { saveJSON(KEY, { vol: audio.volume, pl }); }
  function build(keep) {
    const ids = TRACKS.map((_, i) => i).filter((i) => pl === 'all' || TRACKS[i].pl === pl);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    if (keep != null && ids.includes(keep)) { ids.splice(ids.indexOf(keep), 1); ids.unshift(keep); }
    queue = ids;
    pos = 0;
  }
  build();
  const now = () => TRACKS[queue[pos]];

  function show() {
    const t = now();
    title.textContent = t.title;
    sub.textContent = `${t.composer} ・ ${t.by} ・ ${t.lic}`;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: `${t.composer} / ${t.by}`, album: 'N1 クイズ BGM' });
    }
    if (srcLink) srcLink.href = t.page;
    markList();
  }
  function load(play) {
    srcTry = 0;
    audio.src = now().src[0];
    seek.value = '0'; cur.textContent = '0:00'; dur.textContent = '-:--';
    show();
    if (play) audio.play().catch(() => {});
  }
  function step(d) {
    pos = (pos + d + queue.length) % queue.length;
    load(true);
  }
  function toggle() {
    if (!audio.src) return load(true);
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  }
  function playIndex(i) {
    if (!queue.includes(i)) { pl = 'all'; save(); }
    build(i);
    load(true);
  }

  audio.addEventListener('play', () => { root.classList.add('playing'); mount(playBtn, icon('pause')); playBtn.setAttribute('aria-label', '一時停止'); });
  audio.addEventListener('pause', () => { root.classList.remove('playing'); mount(playBtn, icon('play')); playBtn.setAttribute('aria-label', '再生'); });
  audio.addEventListener('playing', () => { fails = 0; });
  audio.addEventListener('ended', () => step(1));
  audio.addEventListener('error', () => {
    const t = now();
    if (srcTry + 1 < t.src.length) {
      srcTry += 1;
      audio.src = t.src[srcTry];
      audio.play().catch(() => {});
    } else if (++fails < 3) step(1);
    else { fails = 0; sub.textContent = '再生できません（オフラインかも）'; }
  });
  audio.addEventListener('timeupdate', () => {
    if (seeking) return;
    cur.textContent = fmt(audio.currentTime);
    if (audio.duration) seek.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
  });
  audio.addEventListener('durationchange', () => { dur.textContent = fmt(audio.duration); });
  seek.addEventListener('input', () => { seeking = true; if (audio.duration) cur.textContent = fmt((seek.value / 1000) * audio.duration); });
  seek.addEventListener('change', () => { if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; seeking = false; });
  vol.addEventListener('input', () => { audio.volume = Number(vol.value); save(); });
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
    navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
  }

  // ----- track list dialog -----
  const ul = h('ul', { class: 'tracks' });
  const srcLink = h('a', { href: 'https://archive.org/', target: '_blank', rel: 'noopener noreferrer' }, 'いまの曲の出典ページ');
  const tabs = h('div', { class: 'dlg-tabs' });
  const vol2 = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(audio.volume), 'aria-label': '音量' });
  vol2.addEventListener('input', () => { audio.volume = Number(vol2.value); vol.value = vol2.value; save(); });
  dialog.append(h('div', { class: 'dlg' },
    h('div', { class: 'dlg-head' }, icon('list'), '曲リスト',
      h('button', { class: 'btn icon sm', type: 'button', 'aria-label': 'とじる', onclick: () => dialog.close() }, icon('x'))),
    tabs,
    ul,
    h('div', { class: 'credit' },
      h('div', { class: 'row' }, icon('vol'), h('div', { class: 'grow' }, vol2)),
      '録音はすべて CC0・パブリックドメイン、またはクレジット表示で自由に使えるライセンスです。出典: ',
      h('a', { href: 'https://archive.org/details/The_Open_Goldberg_Variations-11823', target: '_blank', rel: 'noopener noreferrer' }, 'Open Goldberg Variations'), ' / ',
      h('a', { href: 'https://archive.org/details/musopen-chopin', target: '_blank', rel: 'noopener noreferrer' }, 'Musopen'), ' / ',
      h('a', { href: 'https://commons.wikimedia.org/', target: '_blank', rel: 'noopener noreferrer' }, 'Wikimedia Commons'), '。 ', srcLink)));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  function renderList() {
    clear(tabs);
    for (const [id, name] of LISTS) {
      tabs.append(h('button', {
        class: 'btn sm', type: 'button', 'aria-pressed': String(pl === id),
        onclick: () => { const keep = queue[pos]; pl = id; save(); build(audio.src ? keep : null); if (!queue.includes(keep) && audio.src) load(!audio.paused); renderList(); },
      }, name));
    }
    clear(ul);
    TRACKS.forEach((t, i) => {
      if (pl !== 'all' && t.pl !== pl) return;
      ul.append(h('li', null, h('button', { type: 'button', dataset: { i: String(i) }, onclick: () => playIndex(i) },
        h('span', { class: 't1' }, t.title), h('span', { class: 't2' }, `${t.composer} ・ ${t.by}`), h('span', { class: 't3' }, t.lic))));
    });
    markList();
  }
  function markList() {
    const id = audio.src ? String(queue[pos]) : '';
    for (const b of ul.querySelectorAll('button')) b.setAttribute('aria-current', String(b.dataset.i === id));
  }
  function openList() {
    renderList();
    vol2.value = String(audio.volume);
    dialog.showModal();
    ul.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' });
  }
  return { count: TRACKS.length };
}

/* ---------- ambient sounds, generated in the browser (no downloads, no licences) ---------- */
let ctx = null;
let master = null;
const live = {};
function noise(kind) {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  return src;
}
const MAKE = {
  rain() {
    const src = noise('white');
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.value = 0.18;
    src.connect(hp).connect(lp).connect(g);
    return { src, out: g };
  },
  wave() {
    const src = noise('brown');
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = ctx.createGain(); g.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const depth = ctx.createGain(); depth.gain.value = 0.42;
    lfo.connect(depth).connect(g.gain); lfo.start();
    src.connect(lp).connect(g);
    return { src, out: g, extra: lfo };
  },
  brown() {
    const src = noise('brown');
    const g = ctx.createGain(); g.gain.value = 0.55;
    src.connect(g);
    return { src, out: g };
  },
};
export const ambience = {
  kinds: [['rain', '雨'], ['wave', '波'], ['brown', 'ゴーッ']],
  isOn: (k) => !!live[k],
  toggle(k) {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = loadJSON('n1q-amb', 0.5);
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    if (live[k]) {
      live[k].src.stop(); live[k].extra?.stop(); live[k].out.disconnect();
      delete live[k];
      return false;
    }
    const node = MAKE[k]();
    node.out.connect(master); node.src.start();
    live[k] = node;
    return true;
  },
  volume: () => loadJSON('n1q-amb', 0.5),
  setVolume(v) { saveJSON('n1q-amb', v); if (master) master.gain.value = v; },
  /** Short "ding" for the pomodoro timer. */
  ding() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const c = ctx || (ctx = new AC());
      if (!master) { master = c.createGain(); master.gain.value = loadJSON('n1q-amb', 0.5); master.connect(c.destination); }
      [880, 1175, 1568].forEach((f, i) => {
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        const t = c.currentTime + i * 0.16;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.55);
      });
    } catch { /* no audio: fine */ }
  },
};
