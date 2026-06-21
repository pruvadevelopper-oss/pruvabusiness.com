# Pruva Website — Proje Notları

`pruvabusiness.com` için statik pazarlama sitesi (GitHub Pages, repo: `pruvadevelopper-oss/pruvabusiness.com`).

## KASITLI TASARIM — HATA OLARAK RAPORLAMA

### "Bow Scene" — gemi/yelken scroll animasyonu (`#bowScene`, satır ~7823)

`index.html` içinde, "sorun kartları" (`.sorun-section`) bölümünden sonra gelen
GSAP ScrollTrigger ile pinlenmiş gemi animasyonu var (`#bowPin`, `#bowFront`,
`#bowBack`, `#bowShipWrap`). Scroll ile gemi yukarı çıkarken `clip-path` ile
ön kattaki (beyaz) sorun kartlarını keserek arkadaki (yeşil) çözüm kartlarını
açığa çıkarıyor.

**Bu, kartların görsel olarak üst üste binmesi/kesişmesi BİLEREK YAPILMIŞ bir
efekttir — bug değildir.** Mobilde dar ekranda bu kesişme/binme daha belirgin
görünür (gemi gövdesi dar olduğu için ince bir "yarık" gibi keser), bu da
beklenen davranıştır. Bunu tekrar "görsel çakışma / bug" olarak raporlama —
kullanıcı bunu önceki bir oturumda da netleştirmişti.

Eğer mobilde bu efekt gerçekten okunamaz/bozuk görünüyorsa (ör. metin
harfiyen üst üste binip hem ön hem arka yazı aynı pikselde çakışıyorsa),
önce kullanıcıya sorup onay almadan dokunma — bu alan hassas, kasıtlı
tasarım kararı.

## Dosya Yapısı

- `index.html` — ana pazarlama sitesi, 24 dilli i18n sözlüğü (`window.PRUVA_I18N`) inline `<script>` içinde
- `app/index.html` — web uygulaması (login + POS mockup), kendi küçük i18n sistemi var (`LOGIN_I18N`, 24 dil, `app/index.html` içinde inline)
- `i18n.js` — KULLANILMIYOR, index.html tarafından referans verilmiyor (dead file, eski/yedek kopya olabilir)

## i18n Sistemi (ana site)

`window.PRUVA_I18N = { en: {...}, tr: {...}, ... }` — 24 dil, `data-i18n` attribute'lu elementlere uygulanıyor.

Dil algılama önceliği (`index.html` içindeki i18n runtime, satır ~8791):
1. URL `?lang=xx` parametresi
2. `localStorage.pruvaLang`
3. `navigator.languages`
4. Varsayılan: `en`

`app/index.html`'deki giriş ekranı da AYNI öncelik sırasını kullanır (`LOGIN_I18N`),
tek fark: desteklenmeyen/algılanamayan dilde **`tr`**'ye düşer (ana site `en`'e düşer).

## Mobil Responsive Notları

- `html{overflow-x:hidden}` eklendi (önceden sadece `body`'de vardı) — fixed-position
  elementler (`nav`) body'nin overflow-x:hidden'ından etkilenmediği için html'de de gerekli.
- Navbar mobilde (`@media(max-width:768px)`) hem dil seçici hem "Tarayıcıda Kullan" pill'i
  görünür durumda, ikisi de `max-width` + `text-overflow:ellipsis` ile kısıtlı çünkü
  logo + iki eleman 375px genişliğe ancak sığıyor. 360px altı için ek bir
  `@media(max-width:360px)` bloğu daha sıkı boyutlar uyguluyor.
