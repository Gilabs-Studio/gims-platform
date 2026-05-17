import 'package:flutter/material.dart';

import 'src/app/app.dart';
import 'src/features/terminal/data/push_notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PushNotificationService.instance.ensureInitialized();
  runApp(const GimsPosApp());
}
