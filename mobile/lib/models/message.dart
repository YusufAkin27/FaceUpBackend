class Message {
  final String id;
  final String text;
  final String sender;
  final String senderName;
  final int timestamp;
  final bool isOwn;

  Message({
    required this.id,
    required this.text,
    required this.sender,
    required this.senderName,
    required this.timestamp,
    required this.isOwn,
  });

  factory Message.fromJson(Map<String, dynamic> json, String currentSocketId) {
    // senderName'i temizle (fazla boşlukları kaldır)
    final senderName = json['senderName'] != null 
        ? (json['senderName'] as String).trim() 
        : 'Bilinmeyen';
    
    return Message(
      id: json['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
      text: json['text'] ?? '',
      sender: json['sender'] ?? '',
      senderName: senderName.isEmpty ? 'Bilinmeyen' : senderName,
      timestamp: json['timestamp'] ?? DateTime.now().millisecondsSinceEpoch,
      isOwn: json['sender'] == currentSocketId,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'sender': sender,
      'senderName': senderName,
      'timestamp': timestamp,
    };
  }
}

