// Optional cloud sync with Firebase (Auth + Firestore Lite).
// Loaded only after the quiz is on screen, so it never slows the first load.
// Security is enforced by Firestore rules (firestore.rules), not by this file.

const VERSION = '13.2.0';
const CDN = `https://www.gstatic.com/firebasejs/${VERSION}`;

// Public web config: safe to publish. Access is limited by the security rules
// and by the API-key restrictions in Google Cloud Console.
const firebaseConfig = {
  apiKey: 'AIzaSyAfwkwJzrvtu4JLzCEbaZJj56Q3DvHybMA',
  authDomain: 'n1-quiz-moe.firebaseapp.com',
  projectId: 'n1-quiz-moe',
  storageBucket: 'n1-quiz-moe.firebasestorage.app',
  messagingSenderId: '814108544125',
  appId: '1:814108544125:web:42cef507f50b051f45b514',
};

export function createSync(store, onStatus) {
  let A; // firebase-auth module
  let F; // firestore-lite module
  let auth;
  let db;
  let user = null;
  let denied = false;
  let timer = null;
  let busy = false;
  let again = false;

  const status = (s) => onStatus(s, user ? { email: user.email || '' } : null);

  const ready = (async () => {
    const [appMod, authMod, fsMod] = await Promise.all([
      import(`${CDN}/firebase-app.js`),
      import(`${CDN}/firebase-auth.js`),
      import(`${CDN}/firebase-firestore-lite.js`),
    ]);
    A = authMod;
    F = fsMod;
    const app = appMod.initializeApp(firebaseConfig);
    auth = A.getAuth(app);
    db = F.getFirestore(app);
    A.onAuthStateChanged(auth, (u) => {
      user = u;
      if (!u) {
        status(denied ? 'denied' : 'off');
        return;
      }
      denied = false;
      pull();
    });
  })();

  const ref = () => F.doc(db, 'users', user.uid);

  async function pull() {
    if (!user) return;
    status('loading');
    try {
      const snap = await F.getDoc(ref());
      const remote = snap.exists() ? store.clean(snap.data()) : null;
      if (remote) store.replace(store.merge(store.get(), remote), 'remote');
      await push();
    } catch (e) {
      fail(e);
    }
  }

  async function push() {
    if (!user) return;
    if (busy) {
      again = true;
      return;
    }
    busy = true;
    try {
      const s = store.get();
      await F.setDoc(ref(), { progress: s.progress, days: s.days, updatedAt: s.updatedAt || Date.now() });
      status('ok');
    } catch (e) {
      fail(e);
    } finally {
      busy = false;
      if (again) {
        again = false;
        schedule();
      }
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      push();
    }, 4000);
  }

  function fail(e) {
    const code = String((e && e.code) || '');
    if (code.includes('permission-denied')) {
      denied = true;
      A.signOut(auth);
    } else if (!navigator.onLine || code.includes('unavailable')) status('offline');
    else status('error');
  }

  store.onChange((_, source) => {
    if (!user || source === 'remote') return;
    if (source === 'reset' || source === 'import') push();
    else schedule();
  });

  window.addEventListener('online', () => user && pull());
  document.addEventListener('visibilitychange', () => {
    if (!user) return;
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer);
      timer = null;
      push();
    } else if (document.visibilityState === 'visible') pull();
  });

  return {
    async login() {
      await ready;
      denied = false;
      status('loading');
      try {
        await A.signInWithPopup(auth, new A.GoogleAuthProvider());
      } catch (e) {
        const code = String((e && e.code) || '');
        if (code.includes('popup-closed') || code.includes('cancelled-popup')) status('off');
        else throw e;
      }
    },
    async logout() {
      await ready;
      clearTimeout(timer);
      await A.signOut(auth);
    },
    syncNow() {
      if (user) pull();
    },
  };
}
