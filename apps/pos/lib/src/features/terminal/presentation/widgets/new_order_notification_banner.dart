import 'dart:async';

import 'package:flutter/material.dart';

import '../../data/pos_ws_service.dart';
import '../../data/notification_sound_service.dart';

/// Listens to the POS WebSocket and shows an in-app banner whenever a new
/// customer self-order arrives.
///
/// Wrap around any POS screen that needs to react to customer orders:
///
/// ```dart
/// NewOrderNotificationBanner(
///   outletId: outletId,
///   child: TerminalScreen(...),
/// )
/// ```
class NewOrderNotificationBanner extends StatefulWidget {
  const NewOrderNotificationBanner({
    super.key,
    required this.outletId,
    required this.child,
    this.onNewOrder,
  });

  final String outletId;
  final Widget child;

  /// Optional callback fired when a new customer order is received.
  final VoidCallback? onNewOrder;

  @override
  State<NewOrderNotificationBanner> createState() =>
      _NewOrderNotificationBannerState();
}

class _NewOrderNotificationBannerState
    extends State<NewOrderNotificationBanner>
    with SingleTickerProviderStateMixin {
  late final PosWsService _wsService;
  StreamSubscription<PosWsEvent>? _sub;

  late final AnimationController _animController;
  late final Animation<Offset> _slideAnimation;

  String? _bannerMessage;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    ));

    _wsService = PosWsService(outletId: widget.outletId);
    _sub = _wsService.events.listen(_handleEvent);
    _wsService.connect();
  }

  void _handleEvent(PosWsEvent event) {
    if (event.event != 'pos.new_customer_order') return;
    final tableLabel =
        (event.payload['table_label'] as String?) ?? 'Meja';
    final message = 'Pesanan baru dari $tableLabel!';

    widget.onNewOrder?.call();
    NotificationSoundService.instance.play();

    setState(() => _bannerMessage = message);
    _animController.forward(from: 0);

    _dismissTimer?.cancel();
    _dismissTimer = Timer(const Duration(seconds: 6), () {
      if (mounted) {
        _animController.reverse();
      }
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    _wsService.dispose();
    _dismissTimer?.cancel();
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_bannerMessage != null)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SlideTransition(
              position: _slideAnimation,
              child: SafeArea(
                child: GestureDetector(
                  onTap: () => _animController.reverse(),
                  child: Container(
                    margin: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade700,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.18),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.notifications_active,
                            color: Colors.white, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _bannerMessage!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        const Icon(Icons.close,
                            color: Colors.white70, size: 18),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
