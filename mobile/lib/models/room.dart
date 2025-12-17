import 'user.dart';

class Room {
  final String roomId;
  final User? partner;
  final bool isInitiator;

  Room({
    required this.roomId,
    this.partner,
    this.isInitiator = false,
  });

  factory Room.fromJson(Map<String, dynamic> json) {
    return Room(
      roomId: json['roomId'] ?? '',
      partner: json['partner'] != null
          ? User.fromJson(json['partner'])
          : null,
      isInitiator: json['isInitiator'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'roomId': roomId,
      'partner': partner?.toJson(),
      'isInitiator': isInitiator,
    };
  }
}

