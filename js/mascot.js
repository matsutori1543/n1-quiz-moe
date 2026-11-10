// Original characters drawn for this app (みけ the calico cat, だるま, ぴよ).
// Released as CC0: use them however you like.
import { svg } from './ui.js';

const EYES = {
  normal: '<ellipse class="m-k" cx="44" cy="70" rx="4.2" ry="5.4"/><ellipse class="m-k" cx="76" cy="70" rx="4.2" ry="5.4"/><circle class="m-w" cx="45.5" cy="68" r="1.5"/><circle class="m-w" cx="77.5" cy="68" r="1.5"/>',
  happy: '<path class="m-l" d="M38 72q6-8 12 0"/><path class="m-l" d="M70 72q6-8 12 0"/>',
  sad: '<path class="m-l" d="M38 68q6 6 12 0"/><path class="m-l" d="M70 68q6 6 12 0"/><path class="m-tear" d="M84 74q4 7 0 9-4-2 0-9z"/>',
  sleepy: '<path class="m-l" d="M38 71h12"/><path class="m-l" d="M70 71h12"/><text class="m-z" x="92" y="40">z</text><text class="m-z m-z2" x="101" y="29">z</text>',
  wink: '<ellipse class="m-k" cx="44" cy="70" rx="4.2" ry="5.4"/><circle class="m-w" cx="45.5" cy="68" r="1.5"/><path class="m-l" d="M70 71q6-6 12 0"/>',
  star: '<path class="m-star" d="M44 62l2.3 5 5.4.600-4 3.7 1.1 5.4-4.8-2.7-4.8 2.7 1.1-5.4-4-3.7 5.4-.600z"/><path class="m-star" d="M76 62l2.3 5 5.4.600-4 3.7 1.1 5.4-4.8-2.7-4.8 2.7 1.1-5.4-4-3.7 5.4-.600z"/>',
};
const MOUTH = {
  normal: '<path class="m-l m-thin" d="M54 80q3 4 6 0q3 4 6 0"/>',
  happy: '<path class="m-mouth" d="M53 79q7 11 14 0z"/>',
  sad: '<path class="m-l m-thin" d="M55 84q5-5 10 0"/>',
  sleepy: '<ellipse class="m-mouth" cx="60" cy="82" rx="2.5" ry="3"/>',
};
const MOODS = {
  normal: ['normal', 'normal'], happy: ['happy', 'happy'], sad: ['sad', 'sad'],
  sleepy: ['sleepy', 'sleepy'], wink: ['wink', 'happy'], wow: ['star', 'happy'], fight: ['normal', 'normal'],
};
const HACHIMAKI = '<path class="m-band" d="M21 57q39-13 78 0l-1 8q-38-12-76 0z"/><circle class="m-dot" cx="60" cy="55" r="3.6"/><path class="m-band" d="M98 58l10-5 1 6zM98 61l11 4-3 5z"/>';

/** みけ: mood = normal | happy | sad | sleepy | wink | wow | fight */
export function cat(mood = 'normal', cls = '') {
  const [eyes, mouth] = MOODS[mood] || MOODS.normal;
  return svg(`viewBox="0 0 120 120">
<path class="m-body m-tail" d="M96 92q20 2 17-16q-2-9-9-6q6 3 4 9q-2 7-12 5z"/>
<path class="m-body" d="M24 46 28 22q1-4 5-2l19 13z"/><path class="m-or" d="M28.5 41 31 26.5 43 35z"/>
<path class="m-body" d="M96 46 92 22q-1-4-5-2L68 33z"/><path class="m-br" d="M91.5 41 89 26.5 77 35z"/>
<path class="m-body" d="M60 30c30 0 46 18 46 42 0 22-16 36-46 36S14 94 14 72c0-24 16-42 46-42z"/>
<path class="m-or m-patch" d="M17 62c2-16 12-27 30-30.5 4 9-2 19-12 23-7 3-13 5-18 7.500z"/>
<path class="m-br m-patch" d="M72 31.500c14 2.5 24 10 29 21-8 1-17-1-22-7-4-4-6-9-7-14z"/>
${EYES[eyes]}
<ellipse class="m-blush" cx="33" cy="81" rx="6.5" ry="4"/><ellipse class="m-blush" cx="87" cy="81" rx="6.5" ry="4"/>
<path class="m-nose" d="M57.5 76h5l-2.5 3z"/>${MOUTH[mouth]}
<path class="m-l m-thin" d="M20 72h-9M21 78l-8 3M100 72h9M99 78l8 3"/>
<ellipse class="m-body" cx="46" cy="105" rx="9" ry="6"/><ellipse class="m-body" cx="74" cy="105" rx="9" ry="6"/>
${mood === 'fight' ? HACHIMAKI : ''}`, `mascot ${cls}`);
}

/** だるま: both eyes get painted in when `done` is true. */
export function daruma(done = false, cls = '') {
  return svg(`viewBox="0 0 120 120">
<path class="d-body" d="M60 12c28 0 46 22 46 50 0 30-18 46-46 46S14 92 14 62c0-28 18-50 46-50z"/>
<path class="d-face" d="M60 30c18 0 30 12 30 27 0 14-12 24-30 24S30 71 30 57c0-15 12-27 30-27z"/>
<path class="m-l" d="M38 44q8-7 16-1M66 43q8-6 16 1"/>
<circle class="d-eye" cx="46" cy="55" r="7"/><circle class="d-eye" cx="74" cy="55" r="7"/>
<circle class="m-k" cx="46" cy="55" r="3.6"/>${done ? '<circle class="m-k" cx="74" cy="55" r="3.6"/>' : ''}
<ellipse class="m-blush" cx="36" cy="66" rx="5" ry="3"/><ellipse class="m-blush" cx="84" cy="66" rx="5" ry="3"/>
<path class="m-l m-thin" d="M54 68q6 5 12 0"/>
<path class="d-gold" d="M40 90q20 8 40 0M46 98q14 5 28 0"/>`, `mascot ${cls}`);
}

/** ぴよ: the streak chick. */
export function chick(cls = '') {
  return svg(`viewBox="0 0 120 120">
<path class="c-body" d="M60 24c24 0 40 18 40 40s-16 38-40 38S20 86 20 64s16-40 40-40z"/>
<path class="c-body" d="M56 26q-2-12 6-14q0 6 4 8q4-6 9-3q-2 6-9 10z"/>
<path class="c-wing" d="M22 66q-10 4-8 14q8 0 12-6zM98 66q10 4 8 14q-8 0-12-6z"/>
<circle class="m-k" cx="46" cy="58" r="4.5"/><circle class="m-k" cx="74" cy="58" r="4.5"/><circle class="m-w" cx="47.5" cy="56.5" r="1.5"/><circle class="m-w" cx="75.5" cy="56.5" r="1.5"/>
<path class="c-beak" d="M52 66h16l-8 9z"/>
<ellipse class="m-blush" cx="35" cy="70" rx="6" ry="4"/><ellipse class="m-blush" cx="85" cy="70" rx="6" ry="4"/>
<path class="c-foot" d="M48 102v8M44 110h8M72 102v8M68 110h8"/>`, `mascot ${cls}`);
}

const LINES = {
  morning: ['おはよう！朝の頭はいちばん元気だよ。', '朝ごはん食べた？ まずは5問だけやろう。'],
  day: ['こんにちは！今日もこつこつ。', 'ちょっとずつで大丈夫。'],
  evening: ['おかえり！今日のぶん、やっちゃおう。', '夕方の復習はよく覚えられるよ。'],
  night: ['夜ふかしはほどほどにね。', '寝る前の10問、けっこう効くよ。'],
  pet: ['にゃ。', 'ごろごろ…', 'なでなで、ありがとう。', 'えへへ。', '合格するぞー！', '語彙は毎日ちょっとずつ。', '文法は例文ごと覚えるといいよ。', 'お水、飲んだ？', '背すじ、のばそ。', 'まちがえた問題こそ、のびしろ。'],
  right: ['せいかい！', 'やったね！', 'その調子！', 'すごい！', 'ばっちり！'],
  wrong: ['おしい！', 'だいじょうぶ、また出すね。', 'ここで覚えちゃおう。', 'どんまい！'],
};
export function say(kind) {
  if (kind === 'greet') {
    const hr = new Date().getHours();
    kind = hr < 5 ? 'night' : hr < 11 ? 'morning' : hr < 17 ? 'day' : hr < 22 ? 'evening' : 'night';
  }
  const a = LINES[kind] || LINES.pet;
  return a[Math.floor(Math.random() * a.length)];
}
