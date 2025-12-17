import 'package:flutter/material.dart';

class AppTheme {
  // Colors - Web'deki gibi
  static const Color backgroundColor = Color(0xFF0a0a0a); // Koyu siyah (call screen)
  static const Color loginBackground = Color(0xFFf5f5f5); // Açık gri (login/waiting)
  static const Color cardBackground = Colors.white;
  static const Color textPrimary = Color(0xFF1a1a1a); // Koyu metin
  static const Color textSecondary = Color(0xFF666666);
  static const Color textWhite = Colors.white;
  
  // Button Colors - Glassmorphism
  static const Color buttonBackground = Color.fromRGBO(255, 255, 255, 0.15);
  static const Color buttonBorder = Color.fromRGBO(255, 255, 255, 0.2);
  static const Color buttonBackgroundHover = Color.fromRGBO(255, 255, 255, 0.25);
  
  // Message Colors
  static const Color messageOwnBackground = Color.fromRGBO(26, 26, 26, 0.85);
  static const Color messageOtherBackground = Color.fromRGBO(255, 255, 255, 0.85);
  
  // Status Colors
  static const Color errorColor = Color(0xFFd32f2f);
  static const Color successColor = Color(0xFF388e3c);
  static const Color infoColor = Color(0xFF1976d2);
  static const Color warningColor = Color(0xFFffc107);
  
  // Control Button Colors
  static const Color controlButtonMuted = Color.fromRGBO(211, 47, 47, 0.8);
  static const Color controlButtonEndCall = Color.fromRGBO(211, 47, 47, 0.9);
  static const Color controlButtonMessage = Color.fromRGBO(33, 150, 243, 0.8);
  
  // Text Styles
  static const TextStyle headingStyle = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    color: textPrimary,
    letterSpacing: -0.5,
  );
  
  static const TextStyle bodyStyle = TextStyle(
    fontSize: 16,
    color: textPrimary,
    height: 1.5,
  );
  
  static const TextStyle captionStyle = TextStyle(
    fontSize: 14,
    color: textSecondary,
    height: 1.4,
  );
  
  // Button Styles
  static ButtonStyle primaryButtonStyle = ButtonStyle(
    backgroundColor: MaterialStateProperty.all(buttonBackground),
    foregroundColor: MaterialStateProperty.all(textWhite),
    side: MaterialStateProperty.all(BorderSide(color: buttonBorder, width: 1.5)),
    padding: MaterialStateProperty.all(const EdgeInsets.symmetric(
      horizontal: 24,
      vertical: 12,
    )),
    shape: MaterialStateProperty.all(
      RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
    ),
    elevation: MaterialStateProperty.all(0),
  );
  
  // Card Style - Web'deki gibi
  static BoxDecoration cardDecoration = BoxDecoration(
    color: cardBackground,
    borderRadius: BorderRadius.circular(16),
    border: Border.all(
      color: const Color(0xFFe5e5e5),
      width: 1,
    ),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.1),
        blurRadius: 8,
        offset: const Offset(0, 2),
      ),
    ],
  );
  
  // Glassmorphism decoration
  static BoxDecoration glassDecoration = BoxDecoration(
    color: Colors.black.withOpacity(0.5),
    borderRadius: BorderRadius.circular(20),
    border: Border.all(
      color: Colors.white.withOpacity(0.1),
      width: 1,
    ),
  );
}

