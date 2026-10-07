/* Pruva Business web paneli — çevrimdışı açılış (2026-10-07).
 *
 * Amaç TEK: internet yokken sayfa ve gereken kütüphaneler tarayıcı önbelleğinden
 * açılsın. Veri (ürünler, bekleyen satışlar) burada DEĞİL, Firestore'un kendi
 * kalıcı önbelleğinde (index.html → initializeFirestore/persistentLocalCache).
 *
 * ⚠️ Sayfa (index.html) ÖNCE AĞDAN alınır, olmazsa önbellekten: yeni sürüm yayınlanınca
 *    kullanıcı eski sayfada takılı kalmasın. Kütüphaneler sürümlü URL'de olduğu için
 *    önce önbellekten.
 * ⚠️ Firestore/Auth/AI istekleri ELLENMEZ — onları önbelleğe almak veriyi bozar.
 */
const CACHE = 'pruva-app-v2';
const LIB = /^https:\/\/(www\.gstatic\.com\/firebasejs\/|cdn\.jsdelivr\.net\/|fonts\.(googleapis|gstatic)\.com\/)/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (LIB.test(req.url)) {                       // kütüphane: önce önbellek
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin === self.location.origin) {     // sayfa + yerel dosyalar: önce ağ
    e.respondWith(caches.open(CACHE).then(async c => {
      try {
        // ⚠️ cache:'no-cache' ŞART: yoksa tarayıcının HTTP önbelleği sayfanın ESKİ kopyasını
        //    verebiliyor ve yeni yayınlanan sürüm görünmüyor (yerelde ölçüldü). Sunucuya sorulur,
        //    değişmediyse 304 döner (ucuz).
        const res = await fetch(req, { cache: 'no-cache' });
        if (res && res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await c.match(req, { ignoreSearch: true });
        if (hit) return hit;
        throw err;
      }
    }));
  }
});
