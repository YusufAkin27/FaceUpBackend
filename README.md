# FaceUp - Görüntülü Görüşme Uygulaması Backend

WebRTC tabanlı görüntülü görüşme uygulaması backend. Web ve mobil uygulamalar desteklenir.

## Kurulum

```bash
npm install
npm start
```

Geliştirme modu için:
```bash
npm run dev
```

Server varsayılan olarak `http://localhost:3000` portunda çalışır.

## API Endpoints

- `GET /health` - Server durumu kontrolü

## Socket.io Events

### Client -> Server

- `register` - Kullanıcı kaydı (ad, soyad)
- `offer` - WebRTC offer gönderme
- `answer` - WebRTC answer gönderme
- `ice-candidate` - ICE candidate gönderme
- `message` - Mesaj gönderme
- `swipe` - Görüşmeyi sonlandır ve yeni match ara
- `end-call` - Görüşmeyi sonlandır

### Server -> Client

- `registered` - Kayıt başarılı
- `matched` - Eşleşme yapıldı
- `offer` - WebRTC offer alındı
- `answer` - WebRTC answer alındı
- `ice-candidate` - ICE candidate alındı
- `message` - Mesaj alındı
- `call-ended` - Görüşme sonlandı
- `error` - Hata mesajı

## Özellikler

- ✅ Ad-soyad ile kullanıcı kaydı
- ✅ Random eşleşme sistemi (Fisher-Yates shuffle)
- ✅ WebRTC ile görüntülü görüşme
- ✅ Ses ve görüntü aktarımı
- ✅ Görüntülü sohbet sırasında mesajlaşma
- ✅ Swipe ve end-call ile otomatik yeniden eşleşme
- ✅ Disconnect sonrası partner otomatik yeniden eşleşme
- ✅ Web ve mobil uyumluluk
- ✅ Kullanıcı durum takibi (waiting/active)
- ✅ Socket bağlantı kontrolleri
- ✅ Hata yönetimi

## Matching Sistemi

- Random shuffle ile eşleşme
- Aynı kişiye tekrar denk gelebilir
- Swipe/end-call sonrası her iki kullanıcı da otomatik yeniden eşleşir
- Disconnect sonrası partner otomatik bekleme listesine eklenir
- Boşta kimse kalmaz

