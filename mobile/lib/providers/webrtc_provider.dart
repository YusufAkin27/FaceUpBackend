import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../services/webrtc_service.dart';

class WebRTCProvider with ChangeNotifier {
  final WebRTCService _webrtcService = WebRTCService();
  
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  RTCVideoRenderer? _localRenderer;
  RTCVideoRenderer? _remoteRenderer;
  bool _isVideoEnabled = true;
  bool _isAudioEnabled = true;
  String? _error;
  String? _connectionState;

  // Getters
  MediaStream? get localStream => _localStream;
  MediaStream? get remoteStream => _remoteStream;
  RTCVideoRenderer? get localRenderer => _localRenderer;
  RTCVideoRenderer? get remoteRenderer => _remoteRenderer;
  bool get isVideoEnabled => _isVideoEnabled;
  bool get isAudioEnabled => _isAudioEnabled;
  String? get error => _error;
  String? get connectionState => _connectionState;

  WebRTCProvider() {
    _setupWebRTCListeners();
    _initializeRenderers();
  }

  // ICE candidate callback - call screen'de set edilecek
  Function(RTCIceCandidate)? onIceCandidateCallback;

  void _setupWebRTCListeners() {
    _webrtcService.onLocalStream = (stream) {
      _localStream = stream;
      if (_localRenderer != null) {
        _localRenderer!.srcObject = stream;
      }
      notifyListeners();
    };

    _webrtcService.onRemoteStream = (stream) {
      _remoteStream = stream;
      if (_remoteRenderer != null) {
        _remoteRenderer!.srcObject = stream;
      }
      notifyListeners();
    };

    _webrtcService.onIceCandidate = (candidate) {
      // ICE candidate oluşturulduğunda callback'i çağır
      onIceCandidateCallback?.call(candidate);
    };

    _webrtcService.onError = (error) {
      _error = error;
      notifyListeners();
    };

    _webrtcService.onConnectionState = (state) {
      _connectionState = state;
      print('WebRTC Connection State: $state');
      notifyListeners();
    };
  }

  Future<void> _initializeRenderers() async {
    _localRenderer = RTCVideoRenderer();
    _remoteRenderer = RTCVideoRenderer();
    await _localRenderer!.initialize();
    await _remoteRenderer!.initialize();
  }

  Future<bool> initialize() async {
    final peerConnectionCreated = await _webrtcService.initializePeerConnection();
    if (!peerConnectionCreated) return false;

    final localStreamObtained = await _webrtcService.getLocalStream();
    if (localStreamObtained && _localStream != null && _localRenderer != null) {
      // Local stream'i renderer'a ata
      _localRenderer!.srcObject = _localStream;
      notifyListeners();
    }
    return localStreamObtained;
  }

  Future<RTCSessionDescription?> createOffer() async {
    return await _webrtcService.createOffer();
  }

  Future<RTCSessionDescription?> createAnswer(Map<String, dynamic> offerData) async {
    return await _webrtcService.createAnswer(
      RTCSessionDescription(offerData['sdp'], offerData['type']),
    );
  }

  Future<bool> setRemoteOffer(Map<String, dynamic> offerData) async {
    return await _webrtcService.setRemoteOffer(offerData);
  }

  Future<bool> setRemoteAnswer(Map<String, dynamic> answerData) async {
    return await _webrtcService.setRemoteAnswer(answerData);
  }

  Future<bool> addIceCandidate(Map<String, dynamic> candidateData) async {
    return await _webrtcService.addIceCandidate(candidateData);
  }

  Future<void> toggleVideo() async {
    if (_isDisposed) return;
    _isVideoEnabled = !_isVideoEnabled;
    await _webrtcService.toggleVideo(_isVideoEnabled);
    if (!_isDisposed) notifyListeners();
  }

  Future<void> toggleAudio() async {
    if (_isDisposed) return;
    _isAudioEnabled = !_isAudioEnabled;
    await _webrtcService.toggleAudio(_isAudioEnabled);
    if (!_isDisposed) notifyListeners();
  }

  void clearError() {
    if (_isDisposed) return;
    _error = null;
    notifyListeners();
  }

  bool _isDisposed = false;

  // WebRTC kaynaklarını temizle (Provider dispose edilmeden)
  Future<void> cleanup() async {
    if (_isDisposed) return;
    await _webrtcService.dispose();
    _localRenderer?.dispose();
    _remoteRenderer?.dispose();
    _localRenderer = null;
    _remoteRenderer = null;
  }

  @override
  void dispose() {
    _isDisposed = true;
    _webrtcService.dispose();
    _localRenderer?.dispose();
    _remoteRenderer?.dispose();
    super.dispose();
  }
}

