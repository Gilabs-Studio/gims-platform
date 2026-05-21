import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isar/isar.dart';

import 'src/app/app.dart';
import 'src/core/database/isar_provider.dart';
import 'src/features/terminal/data/push_notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PushNotificationService.instance.ensureInitialized();

  final overrides = <Override>[];
  Isar? initialIsar;
  if (!kIsWeb) {
    try {
      final isar = await openIsar();
      initialIsar = isar;
      overrides.add(isarProvider.overrideWithValue(isar));
    } catch (error, stackTrace) {
      debugPrint('Failed to initialize Isar: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  runApp(
    ProviderScope(
      overrides: overrides,
      child: GimsPosApp(initialIsar: initialIsar, webUnsupported: kIsWeb),
    ),
  );
}
