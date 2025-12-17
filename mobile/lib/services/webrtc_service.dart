import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../utils/constants.dart';

class WebRTCService {
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  
  // Callbacks
  Function(MediaStream)? onLocalStream;
  Function(MediaStream)? onRemoteStream;
  Function(RTCIceCandidate)? onIceCandidate;
  Function(String)? onError;
  Function(String)? onConnectionState;

  // Peer connection oluştur
  Future<bool> initializePeerConnection() async {
    try {
      final configuration = {
        'iceServers': Constants.iceServers,
        'sdpSemantics': 'unified-plan',
      };

      _peerConnection = await createPeerConnection(configuration);

      _peerConnection!.onIceCandidate = (RTCIceCandidate? candidate) {
        // Web'deki gibi null kontrolü
        if (candidate != null) {
          onIceCandidate?.call(candidate);
        }
      };

      _peerConnection!.onTrack = (RTCTrackEvent event) {
        print('=== REMOTE TRACK ALINDI ===');
        print('Streams: ${event.streams.length}');
        print('Track: ${event.track?.kind}');
        
        // Web'deki gibi stream yoksa yeni stream oluştur
        if (event.streams.isNotEmpty) {
          _remoteStream = event.streams.first;
          print('Remote stream atandı: ${_remoteStream?.id}');
          onRemoteStream?.call(_remoteStream!);
        } else if (event.track != null) {
          // Stream yoksa ama track varsa
          print('Track alındı ama stream yok, track: ${event.track?.kind}');
          // Flutter WebRTC'de genellikle stream otomatik oluşturulur
        }
      };

      _peerConnection!.onConnectionState = (RTCPeerConnectionState state) {
        final stateString = state.toString().replaceAll('RTCPeerConnectionState.', '');
        print('Connection state: $stateString');
        onConnectionState?.call(stateString);
        
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
          print('✅ WebRTC bağlantısı kuruldu!');
        } else if (state == RTCPeerConnectionState.RTCPeerConnectionStateFailed) {
          print('❌ WebRTC bağlantısı başarısız!');
          onError?.call('Bağlantı hatası: $stateString');
        } else if (state == RTCPeerConnectionState.RTCPeerConnectionStateDisconnected) {
          print('⚠️ WebRTC bağlantısı kesildi');
          onError?.call('Bağlantı kesildi: $stateString');
        }
      };

      _peerConnection!.onIceConnectionState = (RTCIceConnectionState state) {
        print('ICE Connection state: $state');
        if (state == RTCIceConnectionState.RTCIceConnectionStateFailed) {
          print('❌ ICE bağlantısı başarısız!');
          _restartIce();
        }
      };

      return true;
    } catch (e) {
      onError?.call('PeerConnection oluşturulamadı: $e');
      return false;
    }
  }

  // Local stream (kamera/mikrofon) al
  Future<bool> getLocalStream() async {
    try {
      final Map<String, dynamic> constraints = {
        'audio': true,
        'video': {
          'facingMode': 'user',
          'width': {'ideal': 1280},
          'height': {'ideal': 720},
          'frameRate': {'ideal': 30},
        },
      };

      final mediaDevices = navigator.mediaDevices;
      _localStream = await mediaDevices.getUserMedia(constraints);

      if (_peerConnection != null) {
        for (var track in _localStream!.getTracks()) {
          await _peerConnection!.addTrack(track, _localStream!);
        }
      }

      onLocalStream?.call(_localStream!);
      return true;
    } catch (e) {
      onError?.call('Kamera / Mikrofon erişimi başarısız: $e');
      return false;
    }
  }

  // Offer oluştur ve gönder
  Future<RTCSessionDescription?> createOffer() async {
    try {
      if (_peerConnection == null) {
        await initializePeerConnection();
      }

      final offer = await _peerConnection!.createOffer({
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': true,
      });

      await _peerConnection!.setLocalDescription(offer);
      return offer;
    } catch (e) {
      onError?.call('Offer oluşturulamadı: $e');
      return null;
    }
  }

  // Answer oluştur ve gönder
  Future<RTCSessionDescription?> createAnswer(RTCSessionDescription offer) async {
    try {
      if (_peerConnection == null) {
        await initializePeerConnection();
      }

      await _peerConnection!.setRemoteDescription(offer);
      final answer = await _peerConnection!.createAnswer();
      await _peerConnection!.setLocalDescription(answer);
      
      return answer;
    } catch (e) {
      print('Answer oluşturma hatası: $e');
      onError?.call('Answer oluşturulamadı: $e');
      return null;
    }
  }

  // Remote offer'ı set et
  Future<bool> setRemoteOffer(Map<String, dynamic> offerData) async {
    try {
      final offer = RTCSessionDescription(
        offerData['sdp'],
        offerData['type'],
      );
      
      await _peerConnection!.setRemoteDescription(offer);
      return true;
    } catch (e) {
      print('Remote offer set etme hatası: $e');
      onError?.call('Remote offer set edilemedi: $e');
      return false;
    }
  }

  // Remote answer'ı set et
  Future<bool> setRemoteAnswer(Map<String, dynamic> answerData) async {
    try {
      final answer = RTCSessionDescription(
        answerData['sdp'],
        answerData['type'],
      );
      
      await _peerConnection!.setRemoteDescription(answer);
      return true;
    } catch (e) {
      print('Remote answer set etme hatası: $e');
      onError?.call('Remote answer set edilemedi: $e');
      return false;
    }
  }

  // ICE candidate ekle
  Future<bool> addIceCandidate(Map<String, dynamic> candidateData) async {
    try {
      final candidate = RTCIceCandidate(
        candidateData['candidate'],
        candidateData['sdpMid'],
        candidateData['sdpMLineIndex'],
      );
      
      await _peerConnection!.addCandidate(candidate);
      return true;
    } catch (e) {
      print('ICE candidate ekleme hatası: $e');
      return false;
    }
  }

  // Video track'i aç/kapat
  Future<void> toggleVideo(bool enabled) async {
    if (_localStream != null) {
      _localStream!.getVideoTracks().forEach((track) {
        track.enabled = enabled;
      });
    }
  }

  // Audio track'i aç/kapat
  Future<void> toggleAudio(bool enabled) async {
    if (_localStream != null) {
      _localStream!.getAudioTracks().forEach((track) {
        track.enabled = enabled;
      });
    }
  }

  // ICE restart (bağlantı başarısız olduğunda)
  Future<void> _restartIce() async {
    try {
      if (_peerConnection != null) {
        print('ICE restart deneniyor...');
        final offer = await _peerConnection!.createOffer({
          'iceRestart': true,
        });
        await _peerConnection!.setLocalDescription(offer);
        // Offer'ı tekrar göndermek için callback kullanılabilir
        // Ancak bu durumda normal flow'u takip etmek daha iyi
      }
    } catch (e) {
      print('ICE restart hatası: $e');
    }
  }

  // Stream'leri temizle ve bağlantıyı kapat
  Future<void> dispose() async {
    await _localStream?.dispose();
    await _remoteStream?.dispose();
    await _peerConnection?.close();
    _localStream = null;
    _remoteStream = null;
    _peerConnection = null;
  }

  // Getter'lar
  MediaStream? get localStream => _localStream;
  MediaStream? get remoteStream => _remoteStream;
  RTCPeerConnection? get peerConnection => _peerConnection;
}

