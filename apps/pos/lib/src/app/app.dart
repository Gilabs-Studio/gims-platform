import 'package:flutter/material.dart';
import 'package:isar/isar.dart';

import '../core/database/isar_provider.dart';
import '../core/network/api_client.dart';
import '../core/offline/connectivity_service.dart';
import '../core/sync/sync_engine.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/data/auth_service.dart';
import '../features/auth/presentation/auth_gate.dart';
import '../features/feedback/data/feedback_service.dart';
import '../features/floor_layout/data/floor_service.dart';
import '../features/loyalty/data/loyalty_service.dart';
import '../features/outlet/data/outlet_service.dart';
import '../features/terminal/data/terminal_service.dart';

/// Top-level service locator (will be replaced by Riverpod in Phase 4).
class ServiceLocator {
  ServiceLocator._();

  static final instance = ServiceLocator._();

  late final AuthService authService;
  late final OutletService outletService;
  late final TerminalService terminalService;
  late final FloorService floorService;
  late final LoyaltyService loyaltyService;
  late final FeedbackService feedbackService;
  late final SyncEngine syncEngine;

  Future<void> init(ApiClient api, {Isar? isar}) async {
    final resolvedIsar = isar ?? await openIsar();
    final connectivity = ConnectivityService()..init();
    syncEngine = SyncEngine(isar: resolvedIsar, connectivity: connectivity, apiClient: api);
    syncEngine.start();
    authService = AuthService(api);
    outletService = OutletService(api, resolvedIsar);
    terminalService = TerminalService(api, syncEngine, resolvedIsar);
    floorService = FloorService(api, resolvedIsar);
    loyaltyService = LoyaltyService(api);
    feedbackService = FeedbackService(api);
  }
}

class GimsPosApp extends StatefulWidget {
  const GimsPosApp({super.key, this.initialIsar, this.webUnsupported = false});

  final Isar? initialIsar;
  final bool webUnsupported;

  @override
  State<GimsPosApp> createState() => _GimsPosAppState();
}

class _GimsPosAppState extends State<GimsPosApp> {
  late final Future<void> _boot;

  @override
  void initState() {
    super.initState();
    _boot = widget.webUnsupported ? Future.value() : _initialize();
  }

  Future<void> _initialize() async {
    await ApiClient.instance.init();
    await ServiceLocator.instance.init(ApiClient.instance, isar: widget.initialIsar);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.webUnsupported) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Salesview Pos',
        theme: buildGimsTheme(),
        home: const Scaffold(
          body: Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'Flutter web is not supported for POS offline mode with the current Isar version. '
                'Run this app on Android, iOS, Windows, Linux, or macOS.',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      );
    }

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Salesview Pos',
      theme: buildGimsTheme(),
      home: FutureBuilder<void>(
        future: _boot,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Scaffold(
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'Failed to initialize: ${snapshot.error}',
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            );
          }
          if (snapshot.connectionState != ConnectionState.done) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          return const AuthGate();
        },
      ),
    );
  }
}
