import 'dart:ui';
import 'package:flutter/material.dart';
import '../utils/theme.dart';

class ControlButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  final bool isActive;
  final Color? backgroundColor;
  final Color? iconColor;

  const ControlButton({
    Key? key,
    required this.icon,
    required this.onPressed,
    this.isActive = true,
    this.backgroundColor,
    this.iconColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isSmallScreen = MediaQuery.of(context).size.width < 400;
    final buttonSize = isSmallScreen ? 48.0 : 52.0;
    final iconSize = isSmallScreen ? 22.0 : 24.0;
    
    final bgColor = backgroundColor ?? AppTheme.buttonBackground;
    final icoColor = iconColor ?? (isActive ? Colors.white : Colors.white70);
    
    return Container(
      width: buttonSize,
      height: buttonSize,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
        border: Border.all(
          color: AppTheme.buttonBorder,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipOval(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onPressed,
              borderRadius: BorderRadius.circular(buttonSize / 2),
              child: Center(
                child: Icon(
                  icon,
                  color: icoColor,
                  size: iconSize,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
