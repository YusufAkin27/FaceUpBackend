# FaceUp Backend

WebRTC tabanlı görüntülü görüşme uygulaması için Node.js backend sunucusu. Socket.io ile gerçek zamanlı iletişim ve WebRTC signaling sağlar.

## 📋 İçindekiler

- [Özellikler](#özellikler)
- [Gereksinimler](#gereksinimler)
- [Kurulum](#kurulum)
- [Kullanım](#kullanım)
- [API Dokümantasyonu](#api-dokümantasyonu)
- [Socket.io Events](#socketio-events)
- [Yapılandırma](#yapılandırma)
- [Sorun Giderme](#sorun-giderme)

## ✨ Özellikler

- ✅ Ad-soyad ile kullanıcı kaydı
- ✅ Random eşleşme sistemi (Fisher-Yates shuffle algoritması)
- ✅ WebRTC signaling (offer/answer/ICE candidate)
- ✅ Gerçek zamanlı mesajlaşma
- ✅ Oda yönetimi (room-based)
- ✅ Otomatik yeniden eşleşme
- ✅ Bağlantı durumu takibi
- ✅ Web ve mobil uyumluluk
- ✅ CORS desteği
- ✅ Health check endpoint

## 🔧 Gereksinimler

- Node.js (v14 veya üzeri)
- npm veya yarn

## 📦 Kurulum

1. Proje dizinine gidin:
```bash
cd backend
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

## 🚀 Kullanım

### Geliştirme Modu

Otomatik yeniden başlatma ile çalıştırma:
```bash
npm run dev
```

### Production Modu

Normal çalıştırma:
```bash
npm start
```

Server varsayılan olarak `http://localhost:3000` adresinde çalışır.

Port'u değiştirmek için:
```bash
PORT=8080 npm start
```

## 📡 API Dokümantasyonu

### REST Endpoints

#### `GET /health`

Server durumunu kontrol eder.

**Response:**
```json
{
  "status": "ok",
  "waitingUsers": 5,
  "activeRooms": 3,
  "totalUsers": 8
}
```

## 🔌 Socket.io Events

### Client → Server Events

#### `register`
Kullanıcı kaydı yapar.

**Payload:**
```json
{
  "name": "Yusuf",
  "surname": "Akin"
}
```

**Response:** `registered` event'i gönderilir.

---

#### `join-room`
Odaya katılır (call screen'den yeni socket bağlantısı için).

**Payload:**
```json
{
  "roomId": "room_1234567890_abc123",
  "name": "Yusuf",
  "surname": "Akin"
}
```

**Response:** `room-joined` event'i gönderilir.

---

#### `offer`
WebRTC offer gönderir.

**Payload:**
```json
{
  "roomId": "room_1234567890_abc123",
  "offer": { /* RTCSessionDescriptionInit */ }
}
```

---

#### `answer`
WebRTC answer gönderir.

**Payload:**
```json
{
  "roomId": "room_1234567890_abc123",
  "answer": { /* RTCSessionDescriptionInit */ }
}
```

---

#### `ice-candidate`
ICE candidate gönderir.

**Payload:**
```json
{
  "roomId": "room_1234567890_abc123",
  "candidate": { /* RTCIceCandidateInit */ }
}
```

---

#### `message`
Mesaj gönderir.

**Payload:**
```json
{
  "roomId": "room_1234567890_abc123",
  "message": "Merhaba!"
}
```

---

#### `swipe`
Görüşmeyi sonlandırır ve yeni eşleşme arar.

**Payload:**
```json
{
  "roomId": "room_1234567890_abc123"
}
```

---

#### `end-call`
Görüşmeyi sonlandırır.

**Payload:**
```json
{
  "roomId": "room_1234567890_abc123"
}
```

### Server → Client Events

#### `registered`
Kayıt başarılı.

**Payload:**
```json
{
  "success": true
}
```

---

#### `matched`
Eşleşme yapıldı.

**Payload:**
```json
{
  "roomId": "room_1234567890_abc123",
  "partner": {
    "name": "Ahmet",
    "surname": "Yılmaz"
  },
  "isInitiator": true
}
```

---

#### `room-joined`
Odaya katılım başarılı.

**Payload:**
```json
{
  "roomId": "room_1234567890_abc123",
  "success": true
}
```

---

#### `offer`
WebRTC offer alındı.

**Payload:**
```json
{
  "offer": { /* RTCSessionDescriptionInit */ },
  "from": "socket_id_123"
}
```

---

#### `answer`
WebRTC answer alındı.

**Payload:**
```json
{
  "answer": { /* RTCSessionDescriptionInit */ },
  "from": "socket_id_123"
}
```

---

#### `ice-candidate`
ICE candidate alındı.

**Payload:**
```json
{
  "candidate": { /* RTCIceCandidateInit */ },
  "from": "socket_id_123"
}
```

---

#### `message`
Mesaj alındı.

**Payload:**
```json
{
  "id": "1234567890",
  "text": "Merhaba!",
  "sender": "socket_id_123",
  "senderName": "Yusuf Akin",
  "timestamp": 1234567890
}
```

---

#### `call-ended`
Görüşme sonlandı.

**Payload:**
```json
{
  "from": "socket_id_123",
  "reason": "swipe" // veya "end-call"
}
```

---

#### `error`
Hata mesajı.

**Payload:**
```json
{
  "message": "Hata mesajı"
}
```

## ⚙️ Yapılandırma

### Ortam Değişkenleri

- `PORT`: Server port numarası (varsayılan: 3000)

### CORS Ayarları

Backend, tüm origin'lere izin verir (`origin: "*"`). Production ortamında güvenlik için belirli origin'leri whitelist'e ekleyin.

## 🔄 Matching Sistemi

- **Random Shuffle**: Fisher-Yates shuffle algoritması ile rastgele eşleşme
- **Otomatik Yeniden Eşleşme**: Swipe/end-call sonrası her iki kullanıcı da otomatik bekleme listesine eklenir
- **Disconnect Yönetimi**: Bağlantı koparsa partner otomatik bekleme listesine eklenir
- **Oda Temizleme**: Boş odalar otomatik temizlenir

## 🐛 Sorun Giderme

### Port zaten kullanımda

```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Çözüm:** Farklı bir port kullanın:
```bash
PORT=8080 npm start
```

### Socket bağlantı hatası

- Backend'in çalıştığından emin olun
- CORS ayarlarını kontrol edin
- Firewall ayarlarını kontrol edin

### Eşleşme yapılmıyor

- Bekleme listesinde en az 2 kullanıcı olmalı
- Health check endpoint'ini kontrol edin: `GET /health`

## 📝 Notlar

- Server, tüm ağ arayüzlerinde dinler (`0.0.0.0`) - mobil emülatör erişimi için
- Mobil emülatör için backend URL: `http://10.0.2.2:3000`
- Production ortamında HTTPS kullanın
- Socket bağlantıları otomatik olarak yönetilir ve temizlenir

## 📄 Lisans

ISC
