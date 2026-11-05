// Loaded in <head> before the page draws, so the saved theme applies without a flash.
(function () {
  var KEY = 'n1q-theme';
  var THEMES = {
    sunflower: { name: 'ひまわり', color: '#2a74b3' },
    pink: { name: 'さくら', color: '#c93a76' },
    red: { name: '怪盗', color: '#111111' },
  };
  function apply(id) {
    if (!THEMES[id]) id = 'sunflower';
    if (id === 'sunflower') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', id);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEMES[id].color);
    return id;
  }
  var current = 'sunflower';
  try { current = localStorage.getItem(KEY) || 'sunflower'; } catch (e) { /* ignore */ }
  current = apply(current);

  window.N1Theme = {
    list: function () { return Object.keys(THEMES).map(function (id) { return { id: id, name: THEMES[id].name }; }); },
    get: function () { return current; },
    set: function (id) {
      current = apply(id);
      try { localStorage.setItem(KEY, current); } catch (e) { /* ignore */ }
      window.dispatchEvent(new CustomEvent('n1q-theme', { detail: current }));
    },
  };
})();
