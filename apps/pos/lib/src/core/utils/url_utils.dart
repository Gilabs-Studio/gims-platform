import 'package:url_launcher/url_launcher.dart';

import '../network/api_client.dart';

/// Resolve relative image URLs against the API origin.
String? resolveImageUrl(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return '${ApiClient.instance.apiOrigin}$trimmed';
  }
  return trimmed;
}

/// Launch a URL in the external browser/app.
Future<void> openExternal(String value) async {
  final uri = Uri.parse(value);
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}
