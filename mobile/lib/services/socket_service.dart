import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/user.dart';
import '../models/room.dart';
import '../models/message.dart';
import '../utils/constants.dart';

class SocketService {
  IO.Socket? _socket;
  String? _currentSocketId;
  
  // Callbacks
  Function(User)? onRegistered;
  Function(Room)? onMatched;
  Function(String)? onRoomJoined;
  Function(Map<String, dynamic>)? onOffer;
  Function(Map<String, dynamic>)? onAnswer;
  Function(Map<String, dynamic>)? onIceCandidate;
  Function(Message)? onMessage;
  Function(String)? onCallEnded;
  Function(String)? onError;
  Function()? onDisconnect;

  // Socket bağlantısı
  Future<bool> connect() async {
    try {
      _socket = IO.io(
        Constants.serverUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(1000)
            .setReconnectionDelayMax(5000)
            .setReconnectionAttempts(5)
            .setTimeout(10000)
            .build(),
      );

      _setupEventListeners();
      
      // Connection timeout kontrolü
      Future.delayed(const Duration(seconds: 10), () {
        if (_socket != null && !_socket!.connected) {
          print('Socket bağlantısı zaman aşımına uğradı');
          onError?.call('Backend\'e bağlanılamadı. Lütfen backend\'in çalıştığından emin olun.');
        }
      });
      
      return true;
    } catch (e) {
      print('Socket bağlantı hatası: $e');
      onError?.call('Socket bağlantı hatası: $e');
      return false;
    }
  }

  void _setupEventListeners() {
    _socket?.on('connect', (_) {
      _currentSocketId = _socket?.id;
      print('✅ Socket bağlandı: $_currentSocketId');
    });

    _socket?.on('connect_error', (error) {
      print('❌ Socket bağlantı hatası: $error');
      onError?.call('Backend\'e bağlanılamadı. Lütfen backend\'in çalıştığından emin olun.');
    });

    _socket?.on('disconnect', (reason) {
      print('Socket bağlantısı kesildi: $reason');
      if (reason != 'io client disconnect') {
        onDisconnect?.call();
      }
    });

    _socket?.on('registered', (data) {
      print('Kayıt başarılı: $data');
      // Backend'den gelen data'yı User objesine çevir
      final user = User.fromJson(data);
      onRegistered?.call(user);
    });

    _socket?.on('matched', (data) {
      print('📨 [SocketService] matched event alındı: $data');
      try {
        final room = Room.fromJson(data);
        print('📨 [SocketService] Room parse edildi: roomId=${room.roomId}, partner=${room.partner?.name}, isInitiator=${room.isInitiator}');
        print('📨 [SocketService] onMatched callback var mı? ${onMatched != null}');
        if (onMatched != null) {
          onMatched!.call(room);
          print('📨 [SocketService] onMatched callback çağrıldı');
        } else {
          print('❌ [SocketService] onMatched callback null!');
        }
      } catch (e) {
        print('❌ [SocketService] Room parse hatası: $e');
      }
    });

    _socket?.on('room-joined', (data) {
      print('Odaya katıldı: $data');
      // Socket ID'yi güncelle (join-room sonrası yeni socket ID olabilir)
      _currentSocketId = _socket?.id;
      print('✅ Socket ID güncellendi: $_currentSocketId');
      if (data['success'] == true) {
        onRoomJoined?.call(data['roomId']);
      }
    });

    _socket?.on('offer', (data) {
      print('Offer alındı: $data');
      onOffer?.call(data);
    });

    _socket?.on('answer', (data) {
      print('Answer alındı: $data');
      onAnswer?.call(data);
    });

    _socket?.on('ice-candidate', (data) {
      print('ICE candidate alındı: $data');
      onIceCandidate?.call(data);
    });

    _socket?.on('message', (data) {
      print('📨 Mesaj alındı: $data');
      print('📨 Mevcut socket ID: $_currentSocketId');
      // Socket ID null ise güncelle
      if (_currentSocketId == null) {
        _currentSocketId = _socket?.id;
        print('📨 Socket ID güncellendi: $_currentSocketId');
      }
      if (_currentSocketId != null) {
        final message = Message.fromJson(data, _currentSocketId!);
        print('📨 Mesaj parse edildi: text="${message.text}", sender="${message.sender}", isOwn=${message.isOwn}');
        onMessage?.call(message);
      } else {
        print('❌ Socket ID null, mesaj işlenemedi!');
      }
    });

    _socket?.on('call-ended', (data) {
      print('Görüşme sonlandı: $data');
      final reason = data['reason'] ?? 'unknown';
      onCallEnded?.call(reason);
    });

    _socket?.on('error', (data) {
      print('Hata: $data');
      final errorMessage = data['message'] ?? 'Bilinmeyen hata';
      onError?.call(errorMessage);
    });
  }

  // Kullanıcı kaydı
  void register(String name, {String surname = ''}) {
    _socket?.emit('register', {
      'name': name.trim(),
      'surname': surname.trim(),
    });
  }

  // Odaya katıl
  void joinRoom(String roomId, String name, {String surname = ''}) {
    _socket?.emit('join-room', {
      'roomId': roomId,
      'name': name.trim(),
      'surname': surname.trim(),
    });
  }

  // Offer gönder
  void sendOffer(String roomId, Map<String, dynamic> offer) {
    _socket?.emit('offer', {
      'roomId': roomId,
      'offer': offer,
    });
  }

  // Answer gönder
  void sendAnswer(String roomId, Map<String, dynamic> answer) {
    _socket?.emit('answer', {
      'roomId': roomId,
      'answer': answer,
    });
  }

  // ICE candidate gönder
  void sendIceCandidate(String roomId, Map<String, dynamic> candidate) {
    _socket?.emit('ice-candidate', {
      'roomId': roomId,
      'candidate': candidate,
    });
  }

  // Mesaj gönder
  void sendMessage(String roomId, String message) {
    _socket?.emit('message', {
      'roomId': roomId,
      'message': message.trim(),
    });
  }

  // Swipe (sonraki kişi)
  void swipe(String roomId) {
    _socket?.emit('swipe', {
      'roomId': roomId,
    });
  }

  // Görüşmeyi sonlandır
  void endCall(String roomId) {
    _socket?.emit('end-call', {
      'roomId': roomId,
    });
  }

  // Bağlantıyı kapat
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _currentSocketId = null;
  }

  // Socket ID'yi al
  String? get socketId => _currentSocketId;

  // Bağlı mı kontrol et
  bool get isConnected => _socket?.connected ?? false;
}

