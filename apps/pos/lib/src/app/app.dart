import 'package:flutter/material.dart';

import '../core/network/api_client.dart';
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

  void init(ApiClient api) {
    authService = AuthService(api);
    outletService = OutletService(api);
    terminalService = TerminalService(api);
    floorService = FloorService(api);
    loyaltyService = LoyaltyService(api);
    feedbackService = FeedbackService(api);
  }
}

class GimsPosApp extends StatefulWidget {
  const GimsPosApp({super.key});

  @override
  State<GimsPosApp> createState() => _GimsPosAppState();
}

class _GimsPosAppState extends State<GimsPosApp> {
  late final Future<void> _boot;

  @override
  void initState() {
    super.initState();
    _boot = _initialize();
  }

  Future<void> _initialize() async {
    await ApiClient.instance.init();
    ServiceLocator.instance.init(ApiClient.instance);
  }

  @override
  Widget build(BuildContext context) {
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
