import 'package:flutter/material.dart';

class AppColors {
  // Brand Primary & Gradients (Enterprise Red #C32033 - Consistent with Web)
  static const Color primary = Color(0xFFC32033); // Enterprise Red (#C32033)
  static const Color primaryDark = Color(0xFF9E1B29);
  static const Color primaryLight = Color(0xFFDE3B4F);
  static const Color primarySoft = Color(0xFFFDF2F4); // Soft red tint
  static const Color secondary = Color(0xFF0F172A); // Deep Slate 900
  static const Color accent = Color(0xFF4F46E5); // Indigo Accent

  // Functional Status Colors (Color Wheel Complementary & Triadic)
  static const Color success = Color(0xFF10B981); // Emerald Green
  static const Color successBg = Color(0xFFECFDF5);
  static const Color warning = Color(0xFFF59E0B); // Amber Yellow
  static const Color warningBg = Color(0xFFFFFBEB);
  static const Color danger = Color(0xFFF43F5E); // Crimson Rose
  static const Color dangerBg = Color(0xFFFFF1F2);
  static const Color info = Color(0xFF3B82F6); // Vibrant Blue
  static const Color infoBg = Color(0xFFEFF6FF);

  // Background & Cards
  static const Color background = Color(0xFFFAFAFC); // Ultra Clean Light Neutral
  static const Color surface = Colors.white;
  static const Color cardBorder = Color(0xFFF1F5F9); // Very soft border
  
  // Text Colors
  static const Color textPrimary = Color(0xFF0F172A); // Slate 900
  static const Color textSecondary = Color(0xFF64748B); // Slate 500
  static const Color textMuted = Color(0xFF94A3B8); // Slate 400

  // Premium Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFC32033), Color(0xFFDE3B4F)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkCardGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient adminHeaderGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [Color(0xFF4F46E5), Color(0xFF6366F1)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
