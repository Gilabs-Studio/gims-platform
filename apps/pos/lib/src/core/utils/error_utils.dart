import 'package:flutter/material.dart';

import '../network/api_exception.dart';
import '../theme/app_theme.dart';

/// Show a red error SnackBar with the error message.
void showError(BuildContext context, Object error) {
  final message = error is ApiException ? error.message : error.toString();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message), backgroundColor: GimsColors.destructive),
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
