import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../app/app.dart';

import '../../../core/utils/error_utils.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/url_utils.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../terminal/domain/models/pos_order.dart';
import '../../terminal/domain/models/table_selection.dart';
import '../../outlet/domain/models/outlet.dart';
import '../domain/models/floor_plan.dart';
import '../domain/live_table_data.dart';
import 'widgets/floor_canvas.dart';
import 'widgets/status_legend.dart';

class LiveTableScreen extends StatefulWidget {
  const LiveTableScreen({super.key, required this.outlet, this.onSelectTable});
  final Outlet outlet;
  final ValueChanged<TableSelection>? onSelectTable;

  @override
  State<LiveTableScreen> createState() => _LiveTableScreenState();
}

class _LiveTableScreenState extends State<LiveTableScreen> {
  Timer? _timer;
  Timer? _clockTimer;
  FloorPlan? _plan;
  List<PosOrder> _orders = const [];
  DateTime _now = DateTime.now();
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); _timer = Timer.periodic(const Duration(seconds: 15), (_) => _load(silent: true)); _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) { if (!mounted) return; setState(() => _now = DateTime.now()); }); }

  @override
  void didUpdateWidget(covariant LiveTableScreen old) { super.didUpdateWidget(old); if (old.outlet.id != widget.outlet.id) _load(); }

  @override
  void dispose() { _timer?.cancel(); _clockTimer?.cancel(); super.dispose(); }

  Future<void> _load({bool silent = false}) async {
    final fs = ServiceLocator.instance.floorService;
    final ts = ServiceLocator.instance.terminalService;
    if (!silent) setState(() => _loading = true);
    try {
      final plans = await fs.listFloorPlans(outletId: widget.outlet.id, status: 'published');
      final orders = await ts.listOrders(outletId: widget.outlet.id);
      FloorPlan? plan = plans.isEmpty ? null : await fs.getFloorPlan(plans.first.id);
      setState(() { _plan = plan; _orders = orders; _now = DateTime.now(); });
    } catch (e) { if (mounted && !silent) showError(context, e); } finally { if (mounted && !silent) setState(() => _loading = false); }
  }

  List<LiveTableData> _liveTables() {
    final plan = _plan;
    if (plan == null) return const [];
    final seatCounts = <String, int>{};
    for (final o in plan.objects) { if (o.isChair && o.parentId != null) seatCounts[o.parentId!] = (seatCounts[o.parentId!] ?? 0) + 1; }
    final active = <String, PosOrder>{};
    for (final order in _orders) {
      if (order.tableLabel == null) continue;
      if (!{PosOrderStatus.paid, PosOrderStatus.partialServed, PosOrderStatus.served}.contains(order.status)) continue;
      final existing = active[order.tableLabel!];
      if (existing == null || order.createdAt.isAfter(existing.createdAt)) active[order.tableLabel!] = order;
    }
    return plan.objects.where((o) => o.isTable).map((table) {
      final label = table.label ?? table.tableNumber?.toString() ?? table.id;
      final order = active[label];
      final duration = order == null ? Duration.zero : _now.difference(order.createdAt);
      String status = 'AVAILABLE';
      if (order != null) {
        if (order.status == PosOrderStatus.partialServed) status = 'PARTIAL_SERVED';
        else if (order.status == PosOrderStatus.served) status = 'SERVED';
        else status = duration.inMinutes > 30 ? 'WARN_LONG' : 'SEATED';
      }
      return LiveTableData(table: table, seatCount: seatCounts[table.id] ?? table.capacity ?? 0, status: status, duration: duration, order: order);
    }).toList();
  }

  Future<void> _tapTable(LiveTableData info) async {
    if (info.order == null) {
      final cb = widget.onSelectTable;
      if (cb != null) { cb(TableSelection(id: info.table.id, label: info.table.label ?? info.table.tableNumber?.toString() ?? info.table.id, seatCount: info.seatCount)); return; }
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pilih meja dari flow Terminal.')));
      return;
    }
    final order = info.order!;
    if (!mounted) return;
    final ts = ServiceLocator.instance.terminalService;
    await showModalBottomSheet<void>(context: context, showDragHandle: true, builder: (ctx) => Padding(
      padding: const EdgeInsets.all(16),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('${info.table.label ?? info.table.id} · ${order.orderNumber}', style: Theme.of(ctx).textTheme.titleMedium),
        Text('Status ${order.status.value}'),
        Text('Mulai ${DateFormat('HH:mm').format(order.createdAt)} · tunggu ${formatDuration(info.duration)}'),
        const SizedBox(height: 14),
        Wrap(spacing: 8, runSpacing: 8, children: [
          FilledButton.icon(onPressed: () async { Navigator.pop(ctx); await ts.serveOrder(order.id); await _load(); }, icon: const Icon(Icons.room_service_outlined), label: const Text('Sajikan')),
          FilledButton.icon(onPressed: () async { Navigator.pop(ctx); await ts.completeOrder(order.id); await _load(); }, icon: const Icon(Icons.check_circle_outline), label: const Text('Selesai')),
          OutlinedButton.icon(onPressed: () => openExternal(ts.receiptUrl(order.id)), icon: const Icon(Icons.receipt_long), label: const Text('Nota')),
        ]),
      ]),
    ));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final plan = _plan;
    if (plan == null) return const EmptyState(icon: Icons.table_bar_outlined, title: 'Belum ada published floor layout', message: 'Publish layout outlet ini dari tab Floor agar Live Table aktif.');
    final liveTables = _liveTables();
    return Padding(padding: const EdgeInsets.all(12), child: Column(children: [
      StatusLegend(onRefresh: _load),
      const SizedBox(height: 12),
      Expanded(child: Card(clipBehavior: Clip.antiAlias, child: FloorCanvas(objects: plan.objects, width: plan.width, height: plan.height, liveTables: liveTables, onSelect: (table) { final info = liveTables.firstWhere((i) => i.table.id == table.id); _tapTable(info); }))),
    ]));
  }
}
