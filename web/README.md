# FaceUp Web Uygulaması

Vanilla JavaScript, HTML ve CSS ile geliştirilmiş görüntülü görüşme web uygulaması. WebRTC ile gerçek zamanlı video görüşme ve mesajlaşma özellikleri sunar.

## 📋 İçindekiler

- [Özellikler](#özellikler)
- [Gereksinimler](#gereksinimler)
- [Kurulum](#kurulum)
- [Kullanım](#kullanım)
- [Yapılandırma](#yapılandırma)
- [Sorun Giderme](#sorun-giderme)

## ✨ Özellikler

- ✅ Ad-soyad ile kayıt
- ✅ Random eşleşme sistemi
- ✅ WebRTC görüntülü görüşme
- ✅ Ses ve görüntü aktarımı
- ✅ Gerçek zamanlı mesajlaşma
- ✅ Kamera/mikrofon açma/kapama
- ✅ Swipe (sonraki kişi)
- ✅ Görüşme sonlandırma
- ✅ Responsive tasarım (mobil uyumlu)
- ✅ Modern ve kullanıcı dostu arayüz

## 🔧 Gereksinimler

- Modern web tarayıcı (Chrome, Firefox, Edge, Safari)
- Backend sunucusunun çalışıyor olması
- HTTPS veya localhost (WebRTC için gerekli)
- Kamera ve mikrofon erişimi

## 📦 Kurulum

1. Proje dizinine gidin:
```bash
cd web
```

2. Backend'in çalıştığından emin olun (varsayılan: `https://api.yusufakin.xyz`)

## 🚀 Kullanım

### Python HTTP Server

```bash
python -m http.server 8080
```

Tarayıcıda açın: `http://localhost:8080`

### Node.js HTTP Server

```bash
npx http-server -p 8080
```

Tarayıcıda açın: `http://localhost:8080`

### VS Code Live Server

1. VS Code'da `index.html` dosyasına sağ tıklayın
2. "Open with Live Server" seçeneğini seçin

### PHP Built-in Server

```bash
php -S localhost:8080
```

Tarayıcıda açın: `http://localhost:8080`

## ⚙️ Yapılandırma

### Backend URL Ayarlama

Backend URL'ini değiştirmek için `login.js` dosyasındaki `SERVER_URL` değişkenini düzenleyin:

```javascript
const SERVER_URL = 'https://api.yusufakin.xyz';
```

**Geliştirme için:**
```javascript
const SERVER_URL = 'http://localhost:3000';
```

### STUN Server Ayarları

STUN server'larını değiştirmek için `call.js` dosyasındaki `iceServers` yapılandırmasını düzenleyin:

```javascript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];
```

## 📁 Dosya Yapısı

```
web/
├── index.html           # Ana giriş sayfası
├── login.html           # Giriş ekranı (index.html ile aynı)
├── waiting.html         # Bekleme ekranı
├── call.html            # Görüşme ekranı
├── login.js             # Giriş mantığı
├── waiting.js           # Bekleme mantığı
├── call.js              # Görüşme mantığı
├── login.css            # Giriş stilleri
├── waiting.css          # Bekleme stilleri
├── call.css             # Görüşme stilleri
└── styles.css           # Genel stiller
```

## 🎨 Özellikler Detayı

### Giriş Ekranı (`login.html`)

- Ad-soyad girişi
- Socket.io bağlantısı
- Kullanıcı kaydı

### Bekleme Ekranı (`waiting.html`)

- Eşleşme bekleme
- Partner bilgisi gösterimi
- Otomatik yönlendirme

### Görüşme Ekranı (`call.html`)

- WebRTC video görüşme
- Mesajlaşma
- Kamera/mikrofon kontrolleri
- Swipe ve sonlandırma butonları

## 🐛 Sorun Giderme

### Kamera/mikrofon erişimi verilmiyor

- Tarayıcı ayarlarından site izinlerini kontrol edin
- HTTPS veya localhost kullandığınızdan emin olun
- Tarayıcıyı yeniden başlatın

### WebRTC bağlantı hatası

- STUN server'larının erişilebilir olduğundan emin olun
- İnternet bağlantınızı kontrol edin
- NAT/Firewall ayarlarını kontrol edin
- HTTPS kullanıyorsanız geçerli bir SSL sertifikası olmalı

### Backend bağlantı hatası

- Backend'in çalıştığından emin olun
- `login.js` dosyasındaki `SERVER_URL`'i kontrol edin
- CORS ayarlarını kontrol edin
- Tarayıcı konsolunda hata mesajlarını kontrol edin

### Socket.io bağlantı hatası

- Backend'in çalıştığından emin olun
- Socket.io CDN'inin yüklendiğinden emin olun
- Tarayıcı konsolunda hata mesajlarını kontrol edin

### Eşleşme yapılmıyor

- Backend'de en az 2 kullanıcı olmalı
- İki farklı tarayıcı sekmesi açarak test edin
- Backend loglarını kontrol edin

## 📝 Notlar

- **HTTPS Gereksinimi**: WebRTC için HTTPS veya localhost gerekir. Production ortamında mutlaka HTTPS kullanın.
- **Tarayıcı Desteği**: Modern tarayıcılar desteklenir (Chrome, Firefox, Edge, Safari)
- **Test**: İki farklı tarayıcı sekmesi açarak test edebilirsiniz
- **Mobil Uyumluluk**: Responsive tasarım sayesinde mobil cihazlarda da çalışır
- **İzinler**: İlk kullanımda tarayıcı kamera ve mikrofon erişimi isteyecektir

## 🔒 Güvenlik

- Production ortamında HTTPS kullanın
- Backend URL'ini environment variable olarak yönetin
- CORS ayarlarını production'da kısıtlayın
- XSS saldırılarına karşı input validation yapın

## 📄 Lisans

ISC
