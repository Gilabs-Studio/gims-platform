import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/utils/error_utils.dart';
import '../domain/models/table_selection.dart';
import '../../floor_layout/presentation/live_table_screen.dart';
import '../../outlet/domain/models/outlet.dart';
import 'terminal_screen.dart';
import 'widgets/new_order_notification_banner.dart';

/// Decides between LiveTable picker and Terminal based on published floor layout.
class UnifiedTerminalFlow extends StatefulWidget {
  const UnifiedTerminalFlow({
    super.key,
    required this.outlet,
    this.onAuthError,
  });

  final Outlet outlet;
  final void Function(Object error)? onAuthError;

  @override
  State<UnifiedTerminalFlow> createState() => _UnifiedTerminalFlowState();
}

class _UnifiedTerminalFlowState extends State<UnifiedTerminalFlow> {
  bool _loading = true;
  bool _hasPublishedLayout = false;
  TableSelection? _selectedTable;

  @override
  void initState() {
    super.initState();
    _resolveOutletMode();
  }

  @override
  void didUpdateWidget(covariant UnifiedTerminalFlow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.outlet.id != widget.outlet.id) {
      _selectedTable = null;
      _resolveOutletMode();
    }
  }

  Future<void> _resolveOutletMode() async {
    setState(() => _loading = true);
    try {
      final plans = await ServiceLocator.instance.floorService.listFloorPlans(
        outletId: widget.outlet.id,
        status: 'published',
        perPage: 1,
      );
      if (!mounted) return;
      setState(() {
        _hasPublishedLayout = plans.isNotEmpty;
      });
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    Widget screen;
    var wrapWithOrderBanner = true;

    if (!_hasPublishedLayout) {
      screen = TerminalScreen(outlet: widget.outlet);
    } else {
      final selectedTable = _selectedTable;
      if (selectedTable == null) {
        screen = LiveTableScreen(
          outlet: widget.outlet,
          onSelectTable: (table) {
            setState(() => _selectedTable = table);
          },
        );
        wrapWithOrderBanner = false;
      } else {
        screen = TerminalScreen(
          outlet: widget.outlet,
          selectedTable: selectedTable,
          onBackToLiveTable: () => setState(() => _selectedTable = null),
        );
      }
    }

    if (!wrapWithOrderBanner) return screen;

    return NewOrderNotificationBanner(outletId: widget.outlet.id, child: screen);
  }
}
