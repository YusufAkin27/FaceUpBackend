# FaceUp Backend - Node.js + Socket.io

Görüntülü matchleştirme backend sunucusu.

## Kurulum

```bash
npm install
```

## Çalıştırma

```bash
# Development
npm run dev

# Production
npm start
```

Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışır.

## Socket.io Event'leri

### Client -> Server

- `join` - Kullanıcı girişi (ad soyad ile)
  ```json
  {
    "userId": "string",
    "name": "string"
  }
  ```

- `start-matching` - Eşleştirme başlat

- `next-partner` - Sonraki kişiye geç (swipe)

- `video-frame` - Video frame gönder
  ```json
  {
    "frame": "binary data"
  }
  ```

### Server -> Client

- `joined` - Giriş başarılı
- `matched` - Eşleşme bulundu
- `video-frame` - Partner'dan video frame
- `partner-left` - Partner ayrıldı
- `partner-disconnected` - Partner bağlantısı kesildi
- `matching-started` - Eşleştirme başlatıldı
- `next-partner-started` - Yeni eşleşme aranıyor
- `error` - Hata mesajı

## API Endpoints

- `GET /health` - Sunucu durumu ve istatistikler

