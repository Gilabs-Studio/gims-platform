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
  ConnectivityService._internal();

  static final ConnectivityService instance = ConnectivityService._internal();

  factory ConnectivityService() => instance;

  final Connectivity _connectivity = Connectivity();
  final StreamController<bool> _onlineController =
      StreamController<bool>.broadcast();
  static const Duration _minProbeInterval = Duration(seconds: 2);

  bool _isOnline = true;
  bool _initialized = false;
  StreamSubscription? _connectivitySubscription;
  DateTime? _lastProbeAt;

  bool get isOnline => _isOnline;

  Stream<bool> get isOnline$ => _onlineController.stream;

  void init() {
    if (_initialized) return;
    _initialized = true;

    _connectivitySubscription = _connectivity.onConnectivityChanged
        .listen(_onConnectivityChanged);

    _connectivity.checkConnectivity().then(_onConnectivityChanged);
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
    _initialized = false;
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
    final now = DateTime.now();
    if (_lastProbeAt != null && now.difference(_lastProbeAt!) < _minProbeInterval) {
      return;
    }
    _lastProbeAt = now;

    final isReachable = await _probeApiReachability();
    _setOnline(isReachable);
  }

  Future<bool> _probeApiReachability() async {
    try {
      await ApiClient.instance.init();
      // Any HTTP response means backend is reachable. `/auth/csrf` is public and
      // lightweight in this codebase.
      await ApiClient.instance.get<Map<String, dynamic>>('/auth/csrf');
      return true;
    } on ApiException catch (e) {
      if (e.statusCode != null) {
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  void _setOnline(bool value) {
    if (_isOnline == value) return;
    _isOnline = value;
    _onlineController.add(value);
  }
}
