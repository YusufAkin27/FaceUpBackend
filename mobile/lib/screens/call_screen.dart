import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../providers/socket_provider.dart';
import '../providers/webrtc_provider.dart';
import '../models/room.dart';
import '../utils/theme.dart';
import '../widgets/video_view.dart';
import '../widgets/message_bubble.dart';
import '../widgets/control_button.dart';
import '../widgets/toast_message.dart';
import 'login_screen.dart';
import 'waiting_screen.dart';

class CallScreen extends StatefulWidget {
  final Room room;

  const CallScreen({
    Key? key,
    required this.room,
  }) : super(key: key);

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> with SingleTickerProviderStateMixin {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isInitialized = false;
  bool _isMenuOpen = false;
  bool _isMessageInputVisible = false;
  bool _roomJoined = false;
  Completer<bool>? _roomJoinedCompleter;
  late AnimationController _menuAnimationController;
  late Animation<double> _menuAnimation;

  @override
  void initState() {
    super.initState();
    _menuAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _menuAnimation = CurvedAnimation(
      parent: _menuAnimationController,
      curve: Curves.easeInOut,
    );
    _initializeCall();
  }

  Future<void> _initializeCall() async {
    try {
      final socketProvider = Provider.of<SocketProvider>(context, listen: false);
      final webrtcProvider = Provider.of<WebRTCProvider>(context, listen: false);
      final currentUser = socketProvider.currentUser;

      if (currentUser == null) {
        ToastMessage.showError(context, 'Kullanıcı bilgisi bulunamadı');
        Navigator.pop(context);
        return;
      }

      // Socket bağlantısının hazır olduğundan emin ol
      if (!socketProvider.socketService.isConnected) {
        ToastMessage.showError(context, 'Socket bağlantısı yok');
        Navigator.pop(context);
        return;
      }

      // Socket event listeners'ı setup et (hata dinlemek için önce)
      _setupSocketListeners(socketProvider, webrtcProvider);

      // Room'a join işlemini retry ile yap
      bool joined = false;
      int retryCount = 0;
      const maxRetries = 3;
      
      while (!joined && retryCount < maxRetries && mounted) {
        if (retryCount > 0) {
          print('Room\'a join retry: $retryCount/$maxRetries');
          await Future.delayed(const Duration(milliseconds: 500));
        }
        
        // room-joined event'ini bekle (5 saniye timeout)
        _roomJoinedCompleter = Completer<bool>();
        
        // onRoomJoined callback'ini setup et
        socketProvider.socketService.onRoomJoined = (roomId) {
          print('Room\'a join olundu: $roomId');
          _roomJoined = true;
          if (_roomJoinedCompleter != null && !_roomJoinedCompleter!.isCompleted) {
            _roomJoinedCompleter!.complete(true);
          }
        };

        // Socket room'a join - room-joined event'ini bekleyeceğiz
        socketProvider.joinRoom(
          widget.room.roomId,
          currentUser.name,
          surname: currentUser.surname,
        );

        // Timeout kontrolü
        Future.delayed(const Duration(seconds: 5), () {
          if (_roomJoinedCompleter != null && !_roomJoinedCompleter!.isCompleted) {
            _roomJoinedCompleter!.complete(false);
          }
        });

        final result = await _roomJoinedCompleter!.future;
        if (result && mounted) {
          joined = true;
        } else {
          retryCount++;
          if (retryCount < maxRetries && mounted) {
            print('Room\'a join başarısız, tekrar denenecek...');
          }
        }
      }

      if (!joined || !mounted) {
        ToastMessage.showError(context, 'Odaya katılamadı, lütfen tekrar deneyin');
        Navigator.pop(context);
        return;
      }

      // WebRTC initialize
      final initialized = await webrtcProvider.initialize();
      if (!initialized) {
        ToastMessage.showError(context, 'Kamera ve mikrofon erişilemedi');
        Navigator.pop(context);
        return;
      }

      // ICE candidate callback'ini setup et (hem offer hem answer için)
      webrtcProvider.onIceCandidateCallback = (RTCIceCandidate candidate) {
        if (!mounted) return;
        // Candidate null kontrolü
        if (candidate.candidate != null && candidate.candidate!.isNotEmpty) {
          print('ICE candidate gönderiliyor: ${candidate.candidate}');
          socketProvider.socketService.sendIceCandidate(
            widget.room.roomId,
            {
              'candidate': candidate.candidate,
              'sdpMid': candidate.sdpMid,
              'sdpMLineIndex': candidate.sdpMLineIndex,
            },
          );
        } else {
          print('ICE candidate toplama tamamlandı');
        }
      };

      // WebRTC initialize edildiyse offer/answer oluştur
      if (widget.room.isInitiator) {
        print('Initiator olarak offer oluşturuluyor...');
        final offer = await webrtcProvider.createOffer();
        if (offer != null && mounted) {
          print('Offer oluşturuldu, gönderiliyor...');
          socketProvider.socketService.sendOffer(
            widget.room.roomId,
            {
              'sdp': offer.sdp,
              'type': offer.type,
            },
          );
          print('✅ Offer gönderildi');
        }
      } else {
        print('Initiator değil, offer bekleniyor...');
      }

      if (mounted) {
        setState(() {
          _isInitialized = true;
        });
      }
    } catch (e) {
      print('Initialize call hatası: $e');
      if (mounted) {
        ToastMessage.showError(context, 'Bağlantı hatası: $e');
        Navigator.pop(context);
      }
    }
  }

  void _setupSocketListeners(SocketProvider socketProvider, WebRTCProvider webrtcProvider) {
    // Offer alındığında answer oluştur
    socketProvider.socketService.onOffer = (data) async {
      if (!mounted) return;
      try {
        print('📥 Offer alındı, answer oluşturuluyor...');
        final offer = await webrtcProvider.createAnswer(data['offer']);
        if (offer != null && mounted) {
          print('Answer oluşturuldu, gönderiliyor...');
          socketProvider.socketService.sendAnswer(
            widget.room.roomId,
            {
              'sdp': offer.sdp,
              'type': offer.type,
            },
          );
          print('✅ Answer gönderildi');
        }
      } catch (e) {
        print('Offer işleme hatası: $e');
        if (mounted) {
          ToastMessage.showError(context, 'Bağlantı hatası: $e');
        }
      }
    };

    // Room joined event - _initializeCall'da zaten setup edildi, burada override etme

    // Answer alındığında set et
    socketProvider.socketService.onAnswer = (data) async {
      if (!mounted) return;
      try {
        await webrtcProvider.setRemoteAnswer(data['answer']);
      } catch (e) {
        print('Answer set etme hatası: $e');
        if (mounted) {
          ToastMessage.showError(context, 'Bağlantı hatası: $e');
        }
      }
    };

    // ICE candidate alındığında ekle
    socketProvider.socketService.onIceCandidate = (data) async {
      if (!mounted) return;
      try {
        // Candidate null kontrolü
        if (data['candidate'] != null) {
          await webrtcProvider.addIceCandidate(data['candidate']);
        }
      } catch (e) {
        print('ICE candidate ekleme hatası: $e');
      }
    };

    // Mesaj alındığında scroll - önceki callback'i sakla ve çağır
    final originalOnMessage = socketProvider.socketService.onMessage;
    socketProvider.socketService.onMessage = (message) {
      print('CallScreen: Mesaj alındı, scroll yapılıyor...');
      // Önceki callback'i çağır (SocketProvider'daki - mesajı listeye ekler)
      originalOnMessage?.call(message);
      
      // Sonra scroll yap
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    };

    // Call ended
    socketProvider.socketService.onCallEnded = (reason) {
      if (mounted) {
        if (reason == 'swipe') {
          // Swipe durumunda bekleme ekranına dön
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const WaitingScreen()),
          );
        } else {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const LoginScreen()),
          );
        }
      }
    };

    // Error
    socketProvider.socketService.onError = (error) {
      if (mounted) {
        ToastMessage.showError(context, error);
        // Kritik hatalarda login'e dön
        if (error.contains('Oda bulunamadı') || 
            error.contains('Geçersiz oda') || 
            error.contains('Oda dolu')) {
          Future.delayed(const Duration(seconds: 2), () {
            if (mounted) {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => const LoginScreen()),
              );
            }
          });
        }
      }
    };

    // Disconnect
    socketProvider.socketService.onDisconnect = () {
      if (mounted) {
        ToastMessage.showError(context, 'Bağlantı kesildi, yeni eşleşme aranıyor...');
        Future.delayed(const Duration(seconds: 1), () {
          if (mounted) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (context) => const WaitingScreen()),
            );
          }
        });
      }
    };
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    final socketProvider = Provider.of<SocketProvider>(context, listen: false);
    socketProvider.sendMessage(widget.room.roomId, text);
    _messageController.clear();
    
    // Mesaj gönderildikten sonra input'u kapat
    setState(() {
      _isMessageInputVisible = false;
    });
  }

  void _toggleMenu() {
    setState(() {
      _isMenuOpen = !_isMenuOpen;
      if (_isMenuOpen) {
        _menuAnimationController.forward();
      } else {
        _menuAnimationController.reverse();
      }
    });
  }

  void _toggleMessageInput() {
    setState(() {
      _isMessageInputVisible = !_isMessageInputVisible;
      if (_isMessageInputVisible) {
        // Menüyü kapat
        _isMenuOpen = false;
        _menuAnimationController.reverse();
      }
    });
  }

  void _handleSwipe() async {
    final socketProvider = Provider.of<SocketProvider>(context, listen: false);
    final webrtcProvider = Provider.of<WebRTCProvider>(context, listen: false);
    
    // WebRTC kaynaklarını temizle (Provider dispose edilmeden)
    await webrtcProvider.cleanup();
    
    // Swipe event'ini gönder
    socketProvider.swipe(widget.room.roomId);
    
    // Bekleme ekranına dön
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const WaitingScreen()),
      );
    }
  }

  void _handleEndCall() async {
    final socketProvider = Provider.of<SocketProvider>(context, listen: false);
    final webrtcProvider = Provider.of<WebRTCProvider>(context, listen: false);
    
    socketProvider.endCall(widget.room.roomId);
    await webrtcProvider.cleanup();
    
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  @override
  void dispose() {
    // Cleanup - Provider'ı dispose etme, sadece callback'i temizle
    try {
      final webrtcProvider = Provider.of<WebRTCProvider>(context, listen: false);
      webrtcProvider.onIceCandidateCallback = null;
    } catch (e) {
      // Provider zaten dispose edilmiş olabilir
      print('Provider dispose hatası (normal olabilir): $e');
    }
    
    _messageController.dispose();
    _scrollController.dispose();
    _menuAnimationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isSmallScreen = screenSize.width < 400;
    
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: GestureDetector(
          onHorizontalDragEnd: (details) {
            // Sağa kaydırma (yeni eşleşme)
            if (details.primaryVelocity != null && details.primaryVelocity! > 500) {
              _handleSwipe();
            }
            // Sola kaydırma (yeni eşleşme)
            else if (details.primaryVelocity != null && details.primaryVelocity! < -500) {
              _handleSwipe();
            }
          },
          child: Stack(
            children: [
              // Remote Video (Ana ekran)
              Consumer<WebRTCProvider>(
                builder: (context, webrtcProvider, child) {
                  if (webrtcProvider.remoteRenderer == null) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const CircularProgressIndicator(
                            color: Colors.white,
                          ),
                          const SizedBox(height: 20),
                          Text(
                            'Bağlantı kuruluyor...',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                            ),
                          ),
                          if (webrtcProvider.error != null) ...[
                            const SizedBox(height: 10),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 40),
                              child: Text(
                                webrtcProvider.error!,
                                style: TextStyle(
                                  color: Colors.red.shade300,
                                  fontSize: 12,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  }
                  
                  // Remote stream kontrolü
                  final hasRemoteStream = webrtcProvider.remoteStream != null && 
                                         webrtcProvider.remoteStream!.getVideoTracks().isNotEmpty;
                  
                  if (!hasRemoteStream) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.videocam_off,
                            size: 64,
                            color: Colors.white.withOpacity(0.5),
                          ),
                          const SizedBox(height: 20),
                          Text(
                            'Görüntü bekleniyor...',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'Karşı tarafın görüntüsü henüz gelmedi',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.7),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    );
                  }
                  
                  return VideoView(
                    renderer: webrtcProvider.remoteRenderer!,
                    isLocal: false,
                    mirror: true,
                  );
                },
              ),

            // Local Video (Sağ üst köşe)
            Positioned(
              top: isSmallScreen ? 50 : 60,
              right: isSmallScreen ? 12 : 20,
              child: Consumer<WebRTCProvider>(
                builder: (context, webrtcProvider, child) {
                  if (webrtcProvider.localRenderer == null) {
                    return const SizedBox.shrink();
                  }
                  return Container(
                    width: isSmallScreen ? 120 : 150,
                    height: isSmallScreen ? 90 : 112,
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: Colors.white.withOpacity(0.3),
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.8),
                          blurRadius: 20,
                          spreadRadius: 2,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: VideoView(
                        renderer: webrtcProvider.localRenderer!,
                        isLocal: true,
                        mirror: true,
                      ),
                    ),
                  );
                },
              ),
            ),

            // Üst Bar
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: ClipRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: isSmallScreen ? 12 : 20,
                      vertical: isSmallScreen ? 10 : 12,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Çıkış butonu
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.2),
                            ),
                          ),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: _handleEndCall,
                              borderRadius: BorderRadius.circular(20),
                              child: Padding(
                                padding: EdgeInsets.all(isSmallScreen ? 8 : 10),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.logout,
                                      color: Colors.white,
                                      size: isSmallScreen ? 16 : 18,
                                    ),
                                    if (!isSmallScreen) ...[
                                      const SizedBox(width: 6),
                                      Text(
                                        'Çıkış',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                        // Partner adı ve bağlantı durumu
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                margin: const EdgeInsets.symmetric(horizontal: 12),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.black.withOpacity(0.4),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: Colors.white.withOpacity(0.1),
                                  ),
                                ),
                                child: Text(
                                  widget.room.partner?.displayName ?? 'Eşleşme yapılıyor...',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: isSmallScreen ? 14 : 16,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  textAlign: TextAlign.center,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              // Bağlantı durumu göstergesi
                              Consumer<WebRTCProvider>(
                                builder: (context, webrtcProvider, child) {
                                  if (webrtcProvider.connectionState != null) {
                                    final state = webrtcProvider.connectionState!;
                                    Color statusColor;
                                    String statusText;
                                    
                                    if (state.contains('Connected')) {
                                      statusColor = Colors.green;
                                      statusText = 'Bağlandı';
                                    } else if (state.contains('Connecting')) {
                                      statusColor = Colors.orange;
                                      statusText = 'Bağlanıyor...';
                                    } else if (state.contains('Failed') || state.contains('Disconnected')) {
                                      statusColor = Colors.red;
                                      statusText = 'Bağlantı hatası';
                                    } else {
                                      statusColor = Colors.grey;
                                      statusText = 'Bekleniyor...';
                                    }
                                    
                                    return Container(
                                      margin: const EdgeInsets.only(top: 4),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: statusColor.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: statusColor.withOpacity(0.5),
                                          width: 1,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Container(
                                            width: 6,
                                            height: 6,
                                            decoration: BoxDecoration(
                                              color: statusColor,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          Text(
                                            statusText,
                                            style: TextStyle(
                                              color: statusColor,
                                              fontSize: 10,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }
                                  return const SizedBox.shrink();
                                },
                              ),
                            ],
                          ),
                        ),
                        SizedBox(width: isSmallScreen ? 40 : 48),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Mesajlar Overlay
            Positioned(
              bottom: isSmallScreen ? 120 : 140,
              left: 0,
              right: 0,
              child: Consumer<SocketProvider>(
                builder: (context, socketProvider, child) {
                  if (socketProvider.messages.isEmpty) {
                    return const SizedBox.shrink();
                  }
                  return Container(
                    constraints: BoxConstraints(
                      maxHeight: isSmallScreen ? 150 : 180,
                    ),
                    padding: EdgeInsets.symmetric(
                      horizontal: isSmallScreen ? 12 : 20,
                      vertical: 8,
                    ),
                    child: ListView.builder(
                      controller: _scrollController,
                      shrinkWrap: true,
                      itemCount: socketProvider.messages.length,
                      itemBuilder: (context, index) {
                        final message = socketProvider.messages[index];
                        return MessageBubble(
                          text: message.text,
                          senderName: message.senderName,
                          isOwn: message.isOwn,
                        );
                      },
                    ),
                  );
                },
              ),
            ),

            // Mesaj Input Overlay
            AnimatedPositioned(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
              bottom: _isMessageInputVisible 
                  ? (isSmallScreen ? 80 : 90)
                  : (isSmallScreen ? -100 : -120),
              left: 0,
              right: 0,
              child: ClipRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: isSmallScreen ? 12 : 20,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.9),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(
                                color: Colors.white.withOpacity(0.3),
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.2),
                                  blurRadius: 12,
                                ),
                              ],
                            ),
                            child: TextField(
                              controller: _messageController,
                              style: TextStyle(
                                color: Colors.black87,
                                fontSize: isSmallScreen ? 14 : 16,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Mesaj yazın...',
                                hintStyle: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontSize: isSmallScreen ? 14 : 16,
                                ),
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: isSmallScreen ? 14 : 16,
                                  vertical: isSmallScreen ? 10 : 12,
                                ),
                                border: InputBorder.none,
                              ),
                              maxLength: 500,
                              onSubmitted: (_) => _sendMessage(),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        ControlButton(
                          icon: Icons.send,
                          onPressed: _sendMessage,
                          backgroundColor: Colors.black87,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Kontrol Butonları
            Positioned(
              bottom: isSmallScreen ? 12 : 20,
              left: 0,
              right: 0,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Menü Toggle Butonu
                  AnimatedRotation(
                    turns: _isMenuOpen ? 0.25 : 0.0,
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOut,
                    child: ControlButton(
                      icon: _isMenuOpen ? Icons.close : Icons.menu,
                      onPressed: _toggleMenu,
                      backgroundColor: Colors.white.withOpacity(0.25),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Gizli Kontrol Butonları
                  SizeTransition(
                    sizeFactor: _menuAnimation,
                    axisAlignment: -1.0,
                    child: FadeTransition(
                      opacity: _menuAnimation,
                      child: Container(
                        padding: EdgeInsets.symmetric(
                          horizontal: isSmallScreen ? 12 : 20,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Consumer<WebRTCProvider>(
                              builder: (context, webrtcProvider, child) {
                                return ControlButton(
                                  icon: Icons.videocam,
                                  onPressed: () => webrtcProvider.toggleVideo(),
                                  isActive: webrtcProvider.isVideoEnabled,
                                );
                              },
                            ),
                            SizedBox(width: isSmallScreen ? 12 : 16),
                            Consumer<WebRTCProvider>(
                              builder: (context, webrtcProvider, child) {
                                return ControlButton(
                                  icon: Icons.mic,
                                  onPressed: () => webrtcProvider.toggleAudio(),
                                  isActive: webrtcProvider.isAudioEnabled,
                                );
                              },
                            ),
                            SizedBox(width: isSmallScreen ? 12 : 16),
                            ControlButton(
                              icon: Icons.message,
                              onPressed: _toggleMessageInput,
                              backgroundColor: AppTheme.controlButtonMessage,
                            ),
                            SizedBox(width: isSmallScreen ? 12 : 16),
                            ControlButton(
                              icon: Icons.swipe_up,
                              onPressed: _handleSwipe,
                            ),
                            SizedBox(width: isSmallScreen ? 12 : 16),
                            ControlButton(
                              icon: Icons.call_end,
                              onPressed: _handleEndCall,
                              backgroundColor: AppTheme.controlButtonEndCall,
                            ),
                          ],
                        ),
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
    );
  }
}
