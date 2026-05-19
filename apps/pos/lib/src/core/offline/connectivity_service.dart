import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';
import '../network/api_exception.dart';

final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  service.init();
  ref.onDispose(service.dispose);
  return service;
});

class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  final StreamController<bool> _onlineController =
      StreamController<bool>.broadcast();

  bool _isOnline = true;
  int _consecutiveProbeFailures = 0;
  Timer? _pingTimer;
  StreamSubscription? _connectivitySubscription;

  bool get isOnline => _isOnline;

  Stream<bool> get isOnline$ => _onlineController.stream;

  void init() {
    _connectivitySubscription = _connectivity.onConnectivityChanged
        .listen(_onConnectivityChanged);

    _connectivity.checkConnectivity().then(_onConnectivityChanged);

    // Periodic ping every 30 s as a safety net when connectivity events are
    // unreliable (e.g., captive portals).
    _pingTimer =
      Timer.periodic(const Duration(seconds: 30), (_) => _refreshStatusFromServer());
  }

  void dispose() {
    _pingTimer?.cancel();
    _connectivitySubscription?.cancel();
    _onlineController.close();
  }

  Future<void> _onConnectivityChanged(dynamic result) async {
    List<ConnectivityResult> results;
    if (result is List<ConnectivityResult>) {
      results = result;
    } else if (result is ConnectivityResult) {
      results = [result];
    } else {
      results = [ConnectivityResult.none];
    }

    final hasNetworkInterface = results.any((r) =>
        r == ConnectivityResult.wifi ||
        r == ConnectivityResult.mobile ||
        r == ConnectivityResult.ethernet);

    if (hasNetworkInterface) {
      await _refreshStatusFromServer();
    } else {
      _setOnline(false);
    }
  }

  Future<void> _refreshStatusFromServer() async {
    final isReachable = await _probeApiReachability();
    _setOnline(isReachable);
  }

  Future<bool> _probeApiReachability() async {
    try {
      await ApiClient.instance.init();
      // Any HTTP response means backend is reachable. `/auth/csrf` is public and
      // lightweight in this codebase.
      await ApiClient.instance.get<Map<String, dynamic>>('/auth/csrf');
      _consecutiveProbeFailures = 0;
      return true;
    } on ApiException catch (e) {
      if (e.statusCode != null) {
        _consecutiveProbeFailures = 0;
        return true;
      }
      _consecutiveProbeFailures += 1;
      if (_consecutiveProbeFailures < 2) {
        return _isOnline;
      }
      return false;
    } catch (_) {
      _consecutiveProbeFailures += 1;
      if (_consecutiveProbeFailures < 2) {
        return _isOnline;
      }
      return false;
    }
  }

  void _setOnline(bool value) {
    if (_isOnline == value) return;
    _isOnline = value;
    _onlineController.add(value);
  }
}
