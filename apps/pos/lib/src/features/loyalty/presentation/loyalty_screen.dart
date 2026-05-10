import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/utils/error_utils.dart';
import '../../outlet/domain/models/outlet.dart';
import '../domain/models/loyalty_member.dart';

class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key, required this.outlet});
  final Outlet outlet;

  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  LoyaltyMemberLookup? _member;
  bool _loading = false;

  @override
  void dispose() { _name.dispose(); _phone.dispose(); super.dispose(); }

  Future<void> _lookup() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _loading = true);
    try { final m = await ServiceLocator.instance.loyaltyService.lookupMember(name: _name.text, outletId: widget.outlet.id); setState(() => _member = m); }
    catch (e) { if (mounted) showError(context, e); }
    finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _enroll() async {
    setState(() => _loading = true);
    try { final m = await ServiceLocator.instance.loyaltyService.enrollMember(name: _name.text, phone: _phone.text, outletId: widget.outlet.id); setState(() => _member = m); }
    catch (e) { if (mounted) showError(context, e); }
    finally { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final member = _member;
    return Padding(padding: const EdgeInsets.all(12), child: Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('Loyalty Member', style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 12),
      TextField(controller: _name, decoration: const InputDecoration(labelText: 'Nama member')),
      const SizedBox(height: 10),
      TextField(controller: _phone, decoration: const InputDecoration(labelText: 'Telepon')),
      const SizedBox(height: 12),
      Wrap(spacing: 8, children: [
        FilledButton.icon(onPressed: _loading ? null : _lookup, icon: const Icon(Icons.search), label: const Text('Lookup')),
        OutlinedButton.icon(onPressed: _loading ? null : _enroll, icon: const Icon(Icons.person_add_alt_1), label: const Text('Enroll')),
      ]),
      const SizedBox(height: 16),
      if (_loading) const LinearProgressIndicator(),
      if (member != null) Expanded(child: ListView(children: [
        ListTile(leading: Icon(member.found ? Icons.verified_outlined : Icons.info_outline), title: Text(member.found ? member.customerName ?? 'Member' : 'Member tidak ditemukan'), subtitle: Text('Tier ${member.currentTier ?? '-'} · ${member.pointBalance.toStringAsFixed(0)} poin')),
        for (final r in member.availableRewards) ListTile(leading: const Icon(Icons.card_giftcard), title: Text(r.name), subtitle: Text('${r.pointsRequired.toStringAsFixed(0)} poin · ${r.type}'), trailing: Text(r.value.toStringAsFixed(0))),
      ])),
    ]))));
  }
}
