import 'package:flutter/material.dart';

class GimsColors {
  static const background = Color(0xfff4f6f9);
  static const foreground = Color(0xff2e333b);
  static const primary = Color(0xff2563eb);
  static const success = Color(0xff16a34a);
  static const warning = Color(0xfff59e0b);
  static const destructive = Color(0xffef4444);
  static const muted = Color(0xffe7ebf1);
  static const mutedForeground = Color(0xff667085);
  static const border = Color(0xffd7dde7);
  static const card = Colors.white;
}

class GimsRadius {
  static const small = 8.0;
  static const medium = 12.0;
}

ThemeData buildGimsTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: GimsColors.primary,
    brightness: Brightness.light,
    primary: GimsColors.primary,
    surface: GimsColors.card,
    error: GimsColors.destructive,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: GimsColors.background,
    fontFamily: 'Roboto',
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: false,
      backgroundColor: GimsColors.background,
      foregroundColor: GimsColors.foreground,
      titleTextStyle: TextStyle(
        color: GimsColors.foreground,
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: GimsColors.card,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(GimsRadius.medium),
        side: const BorderSide(color: GimsColors.border),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(GimsRadius.medium),
        ),
        minimumSize: const Size(48, 44),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: GimsColors.border),
        foregroundColor: GimsColors.primary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(GimsRadius.medium),
        ),
        minimumSize: const Size(48, 44),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(GimsRadius.medium),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(GimsRadius.medium),
        borderSide: const BorderSide(color: GimsColors.border),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    ),
    navigationBarTheme: NavigationBarThemeData(
      indicatorColor: GimsColors.primary.withValues(alpha: 0.12),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 12,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w600
              : FontWeight.w400,
        ),
      ),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        shape: WidgetStateProperty.all(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(GimsRadius.medium),
          ),
        ),
        side: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return BorderSide(
            color: selected ? GimsColors.primary : GimsColors.border,
          );
        }),
      ),
    ),
  );
}
