class Constants {
  // Backend URL
  // Production server
  static const String serverUrl = 'https://api.yusufakin.xyz';
  
  // STUN Servers
  static const List<Map<String, dynamic>> iceServers = [
    {'urls': 'stun:stun.l.google.com:19302'},
    {'urls': 'stun:stun1.l.google.com:19302'},
  ];
  
  // Message limits
  static const int maxMessageLength = 500;
  
  // Timeouts
  static const int connectionTimeout = 30000; // 30 seconds
}

