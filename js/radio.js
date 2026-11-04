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
].map(([dir, file, title, composer, performer, licence]) => {
  const enc = encodeURIComponent(file).replace(/%2F/g, '/');
  return {
    title, composer, performer, licence,
    ogg: `${BASE}${dir}/${enc}`,
    mp3: `${BASE}transcoded/${dir}/${enc}/${enc}.mp3`,
    page: `https://commons.wikimedia.org/wiki/File:${enc}`,
  };
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
  root.classList.toggle('min', !!saved.min);

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
    link.textContent = 'Wikimedia Commons';
    credit.replaceChildren(`演奏: ${t.performer} · ${t.licence} · `, link);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.composer, album: 'N1 クイズ BGM' });
    }
  }

  function load(autoplay) {
    triedMp3 = !canOgg;
    audio.src = canOgg ? track().ogg : track().mp3;
    show();
    $('r-fill').style.width = '0%';
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
  $('radio-min').addEventListener('click', () => { root.classList.toggle('min'); save(); });

  audio.addEventListener('play', () => { setPlaying(true); errors = 0; });
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => step(1));
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) $('r-fill').style.width = `${(audio.currentTime / audio.duration) * 100}%`;
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
