# N1 クイズ

A fast, offline-capable JLPT N1 vocabulary and grammar quiz.
Plain HTML/CSS/JS (no framework, no build step), hosted on GitHub Pages,
with optional progress sync through Firebase (free Spark plan).

Live: https://matsutori1543.github.io/n1-quiz-moe/

## How it works

- **Sessions**: 20 questions. Due reviews first, then new questions, then older ones.
- **Missed questions** (spaced repetition): wrong → comes back ~5 questions later and tomorrow.
  Right → waits 1 → 3 → 7 → 14 → 30 → 60 days.
- **Saving**: every answer is saved in the browser immediately (`localStorage`).
  If you log in with Google, it also syncs to Firestore in the background.
- **Offline**: a service worker caches the app and questions.
- **Desktop vs phone**: ≥1100px wide shows the desktop with windows; smaller screens show the phone layout.

## Files

| Path | What it is |
|---|---|
| `index.html` | App shell + Content Security Policy |
| `css/style.css` | All styling |
| `js/app.js` | Screens, quiz flow, desktop widgets |
| `js/srs.js` | Spaced repetition + session picking |
| `js/storage.js` | Local saving, merging, import/export |
| `js/sync.js` | Firebase login + sync (loaded lazily) |
| `data/vocab.json`, `data/grammar.json` | Questions |
| `img/list.json` | Filenames of images shown in the desktop picture window |
| `firestore.rules` | Security rules to paste into Firebase |
| `sw.js`, `manifest.json`, `icons/` | Offline + home-screen install |

## Adding questions

Each question in `data/*.json`:

```json
{
  "id": "v-bun-016",            // unique
  "cat": "vocab",               // vocab | grammar
  "type": "bunmyaku",           // yomi | bunmyaku | iikae | youhou | bunpou | narabe
  "q": "文（　　）文",            // {word} = underlined, （　　） = blank, ★ = star slot
  "opts": ["正解", "b", "c", "d"],
  "a": 0,                       // index of the correct option (options are shuffled on screen)
  "exp": "解説\n2行目",
  "ex": "例文（任意）",
  "full": "並べ替えの正しい文（narabe のみ）"
}
```

## Adding pictures

Put image files in `img/` and list their filenames in `img/list.json`, e.g. `["a.webp", "b.jpg"]`.
Only use images you have the right to publish — this site is public.

## One-time setup

1. **GitHub Pages**: repo Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
2. **Firebase rules**: open `firestore.rules`, replace `YOUR_EMAIL@gmail.com` with your Google account
   (only in the console, not in the repo), and publish it in Firestore → Rules.
3. **Authorized domain**: Firebase → Authentication → Settings → Authorized domains → add `matsutori1543.github.io`.
4. **API key restriction** (recommended): Google Cloud Console → APIs & Services → Credentials →
   the "Browser key" → Application restrictions: *Websites* → add
   `https://matsutori1543.github.io/*` and `https://n1-quiz-moe.firebaseapp.com/*`.
