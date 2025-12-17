class User {
  final String name;
  final String surname;
  final String? socketId;
  final String? status; // 'waiting' | 'active'

  User({
    required this.name,
    this.surname = '',
    this.socketId,
    this.status,
  });

  String get displayName => surname.isNotEmpty ? '$name $surname' : name;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      name: json['name'] ?? '',
      surname: json['surname'] ?? '',
      socketId: json['socketId'],
      status: json['status'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'surname': surname,
      'socketId': socketId,
      'status': status,
    };
  }
}

