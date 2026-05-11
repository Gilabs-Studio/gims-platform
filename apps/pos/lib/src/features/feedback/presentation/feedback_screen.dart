import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/utils/error_utils.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../outlet/domain/models/outlet.dart';
import '../domain/models/feedback_form.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key, required this.outlet});
  final Outlet outlet;

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  final _title = TextEditingController(text: 'Feedback Outlet');
  List<FeedbackForm> _forms = const [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void didUpdateWidget(covariant FeedbackScreen old) { super.didUpdateWidget(old); if (old.outlet.id != widget.outlet.id) _load(); }

  @override
  void dispose() { _title.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try { final forms = await ServiceLocator.instance.feedbackService.listFeedbackForms(outletId: widget.outlet.id); setState(() => _forms = forms); }
    catch (e) { if (mounted) showError(context, e); }
    finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _create() async {
    try { await ServiceLocator.instance.feedbackService.createQuickFeedbackForm(outletId: widget.outlet.id, title: _title.text); await _load(); }
    catch (e) { if (mounted) showError(context, e); }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return Padding(padding: const EdgeInsets.all(12), child: Column(children: [
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Row(children: [
        Expanded(child: TextField(controller: _title, decoration: const InputDecoration(labelText: 'Judul form'))),
        const SizedBox(width: 8),
        FilledButton.icon(onPressed: _create, icon: const Icon(Icons.add), label: const Text('Form')),
      ]))),
      const SizedBox(height: 12),
      Expanded(child: _forms.isEmpty
        ? const EmptyState(icon: Icons.rate_review_outlined, title: 'Form feedback kosong', message: 'Buat form singkat atau kelola detailnya dari web.')
        : ListView.separated(itemCount: _forms.length, separatorBuilder: (_, __) => const SizedBox(height: 8), itemBuilder: (_, i) {
          final form = _forms[i];
          return Card(child: ListTile(leading: Icon(form.isActive ? Icons.toggle_on : Icons.toggle_off), title: Text(form.title), subtitle: Text(form.description ?? form.outletId), trailing: Chip(label: Text(form.isActive ? 'active' : 'inactive'))));
        })),
    ]));
  }
}
