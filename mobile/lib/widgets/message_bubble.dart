import 'dart:ui';
import 'package:flutter/material.dart';
import '../utils/theme.dart';

class MessageBubble extends StatelessWidget {
  final String text;
  final String senderName;
  final bool isOwn;

  const MessageBubble({
    Key? key,
    required this.text,
    required this.senderName,
    required this.isOwn,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isOwn ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.7,
        ),
        child: Column(
          crossAxisAlignment: isOwn ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            // Sender name
            Padding(
              padding: const EdgeInsets.only(bottom: 3),
              child: Text(
                isOwn ? 'Siz' : senderName,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: Colors.white.withOpacity(0.85),
                  letterSpacing: 0.3,
                ),
                textAlign: isOwn ? TextAlign.right : TextAlign.left,
              ),
            ),
            // Message bubble
            ClipRRect(
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(18),
                topRight: const Radius.circular(18),
                bottomLeft: isOwn ? const Radius.circular(18) : const Radius.circular(4),
                bottomRight: isOwn ? const Radius.circular(4) : const Radius.circular(18),
              ),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isOwn
                        ? const Color(0xFF1a1a1a).withOpacity(0.85)
                        : Colors.white.withOpacity(0.85),
                    border: Border.all(
                      color: isOwn
                          ? Colors.white.withOpacity(0.1)
                          : Colors.white.withOpacity(0.3),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 12,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    text,
                    style: TextStyle(
                      fontSize: 14,
                      color: isOwn ? Colors.white : const Color(0xFF1a1a1a),
                      height: 1.4,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
