import 'package:flutter/foundation.dart';
import '../services/socket_service.dart';
import '../models/user.dart';
import '../models/room.dart';
import '../models/message.dart';

class SocketProvider with ChangeNotifier {
  final SocketService _socketService = SocketService();
  
  User? _currentUser;
  Room? _currentRoom;
  List<Message> _messages = [];
  bool _isConnected = false;
  String? _error;

  // Getters
  User? get currentUser => _currentUser;
  Room? get currentRoom => _currentRoom;
  List<Message> get messages => _messages;
  bool get isConnected => _isConnected;
  String? get error => _error;

  SocketProvider() {
    _setupSocketListeners();
  }

  void _setupSocketListeners() {
    _socketService.onRegistered = (user) {
      _currentUser = user;
      notifyListeners();
    };

    _socketService.onMatched = (room) {
      _currentRoom = room;
      notifyListeners();
    };

    _socketService.onRoomJoined = (roomId) {
      if (_currentRoom != null) {
        _currentRoom = Room(
          roomId: roomId,
          partner: _currentRoom!.partner,
          isInitiator: _currentRoom!.isInitiator,
        );
        notifyListeners();
      }
    };

    _socketService.onMessage = (message) {
      print('📨 [SocketProvider] Mesaj alındı, listeye ekleniyor: ${message.text}');
      _messages.add(message);
      print('📨 [SocketProvider] Toplam mesaj sayısı: ${_messages.length}');
      notifyListeners();
      print('📨 [SocketProvider] Listeners bildirildi');
    };

    _socketService.onCallEnded = (reason) {
      _currentRoom = null;
      _messages.clear();
      notifyListeners();
    };

    _socketService.onError = (error) {
      _error = error;
      notifyListeners();
    };

    _socketService.onDisconnect = () {
      _isConnected = false;
      notifyListeners();
    };
  }

  Future<bool> connect() async {
    final connected = await _socketService.connect();
    _isConnected = connected;
    notifyListeners();
    return connected;
  }

  void register(String name, {String surname = ''}) {
    _socketService.register(name, surname: surname);
    _currentUser = User(name: name, surname: surname);
    notifyListeners();
  }

  void joinRoom(String roomId, String name, {String surname = ''}) {
    _socketService.joinRoom(roomId, name, surname: surname);
  }

  void sendMessage(String roomId, String message) {
    _socketService.sendMessage(roomId, message);
  }

  void swipe(String roomId) {
    _socketService.swipe(roomId);
  }

  void endCall(String roomId) {
    _socketService.endCall(roomId);
  }

  void disconnect() {
    _socketService.disconnect();
    _isConnected = false;
    _currentUser = null;
    _currentRoom = null;
    _messages.clear();
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Socket service'i dışarıya aç (WebRTC için)
  SocketService get socketService => _socketService;
}

