// Applies the saved theme before the page paints (plain script, loaded in <head>).
(function () {
  var KEY = 'n1q-theme';
  var LIST = [['mochi', 'もち'], ['ramune', 'ラムネ'], ['sakura', 'さくら'], ['yofukashi', 'よふかし'], ['kaitou', '怪盗']];
  var OLD = { sunflower: 'mochi', pink: 'sakura', red: 'kaitou' };
  var BAR = { mochi: '#fff3dc', ramune: '#dcf3fb', sakura: '#ffe9f0', yofukashi: '#191b33', kaitou: '#d5101e' };
  function valid(t) { return LIST.some(function (x) { return x[0] === t; }); }
  var current = 'mochi';
  try {
    var saved = localStorage.getItem(KEY);
    saved = OLD[saved] || saved;
    if (valid(saved)) current = saved;
  } catch (e) { /* ignore */ }
  function apply() {
    document.documentElement.dataset.theme = current;
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = BAR[current];
  }
  apply();
  window.N1Theme = {
    list: LIST,
    get: function () { return current; },
    set: function (t) {
      if (!valid(t)) return;
      current = t;
      try { localStorage.setItem(KEY, t); } catch (e) { /* ignore */ }
      apply();
      window.dispatchEvent(new Event('n1q-theme'));
    },
  };
})();
