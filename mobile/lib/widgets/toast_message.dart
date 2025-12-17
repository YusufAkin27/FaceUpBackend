import 'package:flutter/material.dart';
import '../utils/theme.dart';

class ToastMessage {
  static void show(
    BuildContext context,
    String message, {
    Color? backgroundColor,
    Duration duration = const Duration(seconds: 3),
  }) {
    final overlay = Overlay.of(context);
    final overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        top: MediaQuery.of(context).padding.top + 20,
        left: 20,
        right: 20,
        child: Material(
          color: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: backgroundColor ?? AppTheme.errorColor,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Text(
              message,
              style: AppTheme.bodyStyle,
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );

    overlay.insert(overlayEntry);

    Future.delayed(duration, () {
      overlayEntry.remove();
    });
  }

  static void showError(BuildContext context, String message) {
    show(context, message, backgroundColor: AppTheme.errorColor);
  }

  static void showSuccess(BuildContext context, String message) {
    show(context, message, backgroundColor: Colors.green);
  }

  static void showInfo(BuildContext context, String message) {
    show(context, message, backgroundColor: Colors.blue);
  }
}

