// Chill classical BGM, streamed from Wikimedia Commons.
// Every recording here is public domain or under a free licence (CC BY / CC BY-SA),
// which only asks for credit — shown under the track title with a link to the source page.

const BASE = 'https://upload.wikimedia.org/wikipedia/commons/';
const PD = 'パブリックドメイン';

// [hash dir, Commons file name, title, composer, performer, licence]
const TRACKS = [
  ['5/5c', 'Frederic_Chopin_-_Nocturne_Eb_major_Opus_9,_number_2.ogg', 'ノクターン 第2番 Op.9-2', 'ショパン', 'Martha Goldstein', 'CC BY-SA 2.0'],
  ['e/e8', 'Chopin_Nocturne_Op_37_no_2_in_G_major_Olga_Gurevich.ogg', 'ノクターン Op.37-2', 'ショパン', 'Olga Gurevich (Musopen)', PD],
  ['a/a0', 'Chopin_Nocturne_in_F_sharp_minor_Op_48_no_2_Luke_Faulkner.ogg', 'ノクターン Op.48-2', 'ショパン', 'Luke Faulkner (Musopen)', PD],
  ['2/2c', 'Frederic_Chopin_-_nocturne_no._2_in_e_flat_major,_op._62.ogg', 'ノクターン Op.62-2', 'ショパン', 'Donald Betts (Musopen)', PD],
  ['a/a0', 'Chopin_Nocturne_21_in_C_minor_Posthumous_Diana_Hughes.ogg', 'ノクターン 第21番（遺作）', 'ショパン', 'Diana Hughes (Musopen)', PD],
  ['a/a4', 'Chopin_-_Piano_Concerto_no._1,_Op._11_(string_quartet)-2.ogg', 'ピアノ協奏曲第1番 第2楽章 ロマンツェ', 'ショパン', 'Zuzana Šimurdová ほか (Musopen)', 'CC0'],
  ['0/02', 'Franz_Liszt_-_Liebestraum,_Ab_Major.ogg', '愛の夢 第3番', 'リスト', 'Martha Goldstein', 'CC BY-SA 2.0'],
  ['e/e2', 'Tchaikovsky_the_Seasons_January.ogg', '四季 1月「炉ばたで」', 'チャイコフスキー', 'Bernd Krueger', 'CC BY-SA 2.0 DE'],
  ['5/54', 'Tchaikovsky_the_Seasons_June.ogg', '四季 6月「舟歌」', 'チャイコフスキー', 'Bernd Krueger', 'CC BY-SA 2.0 DE'],
  ['d/d0', 'Tchaikovsky_the_Seasons_October.ogg', '四季 10月「秋の歌」', 'チャイコフスキー', 'Bernd Krueger', 'CC BY-SA 2.0 DE'],
  ['4/4e', 'Rachmaninoff_Prelude_in_B_Minor,_Op._32,_No._10.oga', '前奏曲 ロ短調 Op.32-10', 'ラフマニノフ', 'La Pianista', 'CC BY 3.0'],
  ['8/8d', 'Claude_Debussy_-_I_Livre_Prelude_VIII..._(...La_fille_aux_cheveux_de_lin)_-_Patrizia_Prati.ogg', '亜麻色の髪の乙女', 'ドビュッシー', 'Patrizia Prati', 'CC BY-SA 4.0'],
  ['0/0f', 'Claude_Debussy_-_Première_Arabesque_-_Patrizia_Prati.ogg', 'アラベスク 第1番', 'ドビュッシー', 'Patrizia Prati', 'CC BY-SA 4.0'],
  ['9/90', 'Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg', 'ジムノペディ 第1番', 'サティ', 'Musopen', PD],
  ['9/91', 'Satie_-_Gnossienne_1.ogg', 'グノシエンヌ 第1番', 'サティ', 'La Pianista', 'CC BY-SA 3.0'],
  ['c/c8', 'Gnossienne_2_(Satie).ogg', 'グノシエンヌ 第2番', 'サティ', 'La Pianista', 'CC BY-SA 3.0'],
  ['0/07', 'Gnossienne_5_(Satie).ogg', 'グノシエンヌ 第5番', 'サティ', 'La Pianista', 'CC BY-SA 3.0'],
  ['2/2b', 'Gnossienne_6_(Satie).ogg', 'グノシエンヌ 第6番', 'サティ', 'La Pianista', 'CC BY-SA 3.0'],
  ['8/89', 'Claude_Debussy_-_Deuxième_Arabesque_-_Patrizia_Prati.ogg', 'アラベスク 第2番', 'ドビュッシー', 'Patrizia Prati', 'CC BY-SA 4.0'],
  ['f/fd', 'Fryderyk_Chopin_-_Nocturne_op._9_n.3_H-dur_-_Patrizia_Prati.ogg', 'ノクターン 第3番 Op.9-3', 'ショパン', 'Patrizia Prati', 'CC BY-SA 4.0'],
  ['5/5c', 'Tchaikovsky_the_Seasons_March.ogg', '四季 3月「ひばりの歌」', 'チャイコフスキー', 'Bernd Krueger', 'CC BY-SA 2.0 DE'],
  ['e/e1', 'Tchaikovsky_the_Seasons_May.ogg', '四季 5月「白夜」', 'チャイコフスキー', 'Bernd Krueger', 'CC BY-SA 2.0 DE'],
  ['a/a4', 'Tchaikovsky_the_Seasons_December.ogg', '四季 12月「クリスマス」', 'チャイコフスキー', 'Bernd Krueger', 'CC BY-SA 2.0 DE'],
].map(([dir, file, title, composer, performer, licence]) => {
  const enc = encodeURIComponent(file).replace(/%2F/g, '/');
  return {
    title, composer, performer, licence, source: 'Wikimedia Commons',
    ogg: `${BASE}${dir}/${enc}`,
    mp3: `${BASE}transcoded/${dir}/${enc}/${enc}.mp3`,
    page: `https://commons.wikimedia.org/wiki/File:${enc}`,
  };
});

// Musopen "Complete Chopin Collection" on the Internet Archive — CC0 (public domain dedication).
const IA = 'https://archive.org/download/musopen-chopin/';
const IA_PAGE = 'https://archive.org/details/musopen-chopin';
[
  ['Nocturne Op. 15 no. 1 In F major', 'ノクターン Op.15-1'],
  ['NocturneOp27No2', 'ノクターン Op.27-2'],
  ['Nocturne Op. 32 no. 1 in B major', 'ノクターン Op.32-1'],
  ['Nocturne Op. 32 no. 2 in A flat major', 'ノクターン Op.32-2'],
  ['Nocturne Op. 55 no. 1 in F minor', 'ノクターン Op.55-1'],
  ['Nocturne Op. 55 no. 2 in E flat major', 'ノクターン Op.55-2'],
  ['NocturneOp.72No.1InEMinor', 'ノクターン Op.72-1'],
  ['NocturneOp.9No.1InBFlatMinor', 'ノクターン 第1番 Op.9-1'],
  ["Nocturne B. 49 in C sharp minor 'Lento con gran espressione' (1)", 'ノクターン 第20番（遺作）'],
  ['Waltz Op. 69 no. 1 in A flat major', 'ワルツ Op.69-1「別れ」'],
  ['Waltz Op. 64 no. 2 in C sharp minor', 'ワルツ Op.64-2'],
  ['WaltzOp.34No.2InAMinor', 'ワルツ Op.34-2'],
  ['Prelude Op. 28 no. 6', '前奏曲 Op.28-6'],
  ['Prelude Op. 28 no. 13', '前奏曲 Op.28-13'],
  ['Prelude Op. 28 no. 15', '前奏曲 Op.28-15「雨だれ」'],
  ['Prelude Op. 28 no. 17', '前奏曲 Op.28-17'],
].forEach(([file, title]) => {
  const url = IA + encodeURIComponent(`${file}.mp3`);
  TRACKS.push({ title, composer: 'ショパン', performer: 'Musopen', licence: 'CC0', source: 'Internet Archive', ogg: null, mp3: url, page: IA_PAGE });
});

const KEY = 'n1q-radio';
const $ = (id) => document.getElementById(id);

export function initRadio() {
  const root = $('radio');
  if (!root) return;
  const audio = new Audio();
  audio.preload = 'none';
  const canOgg = !!audio.canPlayType('audio/ogg; codecs="vorbis"');

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* ignore */ }
  let order = shuffledOrder();
  let pos = 0;
  let triedMp3 = false;
  let errors = 0;
  audio.volume = typeof saved.vol === 'number' ? Math.min(1, Math.max(0, saved.vol)) : 0.5;
  $('r-vol').value = String(audio.volume);
  setMin(!!saved.min);
  let seeking = false;

  // Desktop: live in the left column under the stats player. Phone: under the quiz.
  const mq = window.matchMedia('(min-width:1100px)');
  const place = () => {
    const side = document.querySelector('.side-l');
    if (mq.matches && side) side.append(root);
    else document.getElementById('desk').after(root);
  };
  place();
  mq.addEventListener('change', place);

  function setMin(on) {
    root.classList.toggle('min', on);
    const b = $('radio-min');
    b.textContent = on ? '+' : '–';
    b.setAttribute('aria-label', on ? '元に戻す' : '最小化');
  }
  const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

  // Track list
  const list = $('r-list');
  list.replaceChildren(...TRACKS.map((t, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.textContent = `${t.composer}「${t.title}」`;
    b.addEventListener('click', () => playIndex(i));
    li.append(b);
    return li;
  }));
  const setList = (open) => {
    list.hidden = !open;
    $('r-listbtn').setAttribute('aria-expanded', String(open));
    $('r-listbtn').textContent = open ? '曲リスト ▴' : '曲リスト ▾';
    const cur = open && list.querySelector('.cur');
    if (cur) list.scrollTop = cur.offsetTop - list.clientHeight / 2;
  };
  $('r-listbtn').addEventListener('click', () => setList(list.hidden));
  // Close the pop-up list when clicking elsewhere or pressing Esc (desktop).
  document.addEventListener('click', (e) => { if (mq.matches && !list.hidden && !root.contains(e.target)) setList(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !list.hidden) setList(false); });
  function markCurrent() {
    [...list.children].forEach((li, i) => li.classList.toggle('cur', i === order[pos]));
  }
  function playIndex(i) {
    pos = order.indexOf(i);
    load(true);
  }

  // Seek bar
  const seek = $('r-seek');
  seek.addEventListener('input', () => {
    seeking = true;
    if (audio.duration) $('r-cur').textContent = fmt((seek.value / 1000) * audio.duration);
  });
  seek.addEventListener('change', () => {
    if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration;
    seeking = false;
  });

  function shuffledOrder() {
    const a = TRACKS.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ vol: audio.volume, min: root.classList.contains('min') })); } catch { /* ignore */ }
  };
  const track = () => TRACKS[order[pos]];

  function show() {
    const t = track();
    $('r-title').textContent = `♪ ${t.composer}「${t.title}」`;
    const credit = $('r-credit');
    const link = document.createElement('a');
    link.href = t.page;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = t.source;
    credit.replaceChildren(`演奏: ${t.performer} · ${t.licence} · `, link);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.composer, album: 'N1 クイズ BGM' });
    }
    markCurrent();
  }

  function load(autoplay) {
    const useOgg = canOgg && !!track().ogg;
    triedMp3 = !useOgg;
    audio.src = useOgg ? track().ogg : track().mp3;
    show();
    seek.value = '0';
    $('r-cur').textContent = '0:00';
    $('r-dur').textContent = '0:00';
    if (autoplay) audio.play().catch(() => setPlaying(false));
  }

  function setPlaying(on) {
    const btn = $('r-play');
    btn.textContent = on ? '❚❚' : '▶';
    btn.setAttribute('aria-label', on ? '一時停止' : '再生');
    root.classList.toggle('playing', on);
  }

  function step(dir) {
    pos = (pos + dir + order.length) % order.length;
    if (pos === 0 && dir > 0) order = shuffledOrder();
    load(true);
  }

  $('r-play').addEventListener('click', () => {
    if (!audio.src) load(true);
    else if (audio.paused) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  });
  $('r-next').addEventListener('click', () => step(1));
  $('r-prev').addEventListener('click', () => step(-1));
  $('r-vol').addEventListener('input', (e) => { audio.volume = Number(e.target.value); save(); });
  $('radio-min').addEventListener('click', () => { setMin(!root.classList.contains('min')); save(); });

  audio.addEventListener('play', () => { setPlaying(true); errors = 0; });
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => step(1));
  audio.addEventListener('loadedmetadata', () => { $('r-dur').textContent = fmt(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration || seeking) return;
    seek.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
    $('r-cur').textContent = fmt(audio.currentTime);
  });
  audio.addEventListener('error', () => {
    if (!triedMp3) {
      triedMp3 = true;
      audio.src = track().mp3;
      audio.play().catch(() => {});
      return;
    }
    errors += 1;
    if (errors < TRACKS.length) step(1);
    else {
      setPlaying(false);
      $('r-title').textContent = '♪ 再生できませんでした（オフライン？）';
    }
  });

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
    navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
  }
  show();
}
