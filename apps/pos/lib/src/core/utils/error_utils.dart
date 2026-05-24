import 'package:flutter/material.dart';

import '../network/api_exception.dart';
import '../theme/app_theme.dart';

/// Show a red error SnackBar at the top of the screen.
void showError(BuildContext context, Object error) {
  final rawMessage = error is ApiException ? error.message : error.toString();
  final lower = rawMessage.toLowerCase();

  // Swallow known noise
  if (lower.contains('websocketchannelexception') &&
      lower.contains('connection refused')) {
    return;
  }

  // Build a more user-friendly message for generic server errors
  String message = rawMessage;
  if (error is ApiException) {
    if ((error.code == 'INTERNAL_SERVER_ERROR' || error.statusCode == 500) &&
        (rawMessage.contains('internal server error') ||
            rawMessage.toLowerCase().contains('an internal server error'))) {
      message = 'Server error — please try again in a moment.';
    }
  }

  final messenger = ScaffoldMessenger.of(context);
  messenger.clearSnackBars();
  messenger.showSnackBar(
    SnackBar(
      content: Text(message, style: const TextStyle(color: Colors.white)),
      backgroundColor: GimsColors.destructive,
      behavior: SnackBarBehavior.floating,
      // Push the floating snackbar to the top of the screen
      margin: EdgeInsets.only(
        bottom: MediaQuery.of(context).size.height - 130,
        left: 16,
        right: 16,
      ),
      duration: const Duration(seconds: 4),
    ),
  );
}

/// Whether [error] is an auth-related API exception (401/token).
bool isAuthError(Object error) {
  return error is ApiException &&
      (error.statusCode == 401 ||
          error.code == 'UNAUTHORIZED' ||
          error.code == 'TOKEN_EXPIRED' ||
          error.code == 'TOKEN_INVALID');
}
