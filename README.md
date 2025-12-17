# FaceUp - Görüntülü Görüşme Uygulaması

WebRTC tabanlı görüntülü görüşme platformu. Rastgele eşleşme ile yeni insanlarla tanışın ve görüntülü görüşme yapın.

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Özellikler](#özellikler)
- [Proje Yapısı](#proje-yapısı)
- [Hızlı Başlangıç](#hızlı-başlangıç)
- [Kurulum](#kurulum)
- [Kullanım](#kullanım)
- [Teknolojiler](#teknolojiler)
- [Katkıda Bulunma](#katkıda-bulunma)
- [Lisans](#lisans)

## 🎯 Genel Bakış

FaceUp, kullanıcıların rastgele eşleşerek görüntülü görüşme yapabileceği bir platformdur. Web ve mobil platformlar için geliştirilmiştir.

### Ana Özellikler

- **Rastgele Eşleşme**: Fisher-Yates shuffle algoritması ile rastgele kullanıcı eşleştirme
- **WebRTC Görüşme**: Gerçek zamanlı video ve ses aktarımı
- **Mesajlaşma**: Görüşme sırasında metin mesajlaşma
- **Çoklu Platform**: Web ve mobil (Android/iOS) desteği
- **Modern Arayüz**: Kullanıcı dostu ve responsive tasarım

## ✨ Özellikler

### Backend
- ✅ Socket.io ile gerçek zamanlı iletişim
- ✅ WebRTC signaling
- ✅ Oda yönetimi
- ✅ Otomatik yeniden eşleşme
- ✅ Health check endpoint

### Web
- ✅ Responsive tasarım
- ✅ WebRTC video görüşme
- ✅ Gerçek zamanlı mesajlaşma
- ✅ Kamera/mikrofon kontrolleri

### Mobile
- ✅ Flutter ile native performans
- ✅ Android ve iOS desteği
- ✅ WebRTC entegrasyonu
- ✅ Modern mobil arayüz

## 📁 Proje Yapısı

```
FaceUpBackend/
├── backend/              # Node.js backend sunucusu
│   ├── server/
│   │   └── index.js      # Ana server dosyası
│   ├── package.json
│   └── README.md
│
├── mobile/               # Flutter mobil uygulama
│   ├── lib/              # Dart kaynak kodları
│   ├── android/          # Android native kod
│   ├── ios/              # iOS native kod
│   ├── pubspec.yaml
│   └── README.md
│
├── web/                  # Web uygulaması
│   ├── index.html        # Ana sayfa
│   ├── login.html        # Giriş ekranı
│   ├── waiting.html      # Bekleme ekranı
│   ├── call.html         # Görüşme ekranı
│   ├── *.js              # JavaScript dosyaları
│   ├── *.css             # Stil dosyaları
│   └── README.md
│
└── README.md             # Bu dosya
```

## 🚀 Hızlı Başlangıç

### 1. Backend'i Başlatın

```bash
cd backend
npm install
npm start
```

Backend `http://localhost:3000` adresinde çalışacaktır.

### 2. Web Uygulamasını Başlatın

```bash
cd web
python -m http.server 8080
```

Tarayıcıda `http://localhost:8080` adresine gidin.

### 3. Mobil Uygulamayı Başlatın (Opsiyonel)

```bash
cd mobile
flutter pub get
flutter run
```

## 📦 Kurulum

### Gereksinimler

- **Backend**: Node.js (v14+), npm
- **Web**: Modern web tarayıcı
- **Mobile**: Flutter SDK (v3.10.4+)

### Adım Adım Kurulum

1. **Repository'yi klonlayın:**
```bash
git clone <repository-url>
cd FaceUpBackend
```

2. **Backend'i kurun:**
```bash
cd backend
npm install
```

3. **Mobil uygulamayı kurun:**
```bash
cd mobile
flutter pub get
```

4. **Backend URL'lerini yapılandırın:**
   - Web: `web/login.js` dosyasında `SERVER_URL`
   - Mobile: `mobile/lib/utils/constants.dart` dosyasında `serverUrl`

## 🎮 Kullanım

### Backend

Backend, Socket.io ile gerçek zamanlı iletişim sağlar. Detaylı dokümantasyon için [backend/README.md](backend/README.md) dosyasına bakın.

### Web

1. Backend'in çalıştığından emin olun
2. Web sunucusunu başlatın
3. Tarayıcıda uygulamayı açın
4. Ad-soyad girin ve başlayın

Detaylı kullanım için [web/README.md](web/README.md) dosyasına bakın.

### Mobile

1. Backend'in çalıştığından emin olun
2. Flutter uygulamasını çalıştırın
3. Ad-soyad girin ve başlayın

Detaylı kullanım için [mobile/README.md](mobile/README.md) dosyasına bakın.

## 🛠️ Teknolojiler

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **Socket.io**: Gerçek zamanlı iletişim
- **CORS**: Cross-origin resource sharing

### Web
- **HTML5**: Yapı
- **CSS3**: Stil
- **Vanilla JavaScript**: Mantık
- **WebRTC API**: Video/audio streaming
- **Socket.io Client**: Gerçek zamanlı iletişim

### Mobile
- **Flutter**: Cross-platform framework
- **Dart**: Programlama dili
- **flutter_webrtc**: WebRTC desteği
- **socket_io_client**: Socket.io client
- **provider**: State management
- **permission_handler**: İzin yönetimi

## 🔧 Yapılandırma

### Backend URL

**Geliştirme:**
- Web: `http://localhost:3000`
- Mobile (Android Emülatör): `http://10.0.2.2:3000`
- Mobile (iOS Simülatör): `http://localhost:3000`
- Mobile (Fiziksel Cihaz): `http://[BILGISAYAR_IP]:3000`

**Production:**
- Tüm platformlar: `https://api.yusufakin.xyz`

### Port Ayarları

- **Backend**: 3000 (varsayılan, `PORT` environment variable ile değiştirilebilir)
- **Web**: 8080 (HTTP server port'u)

## 🐛 Sorun Giderme

### Backend bağlantı hatası

- Backend'in çalıştığından emin olun
- Port'un kullanılabilir olduğundan emin olun
- Firewall ayarlarını kontrol edin

### WebRTC bağlantı hatası

- HTTPS veya localhost kullandığınızdan emin olun
- STUN server'larının erişilebilir olduğundan emin olun
- Kamera/mikrofon izinlerini kontrol edin

### Eşleşme yapılmıyor

- En az 2 kullanıcı olmalı
- Backend loglarını kontrol edin
- Health check endpoint'ini kontrol edin: `GET /health`

## 📚 Dokümantasyon

- [Backend Dokümantasyonu](backend/README.md)
- [Web Dokümantasyonu](web/README.md)
- [Mobile Dokümantasyonu](mobile/README.md)

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add some amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 Notlar

- **Güvenlik**: Production ortamında mutlaka HTTPS kullanın
- **Ölçeklenebilirlik**: Büyük ölçekli kullanım için Redis ve load balancer eklenebilir
- **Monitoring**: Production'da logging ve monitoring sistemleri eklenmelidir

## 📄 Lisans

ISC

## 👥 Geliştirici

Yusuf Akin

---

**Not**: Bu proje eğitim amaçlı geliştirilmiştir. Production kullanımı için ek güvenlik ve optimizasyon önlemleri alınmalıdır.

