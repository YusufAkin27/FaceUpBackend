import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/socket_provider.dart';
import '../services/permissions_service.dart';
import '../utils/theme.dart';
import '../widgets/toast_message.dart';
import 'waiting_screen.dart';
import 'call_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  // Ad soyadı ayır (ilk kelime ad, geri kalanı soyad - soyad opsiyonel)
  Map<String, String> _parseFullName(String fullName) {
    final trimmed = fullName.trim();
    if (trimmed.isEmpty) {
      return {'name': '', 'surname': ''};
    }
    
    final parts = trimmed.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.length == 1) {
      // Sadece bir kelime varsa, sadece ad olarak kullan, soyad boş
      return {'name': parts[0], 'surname': ''};
    }
    
    // İlk kelime ad, geri kalanı soyad
    final name = parts[0];
    final surname = parts.sublist(1).join(' ');
    return {'name': name, 'surname': surname};
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final fullName = _nameController.text.trim();
    if (fullName.isEmpty) {
      ToastMessage.showError(context, 'Lütfen adınızı girin');
      return;
    }

    final nameData = _parseFullName(fullName);
    if (nameData['name']!.isEmpty) {
      ToastMessage.showError(context, 'Lütfen geçerli bir ad girin');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // İzinleri kontrol et ve iste
      final permissions = await PermissionsService.requestMediaPermissions();
      if (!permissions) {
        final permanentlyDenied = await PermissionsService.arePermissionsPermanentlyDenied();
        if (permanentlyDenied) {
          ToastMessage.showError(
            context,
            'Kamera ve mikrofon izinleri ayarlardan verilmelidir.',
          );
        } else {
          ToastMessage.showError(
            context,
            'Kamera ve mikrofon erişimi reddedildi. Lütfen izin verin.',
          );
        }
        setState(() {
          _isLoading = false;
        });
        return;
      }

      // Socket bağlantısı
      final socketProvider = Provider.of<SocketProvider>(context, listen: false);
      final connected = await socketProvider.connect();
      
      if (!connected) {
        ToastMessage.showError(
          context,
          'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.',
        );
        setState(() {
          _isLoading = false;
        });
        return;
      }

      // Socket listener'ı kur (registered ve matched event'leri için)
      socketProvider.socketService.onRegistered = (data) {
        if (mounted) {
          // Kayıt başarılı olduğunda bekleme ekranına geç
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const WaitingScreen()),
          );
        }
      };
      
      // Eğer matched event'i gelirse (bekleme ekranına geçmeden önce), direkt CallScreen'e git
      final originalOnMatched = socketProvider.socketService.onMatched;
      socketProvider.socketService.onMatched = (room) {
        print('LoginScreen: Matched event alındı, CallScreen\'e geçiliyor...');
        originalOnMatched?.call(room);
        if (mounted) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(
                  builder: (context) => CallScreen(room: room),
                ),
              );
            }
          });
        }
      };

      // Kullanıcı kaydı
      socketProvider.register(
        nameData['name']!,
        surname: nameData['surname']!,
      );
    } catch (e) {
      ToastMessage.showError(
        context,
        'Bir hata oluştu: $e',
      );
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isSmallScreen = screenSize.width < 400;
    final isVerySmallScreen = screenSize.width < 360;
    
    return Scaffold(
      backgroundColor: AppTheme.loginBackground,
      body: SafeArea(
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppTheme.loginBackground,
                AppTheme.loginBackground.withOpacity(0.95),
              ],
            ),
          ),
          child: Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: isSmallScreen ? 16 : 24,
                vertical: isVerySmallScreen ? 16 : 20,
              ),
              child: Container(
                constraints: const BoxConstraints(maxWidth: 450),
                decoration: AppTheme.cardDecoration.copyWith(
                  borderRadius: BorderRadius.circular(24),
                ),
                padding: EdgeInsets.all(isSmallScreen ? 28 : 40),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Logo
                      Text(
                        'FaceUp',
                        style: AppTheme.headingStyle.copyWith(
                          fontSize: isSmallScreen ? 36 : 42,
                          letterSpacing: -1,
                        ),
                      ),
                      SizedBox(height: isSmallScreen ? 6 : 8),
                      Text(
                        'Yeni insanlarla tanış, görüntülü görüş',
                        style: AppTheme.captionStyle.copyWith(
                          fontSize: isSmallScreen ? 13 : 14,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      SizedBox(height: isSmallScreen ? 28 : 32),
                      
                      // Ad input
                      TextFormField(
                        controller: _nameController,
                        decoration: InputDecoration(
                          labelText: 'Adınız',
                          hintText: 'Adınızı girin',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Colors.blue, width: 2),
                          ),
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: isSmallScreen ? 16 : 18,
                            vertical: isSmallScreen ? 16 : 18,
                          ),
                        ),
                        style: TextStyle(
                          fontSize: isSmallScreen ? 15 : 16,
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Lütfen adınızı girin';
                          }
                          return null;
                        },
                        textCapitalization: TextCapitalization.words,
                      ),
                      SizedBox(height: isSmallScreen ? 20 : 24),
                      
                      // Submit button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleSubmit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(
                              vertical: isSmallScreen ? 16 : 18,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 2,
                          ),
                          child: _isLoading
                              ? SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : Text(
                                  'Başla',
                                  style: TextStyle(
                                    fontSize: isSmallScreen ? 16 : 17,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                      ),
                      SizedBox(height: isSmallScreen ? 20 : 24),
                      
                      // Info text
                      Container(
                        padding: EdgeInsets.all(isSmallScreen ? 12 : 14),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.blue.shade100,
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.info_outline,
                              color: Colors.blue.shade700,
                              size: isSmallScreen ? 18 : 20,
                            ),
                            SizedBox(width: isSmallScreen ? 10 : 12),
                            Expanded(
                              child: Text(
                                'Görüntülü görüşmeye başlamak için kamera ve mikrofon erişimine izin vermeniz gerekecektir.',
                                style: TextStyle(
                                  fontSize: isSmallScreen ? 12 : 13,
                                  color: Colors.blue.shade900,
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
