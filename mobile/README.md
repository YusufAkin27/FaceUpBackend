# FaceUp Mobile

Flutter ile geliştirilmiş görüntülü görüşme mobil uygulaması. WebRTC ile gerçek zamanlı video görüşme ve mesajlaşma özellikleri sunar.

## 📋 İçindekiler

- [Özellikler](#özellikler)
- [Gereksinimler](#gereksinimler)
- [Kurulum](#kurulum)
- [Kullanım](#kullanım)
- [Yapılandırma](#yapılandırma)
- [Build ve Deploy](#build-ve-deploy)
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
- ✅ Modern ve kullanıcı dostu arayüz
- ✅ Android ve iOS desteği

## 🔧 Gereksinimler

- Flutter SDK (v3.10.4 veya üzeri)
- Dart SDK
- Android Studio (Android için)
- Xcode (iOS için - sadece macOS)
- Backend sunucusunun çalışıyor olması

## 📦 Kurulum

1. Flutter'ın yüklü olduğundan emin olun:
```bash
flutter --version
```

2. Proje dizinine gidin:
```bash
cd mobile
```

3. Bağımlılıkları yükleyin:
```bash
flutter pub get
```

## 🚀 Kullanım

### Geliştirme Modu

#### Android

1. Android emülatörü başlatın veya fiziksel cihazı bağlayın
2. Uygulamayı çalıştırın:
```bash
flutter run
```

#### iOS (sadece macOS)

1. iOS simülatörü başlatın veya fiziksel cihazı bağlayın
2. Uygulamayı çalıştırın:
```bash
flutter run
```

### Hot Reload

Kod değişikliklerini anında görmek için:
- `r` tuşuna basın (hot reload)
- `R` tuşuna basın (hot restart)

### Debug Mode

Debug modunda çalıştırma:
```bash
flutter run --debug
```

### Release Mode

Release modunda çalıştırma:
```bash
flutter run --release
```

## ⚙️ Yapılandırma

### Backend URL Ayarlama

Backend URL'ini değiştirmek için `lib/utils/constants.dart` dosyasını düzenleyin:

```dart
static const String serverUrl = 'https://api.yusufakin.xyz';
```

**Geliştirme için:**
- Android Emülatör: `http://10.0.2.2:3000`
- iOS Simülatör: `http://localhost:3000`
- Fiziksel Cihaz: `http://[BILGISAYAR_IP]:3000`

### İzinler

Uygulama aşağıdaki izinleri gerektirir:

**Android** (`android/app/src/main/AndroidManifest.xml`):
- `android.permission.CAMERA`
- `android.permission.RECORD_AUDIO`
- `android.permission.INTERNET`

**iOS** (`ios/Runner/Info.plist`):
- `NSCameraUsageDescription`
- `NSMicrophoneUsageDescription`

## 📱 Build ve Deploy

### Android APK Oluşturma

Debug APK:
```bash
flutter build apk --debug
```

Release APK:
```bash
flutter build apk --release
```

App Bundle (Google Play için):
```bash
flutter build appbundle --release
```

### iOS Build

Release build:
```bash
flutter build ios --release
```

App Store için:
```bash
flutter build ipa
```

## 🏗️ Proje Yapısı

```
mobile/
├── lib/
│   ├── main.dart                 # Ana uygulama giriş noktası
│   ├── models/                   # Veri modelleri
│   │   ├── message.dart
│   │   ├── room.dart
│   │   └── user.dart
│   ├── providers/                # State management
│   │   ├── socket_provider.dart
│   │   └── webrtc_provider.dart
│   ├── screens/                  # Ekranlar
│   │   ├── login_screen.dart
│   │   ├── waiting_screen.dart
│   │   └── call_screen.dart
│   ├── services/                 # Servisler
│   │   ├── socket_service.dart
│   │   ├── webrtc_service.dart
│   │   └── permissions_service.dart
│   ├── utils/                    # Yardımcı dosyalar
│   │   ├── constants.dart
│   │   └── theme.dart
│   └── widgets/                  # Widget'lar
│       ├── control_button.dart
│       ├── message_bubble.dart
│       ├── toast_message.dart
│       └── video_view.dart
├── android/                      # Android native kod
├── ios/                          # iOS native kod
└── pubspec.yaml                  # Bağımlılıklar
```

## 📚 Kullanılan Paketler

- `socket_io_client: ^2.0.3` - Socket.io client
- `flutter_webrtc: ^0.12.0` - WebRTC desteği
- `permission_handler: ^11.0.0` - İzin yönetimi
- `provider: ^6.0.5` - State management

## 🐛 Sorun Giderme

### Bağımlılık hataları

```bash
flutter clean
flutter pub get
```

### Android build hatası

```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter run
```

### iOS build hatası

```bash
cd ios
pod deintegrate
pod install
cd ..
flutter clean
flutter pub get
flutter run
```

### Kamera/mikrofon izni verilmiyor

- Cihaz ayarlarından uygulama izinlerini kontrol edin
- Uygulamayı yeniden başlatın
- `permission_handler` paketinin güncel olduğundan emin olun

### Backend bağlantı hatası

- Backend'in çalıştığından emin olun
- `constants.dart` dosyasındaki URL'yi kontrol edin
- Emülatör için doğru IP adresini kullandığınızdan emin olun
- Firewall ayarlarını kontrol edin

### WebRTC bağlantı hatası

- STUN server'larının erişilebilir olduğundan emin olun
- İnternet bağlantınızı kontrol edin
- NAT/Firewall ayarlarını kontrol edin

## 📝 Notlar

- İlk çalıştırmada Flutter bağımlılıklarını indirecektir (internet gerekli)
- Android emülatör için backend URL: `http://10.0.2.2:3000`
- iOS simülatör için backend URL: `http://localhost:3000`
- Fiziksel cihaz için bilgisayarınızın IP adresini kullanın
- WebRTC için cihazın kamera ve mikrofon erişimi olmalıdır

## 📄 Lisans

ISC
