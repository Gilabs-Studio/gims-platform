import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../../core/network/api_client.dart';
import '../../outlet/domain/models/outlet.dart';

@pragma('vm:entry-point')
Future<void> posFirebaseBackgroundHandler(RemoteMessage message) async {
  await PushNotificationService.instance.ensureInitialized();
  await PushNotificationService.instance.showLocal(message);
}

class PushNotificationService {
  PushNotificationService._();

  static final instance = PushNotificationService._();

  final FlutterLocalNotificationsPlugin _local =
      FlutterLocalNotificationsPlugin();
  final StreamController<Map<String, dynamic>> _tapController =
      StreamController<Map<String, dynamic>>.broadcast();
  bool _localReady = false;
  bool _firebaseReady = false;

  Stream<Map<String, dynamic>> get notificationTaps => _tapController.stream;

  Future<void> ensureInitialized() async {
    if (!_localReady) {
      try {
        const android = AndroidInitializationSettings('@mipmap/ic_launcher');
        const darwin = DarwinInitializationSettings();
        const linux = LinuxInitializationSettings(defaultActionName: 'Open');
        const windows = WindowsInitializationSettings(
          appName: 'GIMS POS',
          appUserModelId: 'com.gilabs.gims.gims_pos',
          guid: '4c1a5287-efdf-4ff3-a8d2-8a83e8f5e44f',
        );
        await _local.initialize(
          const InitializationSettings(
            android: android,
            iOS: darwin,
            macOS: darwin,
            linux: linux,
            windows: windows,
          ),
          onDidReceiveNotificationResponse: (response) {
            final payload = response.payload;
            if (payload == null || payload.isEmpty) return;
            try {
              final decoded = jsonDecode(payload);
              if (decoded is Map<String, dynamic>) {
                _tapController.add(decoded);
              }
            } catch (_) {}
          },
        );
        _localReady = true;
      } catch (_) {}
    }
    if (_firebaseReady) return;
    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(posFirebaseBackgroundHandler);
      FirebaseMessaging.onMessage.listen(showLocal);
      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        _tapController.add(Map<String, dynamic>.from(message.data));
      });
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) {
        _tapController.add(Map<String, dynamic>.from(initial.data));
      }
      _firebaseReady = true;
    } catch (_) {
      // Firebase config files are environment-specific; the app stays usable
      // and foreground WebSocket notifications still work when config is absent.
    }
  }

  Future<void> registerForOutlet(Outlet outlet) async {
    await ensureInitialized();
    if (!_firebaseReady || outlet.tenantId == null || outlet.tenantId!.isEmpty) {
      return;
    }
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission();
    final token = await messaging.getToken();
    if (token == null || token.isEmpty) return;
    await ApiClient.instance.post<Map<String, dynamic>>(
      '/pos/device-token',
      data: {
        'token': token,
        'platform': _platform,
        'outlet_id': outlet.id,
        'tenant_id': outlet.tenantId,
      },
    );
  }

  Future<void> showLocal(RemoteMessage message) async {
    await ensureInitialized();
    if (!_localReady) return;
    final title = message.notification?.title ?? message.data['title'] ?? 'Order Baru';
    final body = message.notification?.body ?? message.data['body'] ?? 'Meja';
    const androidDetails = AndroidNotificationDetails(
      'pos_orders',
      'POS Orders',
      importance: Importance.max,
      priority: Priority.high,
      sound: RawResourceAndroidNotificationSound('notification'),
    );
    const darwinDetails = DarwinNotificationDetails(sound: 'notification.mp3');
    const linuxDetails = LinuxNotificationDetails();
    const windowsDetails = WindowsNotificationDetails();
    await _local.show(
      message.hashCode,
      '$title',
      '$body',
      const NotificationDetails(
        android: androidDetails,
        iOS: darwinDetails,
        macOS: darwinDetails,
        linux: linuxDetails,
        windows: windowsDetails,
      ),
      payload: jsonEncode(message.data),
    );
  }

  String get _platform {
    if (Platform.isIOS || Platform.isMacOS) return 'ios';
    if (Platform.isWindows) return 'windows';
    if (Platform.isLinux) return 'linux';
    return 'android';
  }
}
