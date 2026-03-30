## 🎯 Hata Düzeltme

### Sorun
Arama sayfasında yapım kartındaki "Ekle" butonundan listeye ekleme yaparken "Bir hata oluştu!" mesajı verip başarısız oluyordu. Ancak yapımın detay sayfasından ekleme işlemi normal şekilde çalışıyordu.

### Kök Neden
TMDB arama API'sinin dönüş verilerinde `runtime` (film süresi) bilgisi bulunmamaktadır. Bu alanda `undefined` değeri kalan veri, Firebase Firestore'a yazılmaya çalışılırken hata oluşturuyordu. Firestore `undefined` değerlerini kabul etmezken `null` değerlerini kabul eder.

### Çözüm
- **Search.jsx**: `runtime` alanının `undefined` olma durumu `null`'a dönüştürüldü
- **Discover.jsx**: Aynı sorun düzeltildi + `rewatchCount` ve `favorite` alanları eklendi
- **Güvenlik**: Her iki dosyada da `auth.currentUser` null kontrolü eklendi

## 📝 Değişiklikler

### Search.jsx
- Runtime `undefined` → `null` dönüştürme: `(selectedItem.runtime || null)`
- Auth kontrolü eklendi: `if (!selectedItem || !auth.currentUser) return;`

### Discover.jsx
- Runtime `undefined` → `null` dönüştürme: `(selectedItem.runtime || null)`
- Auth kontrolü eklendi
- Veri tutarlılığı için eksik alanlar eklendi:
  - `rewatchCount: 0`
  - `favorite: false`

## ✅ Test Sonuçları
- ✔️ Arama sonuçlarından filme/diziye ekleme başarılı
- ✔️ Modal'da durum seçimi çalışıyor
- ✔️ Firebase'e veri yazılıyor
- ✔️ Detay sayfasından ekleme hâlâ çalışıyor

## 📦 Versyon Bilgisi
- **Versiyon**: 1.1.1
- **Türü**: 🐛 Bug Fix (Hata Düzeltme)
- **Etkilenen Sayfalar**: Search, Discover
- **Uyumluluk**: Tüm cihazlar ve tarayıcılar

---

**Commit**: 8a52d8a
**Tarih**: 2026-03-24
**Geliştirici**: Claude Opus 4.6
