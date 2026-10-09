// Pruva web paneli — panel İÇİ metinlerin çevirisi.
//
// Panelin içindeki metinler Türkçe yazılı (HTML + JS şablonları). Bu dosya,
// seçili dil Türkçe değilse `i18n/<dil>.json` sözlüğünü yükler ve ekrandaki
// metin düğümlerini çevirir; sonradan çizilen her şeyi de (MutationObserver).
//
// ⚠️ Sözlük anahtarı TÜRKÇE metnin KENDİSİ. Paneldeki bir metni değiştirirsen
//    o satır sözlükte bulunamaz ve Türkçe kalır (hata vermez). Sözlüğü yeniden
//    üretmek gerekir (uygulama deposu: scripts/web-panel-i18n/).
// ⚠️ Çeviriler MAKİNE çevirisi. Giriş ekranı ayrı (LOGIN_I18N), buraya dokunmaz.
// ⚠️ Yalnızca TAM eşleşen metin çevrilir; ürün/müşteri adı gibi kullanıcı verisi
//    sözlükte olmadığı için olduğu gibi kalır.
(function () {
  var lang = window.PRUVA_LOGIN_LANG || 'tr';
  if (lang === 'tr') return;
  var E = null, P = [];
  // 'label': <optgroup label> (ürün formundaki kategori grupları)
  var ATTRS = ['placeholder', 'title', 'aria-label', 'label'];

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function tr(text) {
    if (!E || !text) return null;
    var k = text.trim();
    if (k.length < 2) return null;
    var v = E[k];
    if (v === undefined) {
      for (var i = 0; i < P.length; i++) {
        var m = P[i][0].exec(k);
        if (m) { v = P[i][1].replace(/\{(\d)\}/g, function (_, n) { return m[+n + 1] || ''; }); break; }
      }
    }
    if (v === undefined || v === k) return null;
    return text.replace(k, v);
  }
  function walk(n) {
    if (!n) return;
    if (n.nodeType === 3) {
      var p = n.parentNode;
      if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) || p.isContentEditable) return;
      var r = tr(n.nodeValue);
      if (r !== null && r !== n.nodeValue) n.nodeValue = r;
    } else if (n.nodeType === 1) {
      if (/^(SCRIPT|STYLE)$/.test(n.nodeName)) return;
      for (var a = 0; a < ATTRS.length; a++) {
        var val = n.getAttribute(ATTRS[a]);
        if (val) { var t = tr(val); if (t !== null && t !== val) n.setAttribute(ATTRS[a], t); }
      }
      for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
    }
  }
  function wrapDialogs() {
    ['alert', 'confirm', 'prompt'].forEach(function (name) {
      var orig = window[name];
      window[name] = function (msg) {
        var args = Array.prototype.slice.call(arguments);
        if (typeof msg === 'string') { var t = tr(msg); if (t !== null) args[0] = t; }
        return orig.apply(window, args);
      };
    });
  }
  fetch('i18n/' + lang + '.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.e) return;
    E = d.e;
    P = (d.p || []).map(function (pair) {
      // "{0} adet" → /^(.+?) adet$/
      var re = '^' + esc(pair[0]).replace(/\\\{\d\\\}/g, '(.+?)') + '$';
      return [new RegExp(re), pair[1]];
    });
    walk(document.body);
    wrapDialogs();
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === 'characterData' || m.type === 'attributes') walk(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }).catch(function (e) { console.warn('[panel-i18n]', e); });
})();
