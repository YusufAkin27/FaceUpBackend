import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/socket_provider.dart';
import '../utils/theme.dart';
import '../widgets/toast_message.dart';
import 'call_screen.dart';
import 'login_screen.dart';

class WaitingScreen extends StatefulWidget {
  const WaitingScreen({Key? key}) : super(key: key);

  @override
  State<WaitingScreen> createState() => _WaitingScreenState();
}

class _WaitingScreenState extends State<WaitingScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  bool _listenerSetup = false;

  @override
  void initState() {
    super.initState();
    
    // Loading spinner animasyonu
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat();
    
    // Listener'ı hemen ayarla (context kullanmadan, context'i sadece navigasyon için kullanacağız)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_listenerSetup) {
        _setupSocketListener();
        _listenerSetup = true;
      }
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _setupSocketListener() {
    final socketProvider = Provider.of<SocketProvider>(context, listen: false);
    
    print('WaitingScreen: Socket listener ayarlanıyor...');
    
    // Eşleşme event'i - önceki callback'i sakla ve yeni callback'i ekle
    final originalOnMatched = socketProvider.socketService.onMatched;
    socketProvider.socketService.onMatched = (room) {
      print('WaitingScreen: ✅ Eşleşme alındı! Room: ${room.roomId}, Partner: ${room.partner?.name}');
      print('WaitingScreen: Widget mounted mı? $mounted');
      
      // Önceki callback'i de çağır (SocketProvider'daki)
      originalOnMatched?.call(room);
      
      // Widget'ın mounted olduğundan emin ol ve context'i kontrol et
      if (mounted) {
        print('WaitingScreen: Navigator.pushReplacement çağrılıyor...');
        // Context'i kullanmadan önce bir frame bekle
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            final navigatorContext = context;
            if (navigatorContext.mounted) {
              Navigator.pushReplacement(
                navigatorContext,
                MaterialPageRoute(
                  builder: (context) => CallScreen(room: room),
                ),
              );
              print('WaitingScreen: ✅ CallScreen\'e geçiş yapıldı');
            } else {
              print('WaitingScreen: ❌ Context mounted değil');
            }
          } else {
            print('WaitingScreen: ❌ Widget mounted değil');
          }
        });
      } else {
        print('WaitingScreen: ❌ Widget mounted değil');
      }
    };

    // Hata event'i
    final originalOnError = socketProvider.socketService.onError;
    socketProvider.socketService.onError = (error) {
      originalOnError?.call(error);
      if (mounted) {
        ToastMessage.showError(context, error);
      }
    };

    // Disconnect event'i
    final originalOnDisconnect = socketProvider.socketService.onDisconnect;
    socketProvider.socketService.onDisconnect = () {
      originalOnDisconnect?.call();
      if (mounted) {
        ToastMessage.showError(context, 'Bağlantı kesildi');
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const LoginScreen()),
        );
      }
    };
  }

  void _handleCancel() {
    final socketProvider = Provider.of<SocketProvider>(context, listen: false);
    socketProvider.disconnect();
    
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isSmallScreen = screenSize.width < 400;
    
    return Scaffold(
      backgroundColor: AppTheme.loginBackground,
      body: SafeArea(
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.symmetric(
            horizontal: isSmallScreen ? 16 : 20,
            vertical: 20,
          ),
          child: Center(
            child: SingleChildScrollView(
              child: Container(
                constraints: const BoxConstraints(maxWidth: 450),
                decoration: AppTheme.cardDecoration,
                padding: EdgeInsets.all(isSmallScreen ? 40 : 48),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Loading Spinner
                    AnimatedBuilder(
                      animation: _animationController,
                      builder: (context, child) {
                        return Transform.rotate(
                          angle: _animationController.value * 2 * 3.14159,
                          child: Container(
                            width: isSmallScreen ? 50 : 60,
                            height: isSmallScreen ? 50 : 60,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: const Color(0xFFe5e5e5),
                                width: isSmallScreen ? 3 : 4,
                              ),
                            ),
                            child: CustomPaint(
                              painter: _SpinnerPainter(
                                progress: _animationController.value,
                                color: AppTheme.textPrimary,
                                strokeWidth: isSmallScreen ? 3 : 4,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                    SizedBox(height: isSmallScreen ? 20 : 24),
                    
                    // Title
                    Text(
                      'Eşleşme aranıyor...',
                      style: AppTheme.headingStyle.copyWith(
                        fontSize: isSmallScreen ? 22 : 24,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: isSmallScreen ? 10 : 12),
                    
                    // Description
                    Text(
                      'Size uygun bir eşleşme bulunuyor,\nlütfen bekleyin.',
                      style: AppTheme.captionStyle.copyWith(
                        fontSize: isSmallScreen ? 14 : 16,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: isSmallScreen ? 20 : 24),
                    
                    // Loading Dots
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(3, (index) {
                        return AnimatedBuilder(
                          animation: _animationController,
                          builder: (context, child) {
                            final delay = index * 0.32;
                            final animationValue = (_animationController.value + delay) % 1.0;
                            final scale = (animationValue < 0.4)
                                ? 0.5 + (animationValue / 0.4) * 0.5
                                : (animationValue < 0.8)
                                    ? 1.0 - ((animationValue - 0.4) / 0.4) * 0.5
                                    : 0.5;
                            final opacity = (animationValue < 0.4)
                                ? 0.5 + (animationValue / 0.4) * 0.5
                                : (animationValue < 0.8)
                                    ? 1.0 - ((animationValue - 0.4) / 0.4) * 0.5
                                    : 0.5;
                            
                            return Container(
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              width: isSmallScreen ? 8 : 10,
                              height: isSmallScreen ? 8 : 10,
                              decoration: BoxDecoration(
                                color: AppTheme.textPrimary.withOpacity(opacity),
                                shape: BoxShape.circle,
                              ),
                              transform: Matrix4.identity()..scale(scale),
                            );
                          },
                        );
                      }),
                    ),
                    SizedBox(height: isSmallScreen ? 24 : 32),
                    
                    // Cancel button
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: _handleCancel,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF333333),
                          side: const BorderSide(
                            color: Color(0xFFe0e0e0),
                            width: 1,
                          ),
                          padding: EdgeInsets.symmetric(
                            vertical: isSmallScreen ? 14 : 16,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: Text(
                          'İptal',
                          style: TextStyle(
                            fontSize: isSmallScreen ? 15 : 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SpinnerPainter extends CustomPainter {
  final double progress;
  final Color color;
  final double strokeWidth;

  _SpinnerPainter({
    required this.progress,
    required this.color,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromLTWH(0, 0, size.width, size.height);
    final startAngle = -3.14159 / 2;
    final sweepAngle = 3.14159 * 2 * progress;

    canvas.drawArc(rect, startAngle, sweepAngle, false, paint);
  }

  @override
  bool shouldRepaint(_SpinnerPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
