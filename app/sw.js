/* Kendini silen service worker (2026-11-07).
 *
 * Panel artık app.pruvabusiness.com/app/ üzerinde. Bu adreste eskiden kurulu olan
 * worker, paneli çevrimdışıyken önbellekten açmaya devam ederdi. Tarayıcı bu
 * dosyanın değiştiğini görünce yenisini kurar; o da önbelleği siler, kaydını
 * kaldırır ve açık sekmeleri yönlendirme sayfasına yeniden yükler.
 * ⚠️ SİLME: dosya 404 verirse eski worker kurulu kalır.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(c => c.navigate(c.url));
})()));
