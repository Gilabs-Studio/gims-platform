import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/utils/error_utils.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../outlet/domain/models/outlet.dart';
import '../domain/models/floor_plan.dart';
import 'widgets/floor_canvas.dart';

class FloorEditorScreen extends StatefulWidget {
  const FloorEditorScreen({super.key, required this.outlet});
  final Outlet outlet;

  @override
  State<FloorEditorScreen> createState() => _FloorEditorScreenState();
}

class _FloorEditorScreenState extends State<FloorEditorScreen> {
  List<FloorPlan> _plans = const [];
  FloorPlan? _plan;
  String? _selectedId;
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void didUpdateWidget(covariant FloorEditorScreen old) { super.didUpdateWidget(old); if (old.outlet.id != widget.outlet.id) _load(); }

  Future<void> _load() async {
    final svc = ServiceLocator.instance.floorService;
    setState(() => _loading = true);
    try {
      final plans = await svc.listFloorPlans(outletId: widget.outlet.id);
      final plan = plans.isEmpty ? null : await svc.getFloorPlan(plans.first.id);
      setState(() { _plans = plans; _plan = plan; _selectedId = null; });
    } catch (e) { if (mounted) showError(context, e); } finally { if (mounted) setState(() => _loading = false); }
  }

  void _addObject(String type) {
    final plan = _plan; if (plan == null) return;
    final count = plan.objects.where((o) => o.type == type).length + 1;
    final obj = LayoutObject(id: '${type}_${DateTime.now().microsecondsSinceEpoch}', type: type, x: 40.0 + count * 8, y: 40.0 + count * 8, width: type == 'wall' ? 140 : 82, height: type == 'wall' ? 18 : 64, label: type == 'table' ? 'T$count' : type, tableNumber: type == 'table' ? count : null, tableShape: type == 'table' ? 'rectangle' : null, capacity: type == 'table' ? 4 : null);
    setState(() { plan.objects.add(obj); _selectedId = obj.id; });
  }

  Future<void> _save() async {
    final plan = _plan; if (plan == null) return;
    try { final saved = await ServiceLocator.instance.floorService.saveFloorLayout(plan); setState(() => _plan = saved); if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Layout tersimpan'))); } catch (e) { if (mounted) showError(context, e); }
  }

  Future<void> _publish() async {
    final plan = _plan; if (plan == null) return;
    try { final saved = await ServiceLocator.instance.floorService.publishFloorPlan(plan.id); setState(() => _plan = saved); if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Layout dipublish'))); } catch (e) { if (mounted) showError(context, e); }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final plan = _plan;
    if (plan == null) return const EmptyState(icon: Icons.grid_off_outlined, title: 'Floor plan belum ada', message: 'Buat floor plan pertama dari web, lalu editor mobile bisa memodifikasi canvas-nya.');
    return Padding(padding: const EdgeInsets.all(12), child: Column(children: [
      Card(child: Padding(padding: const EdgeInsets.all(10), child: Row(children: [
        Expanded(child: DropdownButtonHideUnderline(child: DropdownButton<FloorPlan>(
          value: _plans.any((i) => i.id == plan.id) ? _plans.firstWhere((i) => i.id == plan.id) : null,
          items: [for (final i in _plans) DropdownMenuItem(value: i, child: Text('${i.name} · ${i.status}'))],
          onChanged: (v) async { if (v == null) return; final d = await ServiceLocator.instance.floorService.getFloorPlan(v.id); setState(() => _plan = d); },
        ))),
        IconButton(onPressed: () => _addObject('table'), icon: const Icon(Icons.table_bar_outlined), tooltip: 'Table'),
        IconButton(onPressed: () => _addObject('chair'), icon: const Icon(Icons.chair_outlined), tooltip: 'Chair'),
        IconButton(onPressed: () => _addObject('wall'), icon: const Icon(Icons.horizontal_rule), tooltip: 'Wall'),
        IconButton(onPressed: () => _addObject('cashier'), icon: const Icon(Icons.point_of_sale), tooltip: 'Cashier'),
        FilledButton.icon(onPressed: _save, icon: const Icon(Icons.save_outlined), label: const Text('Save')),
        const SizedBox(width: 8),
        OutlinedButton.icon(onPressed: _publish, icon: const Icon(Icons.publish_outlined), label: const Text('Publish')),
      ]))),
      const SizedBox(height: 12),
      Expanded(child: Card(clipBehavior: Clip.antiAlias, child: FloorCanvas(objects: plan.objects, width: plan.width, height: plan.height, selectedId: _selectedId, onSelect: (o) => setState(() => _selectedId = o.id), onMove: (o, d) => setState(() { o.x = (o.x + d.dx).clamp(0, plan.width - o.width); o.y = (o.y + d.dy).clamp(0, plan.height - o.height); })))),
    ]));
  }
}
