import 'package:permission_handler/permission_handler.dart';

class PermissionsService {
  // Kamera izni kontrolü ve isteme
  static Future<bool> requestCameraPermission() async {
    final status = await Permission.camera.request();
    return status.isGranted;
  }

  // Mikrofon izni kontrolü ve isteme
  static Future<bool> requestMicrophonePermission() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  // Her iki izni de kontrol et ve iste
  static Future<bool> requestMediaPermissions() async {
    final cameraStatus = await Permission.camera.request();
    final microphoneStatus = await Permission.microphone.request();
    
    return cameraStatus.isGranted && microphoneStatus.isGranted;
  }

  // İzin durumunu kontrol et (sadece kontrol, isteme)
  static Future<Map<String, bool>> checkPermissions() async {
    final cameraStatus = await Permission.camera.status;
    final microphoneStatus = await Permission.microphone.status;
    
    return {
      'camera': cameraStatus.isGranted,
      'microphone': microphoneStatus.isGranted,
    };
  }

  // İzinler reddedilmiş mi kontrol et
  static Future<bool> arePermissionsPermanentlyDenied() async {
    final cameraStatus = await Permission.camera.status;
    final microphoneStatus = await Permission.microphone.status;
    
    return cameraStatus.isPermanentlyDenied || 
           microphoneStatus.isPermanentlyDenied;
  }

  // Ayarlara yönlendir
  static Future<bool> openSettings() async {
    return await openAppSettings();
  }
}

