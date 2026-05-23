import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/offline/connectivity_service.dart';
import '../../../core/sync/sync_provider.dart';
import '../../../core/sync/sync_status.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/error_utils.dart';

import '../../../shared/models/user_session.dart';
import '../../../app/app.dart';
import '../domain/models/outlet.dart';
import 'widgets/home_grid.dart';
import '../../terminal/presentation/unified_terminal_flow.dart';
import '../../terminal/data/pos_ws_service.dart';
import '../../terminal/data/push_notification_service.dart';
import '../../floor_layout/presentation/floor_editor_screen.dart';
import '../../loyalty/presentation/loyalty_screen.dart';
import '../../feedback/presentation/feedback_screen.dart';
import '../../terminal/domain/models/pos_order.dart';

/// Main shell — outlet selector + feature navigation (no bottom nav).
class PosShell extends ConsumerStatefulWidget {
  const PosShell({super.key, this.user, required this.onLogout});

  final UserSession? user;
  final VoidCallback onLogout;

  @override
  ConsumerState<PosShell> createState() => _PosShellState();
}

class _PosShellState extends ConsumerState<PosShell> {
  List<Outlet> _outlets = const [];
  Outlet? _outlet;
  bool _outletLoading = true;
  PosFeature? _feature;
  StreamSubscription<Map<String, dynamic>>? _notificationTapSub;
  PosWsService? _wsService;
  StreamSubscription<PosWsEvent>? _wsEventSub;
  StreamSubscription<PosWsConnectionState>? _wsStateSub;
  PosWsConnectionState _wsConnectionState = PosWsConnectionState.disconnected;
  PosOrder? _resumedOrder;

  @override
  void initState() {
    super.initState();
    _notificationTapSub = PushNotificationService.instance.notificationTaps
        .listen(_handleNotificationTap);
    _loadOutlets();
  }

  @override
  void dispose() {
    _notificationTapSub?.cancel();
    _wsEventSub?.cancel();
    _wsStateSub?.cancel();
    _wsService?.dispose();
    super.dispose();
  }

  Future<void> _loadOutlets() async {
    setState(() => _outletLoading = true);
    try {
      final outlets = await ServiceLocator.instance.outletService.listOutlets();
      setState(() {
        _outlets = outlets;
        _outlet = outlets.isNotEmpty ? outlets.first : null;
      });
      final selected = outlets.isNotEmpty ? outlets.first : null;
      if (selected != null) {
        await _registerPushForOutlet(selected);
        _connectWsForOutlet(selected.id);
      }
    } catch (error) {
      if (mounted) {
        if (isAuthError(error)) {
          widget.onLogout();
        } else {
          showError(context, error);
        }
      }
    } finally {
      if (mounted) setState(() => _outletLoading = false);
    }
  }

  void _handleAuthError(Object error) {
    if (isAuthError(error)) widget.onLogout();
  }

  Future<void> _registerPushForOutlet(Outlet outlet) async {
    try {
      await PushNotificationService.instance.registerForOutlet(outlet);
    } catch (_) {
      // Foreground WebSocket remains the source of truth when push setup fails.
    }
  }

  void _handleNotificationTap(Map<String, dynamic> data) {
    final outletId = data['outlet_id'] as String?;
    if (outletId == null || outletId.isEmpty) return;
    final matches = _outlets.where((outlet) => outlet.id == outletId);
    if (matches.isEmpty) return;
    setState(() {
      _outlet = matches.first;
      _feature = PosFeature.terminal;
    });
    _connectWsForOutlet(matches.first.id);
  }

  void _connectWsForOutlet(String outletId) {
    _wsEventSub?.cancel();
    _wsStateSub?.cancel();
    _wsService?.dispose();

    final service = PosWsService(
      outletId: outletId,
      onAuthRejected: _handleAuthError,
    );
    _wsService = service;

    _wsStateSub = service.connectionState$.listen((state) {
      if (!mounted) return;
      setState(() => _wsConnectionState = state);
    });

    _wsEventSub = service.events.listen((_) {
      // Use WS as a realtime trigger to flush any pending sync queue quickly.
      ref.read(syncEngineProvider).processQueue();
    });

    service.connect();
  }

  @override
  Widget build(BuildContext context) {
    if (_outletLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final outlet = _outlet;
    if (outlet == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.storefront_outlined,
                size: 42,
                color: GimsColors.mutedForeground,
              ),
              const SizedBox(height: 12),
              const Text('Belum ada outlet POS.'),
              const SizedBox(height: 12),
              FilledButton(onPressed: _loadOutlets, child: const Text('Retry')),
              OutlinedButton(
                onPressed: widget.onLogout,
                child: const Text('Logout'),
              ),
            ],
          ),
        ),
      );
    }

    Widget body;
    switch (_feature) {
      case PosFeature.terminal:
        body = UnifiedTerminalFlow(
          outlet: outlet,
          onAuthError: _handleAuthError,
          resumeOrder: _resumedOrder,
          onClearResumedOrder: () => setState(() => _resumedOrder = null),
        );
        break;
      case PosFeature.floor:
        body = FloorEditorScreen(outlet: outlet);
        break;
      case PosFeature.loyalty:
        body = LoyaltyScreen(outlet: outlet, user: widget.user);
        break;
      case PosFeature.feedback:
        body = FeedbackScreen(outlet: outlet);
        break;
      case null:
        body = HomeGrid(
          user: widget.user,
          outlet: outlet,
          onSelected: (feature) => setState(() => _feature = feature),
        );
    }

    return Scaffold(
      appBar: AppBar(
        leading: _feature == null
            ? null
            : IconButton(
                tooltip: 'Kembali',
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() {
                  _feature = null;
                  _resumedOrder = null;
                }),
              ),
        title: Text(_feature?.title ?? outlet.name),
        actions: [
          _SyncStatusChip(
            wsConnectionState: _wsConnectionState,
            onConflictTap: () => _showSyncConflictSheet(context),
          ),
          PopupMenuButton<String>(
            onSelected: (value) async {
              switch (value) {
                case 'change_outlet':
                  _showOutletSelector();
                  break;
                case 'refresh':
                  _loadOutlets();
                  break;

                case 'logout':
                  widget.onLogout();
                  break;
              }
            },
            itemBuilder: (_) => [
              if (_outlets.length > 1)
                const PopupMenuItem(
                  value: 'change_outlet',
                  child: Text('Ganti Outlet'),
                ),
              const PopupMenuItem(value: 'refresh', child: Text('Refresh')),

              const PopupMenuItem(value: 'logout', child: Text('Logout')),
            ],
          ),
        ],
      ),
      body: _OfflineAwareBody(child: body),
    );
  }

  void _showSyncConflictSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (_) => const _SyncConflictSheet(),
    );
  }

  void _showOutletSelector() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Pilih Outlet'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: _outlets.length,
            itemBuilder: (context, index) {
              final item = _outlets[index];
              return ListTile(
                leading: const Icon(Icons.storefront_outlined),
                title: Text(item.name),
                selected: item.id == _outlet?.id,
                onTap: () {
                  setState(() {
                    _outlet = item;
                    _feature = null;
                  });
                  _registerPushForOutlet(item);
                  _connectWsForOutlet(item.id);
                  Navigator.pop(dialogContext);
                },
              );
            },
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sync status chip shown in AppBar actions
// ---------------------------------------------------------------------------

class _SyncStatusChip extends ConsumerWidget {
  const _SyncStatusChip({
    required this.onConflictTap,
    required this.wsConnectionState,
  });

  final VoidCallback onConflictTap;
  final PosWsConnectionState wsConnectionState;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(connectivityServiceProvider).isOnline;
    final syncAsync = ref.watch(syncStatusProvider);

    return syncAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (detail) {
        if (!isOnline) {
          return _chip(
            context,
            icon: Icons.wifi_off,
            color: Colors.orange,
            label: detail.pendingCount > 0
                ? '${detail.pendingCount} antrian'
                : 'Offline',
            onTap: null,
          );
        }
        if (wsConnectionState == PosWsConnectionState.reconnecting ||
            wsConnectionState == PosWsConnectionState.connecting) {
          return _chip(
            context,
            icon: Icons.sync,
            color: Colors.amber,
            label: 'Realtime reconnect...',
            onTap: null,
          );
        }
        switch (detail.status) {
          case SyncStatus.syncing:
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator.adaptive(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Theme.of(context).colorScheme.onPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text('Sinkronisasi...', style: TextStyle(fontSize: 12)),
                ],
              ),
            );
          case SyncStatus.conflictError:
            return _chip(
              context,
              icon: Icons.warning_amber_rounded,
              color: Colors.red,
              label: '${detail.failedCount} konflik',
              onTap: onConflictTap,
            );
          case SyncStatus.offlineQueued:
            return _chip(
              context,
              icon: Icons.cloud_upload_outlined,
              color: Colors.orange,
              label: '${detail.pendingCount} antrian',
              onTap: null,
            );
          case SyncStatus.idle:
            return const SizedBox.shrink();
        }
      },
    );
  }

  Widget _chip(
    BuildContext context, {
    required IconData icon,
    required Color color,
    required String label,
    VoidCallback? onTap,
  }) {
    final chip = Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, color: color)),
        ],
      ),
    );
    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: chip);
    }
    return chip;
  }
}

// ---------------------------------------------------------------------------
// Offline banner + body wrapper
// ---------------------------------------------------------------------------

class _OfflineAwareBody extends ConsumerWidget {
  const _OfflineAwareBody({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(connectivityServiceProvider).isOnline;

    return Column(
      children: [
        if (!isOnline)
          Container(
            width: double.infinity,
            color: Colors.amber.shade700,
            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
            child: const Row(
              children: [
                Icon(Icons.wifi_off, size: 14, color: Colors.white),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Mode Offline — transaksi akan disinkronkan saat kembali online',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        Expanded(child: child),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Sync conflict modal bottom sheet
// ---------------------------------------------------------------------------

class _SyncConflictSheet extends ConsumerWidget {
  const _SyncConflictSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobsAsync = ref.watch(failedJobsProvider);
    final engine = ref.read(syncEngineProvider);

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.5,
      builder: (_, controller) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.warning_amber_rounded, color: Colors.red),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Transaksi Bermasalah',
                    style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: jobsAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (jobs) {
                if (jobs.isEmpty) {
                  return const Center(
                    child: Text('Tidak ada transaksi bermasalah.'),
                  );
                }
                return ListView.builder(
                  controller: controller,
                  itemCount: jobs.length,
                  itemBuilder: (context, index) {
                    final job = jobs[index];
                    return ListTile(
                      title: Text('${job.feature}.${job.action}'),
                      subtitle: Text(
                        job.errorMessage ?? job.errorCode ?? 'Gagal',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      isThreeLine: false,
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          TextButton(
                            onPressed: () async {
                              await engine.retryJob(job.id);
                              if (context.mounted) {
                                ref.invalidate(failedJobsProvider);
                              }
                            },
                            child: const Text('Coba Lagi'),
                          ),
                          TextButton(
                            onPressed: () async {
                              await engine.cancelJob(job.id);
                              if (context.mounted) {
                                ref.invalidate(failedJobsProvider);
                              }
                            },
                            child: const Text(
                              'Batalkan',
                              style: TextStyle(color: Colors.red),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
