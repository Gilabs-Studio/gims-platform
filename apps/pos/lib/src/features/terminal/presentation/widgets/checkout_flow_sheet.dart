import 'package:flutter/material.dart';

import '../../../../app/app.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/error_utils.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/utils/url_utils.dart';
import '../../../loyalty/domain/models/loyalty_member.dart';
import '../../domain/models/pos_order.dart';
import '../../domain/models/pos_config.dart';
import '../../domain/models/table_selection.dart';

class CheckoutResult {
  const CheckoutResult({required this.customerName, this.tenderAmount});
  final String? customerName;
  final double? tenderAmount;
}

class CheckoutFlowSheet extends StatefulWidget {
  const CheckoutFlowSheet({super.key, required this.order, required this.config, required this.selectedTable, required this.outletId});
  final PosOrder order;
  final PosConfig? config;
  final TableSelection? selectedTable;
  final String outletId;

  @override
  State<CheckoutFlowSheet> createState() => _CheckoutFlowSheetState();
}

class _CheckoutFlowSheetState extends State<CheckoutFlowSheet> {
  final _customerName = TextEditingController();
  final _customerPhone = TextEditingController();
  final _memberSearch = TextEditingController();
  final _tender = TextEditingController();
  bool _existingCustomer = false;
  bool _loading = false;
  int _step = 0;
  LoyaltyMemberLookup? _memberLookup;
  LoyaltyReward? _selectedReward;

  @override
  void dispose() { _customerName.dispose(); _customerPhone.dispose(); _memberSearch.dispose(); _tender.dispose(); super.dispose(); }

  double get _orderTotal => widget.order.totalAmount;
  String get _displayCustomerName {
    if (_existingCustomer && _memberLookup?.customerName != null && _memberLookup!.customerName!.isNotEmpty) return _memberLookup!.customerName!;
    return _customerName.text.trim();
  }

  Future<void> _lookupMember() async {
    final q = _memberSearch.text.trim();
    if (q.isEmpty) return;
    setState(() => _loading = true);
    try {
      final lookup = await ServiceLocator.instance.loyaltyService.lookupMember(name: q, outletId: widget.outletId);
      setState(() { _memberLookup = lookup; _selectedReward = null; if (lookup.found && lookup.customerName != null) _customerName.text = lookup.customerName!; _step = lookup.availableRewards.isNotEmpty ? 1 : 2; });
    } catch (e) { if (mounted) showError(context, e); } finally { if (mounted) setState(() => _loading = false); }
  }

  void _continueFromCustomerStep() {
    if (_existingCustomer) {
      if (_memberLookup == null) { if (_memberSearch.text.trim().isEmpty) { showError(context, ApiException('Masukkan nama member terlebih dahulu')); return; } _lookupMember(); return; }
      setState(() => _step = _memberLookup!.availableRewards.isNotEmpty ? 1 : 2); return;
    }
    if (_customerName.text.trim().isEmpty) { showError(context, ApiException('Masukkan nama customer terlebih dahulu')); return; }
    setState(() => _step = 2);
  }

  Future<void> _payCash() async {
    final tv = double.tryParse(_tender.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? _orderTotal;
    if (tv < _orderTotal) { showError(context, ApiException('Nominal cash kurang dari total')); return; }
    setState(() => _loading = true);
    try {
      await ServiceLocator.instance.terminalService.processCash(widget.order.id, amount: tv, customerName: _displayCustomerName.isEmpty ? null : _displayCustomerName, loyaltyMemberId: _memberLookup?.memberId, loyaltyRewardId: _selectedReward?.id);
      if (!mounted) return;
      Navigator.of(context).pop(CheckoutResult(customerName: _displayCustomerName.isEmpty ? null : _displayCustomerName, tenderAmount: tv));
    } catch (e) { if (mounted) showError(context, e); } finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _payDigital() async {
    setState(() => _loading = true);
    try {
      final p = await ServiceLocator.instance.terminalService.initiateDigital(widget.order.id, amount: _orderTotal, channelCode: 'QRIS', customerName: _displayCustomerName.isEmpty ? null : _displayCustomerName, loyaltyMemberId: _memberLookup?.memberId, loyaltyRewardId: _selectedReward?.id);
      if (p.paymentUrl != null && p.paymentUrl!.isNotEmpty) await openExternal(p.paymentUrl!);
      if (!mounted) return;
      Navigator.of(context).pop(CheckoutResult(customerName: _displayCustomerName.isEmpty ? null : _displayCustomerName));
    } catch (e) { if (mounted) showError(context, e); } finally { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final rewards = _memberLookup?.availableRewards ?? const <LoyaltyReward>[];
    final ki = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: ki),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Card(child: Padding(padding: const EdgeInsets.all(14), child: Row(children: [
            const Icon(Icons.receipt_long, color: GimsColors.primary), const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Checkout ${widget.order.orderNumber}', style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(widget.selectedTable == null ? 'Take away' : 'Meja ${widget.selectedTable!.label}', style: const TextStyle(color: GimsColors.mutedForeground)),
            ])),
            Text(formatMoney(_orderTotal, widget.config?.currency ?? 'IDR'), style: const TextStyle(fontWeight: FontWeight.w700)),
          ]))),
          const SizedBox(height: 12),
          if (_step == 0) ..._buildCustomerStep(rewards),
          if (_step == 1) ..._buildRewardStep(rewards),
          if (_step == 2) ..._buildPaymentStep(),
        ]),
      ),
    );
  }

  List<Widget> _buildCustomerStep(List<LoyaltyReward> rewards) => [
    Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SegmentedButton<bool>(segments: const [ButtonSegment(value: false, label: Text('Customer Baru'), icon: Icon(Icons.person_outline)), ButtonSegment(value: true, label: Text('Member'), icon: Icon(Icons.loyalty_outlined))], selected: {_existingCustomer}, onSelectionChanged: (s) => setState(() { _existingCustomer = s.first; _memberLookup = null; _selectedReward = null; })),
      const SizedBox(height: 12),
      if (_existingCustomer) ...[
        TextField(controller: _memberSearch, decoration: const InputDecoration(labelText: 'Cari nama member', prefixIcon: Icon(Icons.search)), onSubmitted: (_) => _lookupMember()),
        const SizedBox(height: 10),
        FilledButton.icon(onPressed: _loading ? null : _lookupMember, icon: _loading ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.search), label: const Text('Cari Member')),
        if (_memberLookup != null) ...[const SizedBox(height: 12), Card(child: ListTile(leading: Icon(_memberLookup!.found ? Icons.verified_outlined : Icons.info_outline), title: Text(_memberLookup!.customerName ?? 'Member'), subtitle: Text('${_memberLookup!.currentTier ?? '-'} · ${_memberLookup!.pointBalance.toStringAsFixed(0)} poin')))],
      ] else ...[
        TextField(controller: _customerName, decoration: const InputDecoration(labelText: 'Nama customer', prefixIcon: Icon(Icons.person_outline))),
        const SizedBox(height: 10),
        TextField(controller: _customerPhone, decoration: const InputDecoration(labelText: 'No. telepon (opsional)', prefixIcon: Icon(Icons.phone_outlined))),
      ],
    ]))),
    const SizedBox(height: 12),
    FilledButton(onPressed: _loading ? null : _continueFromCustomerStep, child: Text(rewards.isNotEmpty && _existingCustomer ? 'Lanjut ke Kupon' : 'Lanjut ke Pembayaran')),
  ];

  List<Widget> _buildRewardStep(List<LoyaltyReward> rewards) => [
    Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('Redeem Kupon', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
      const SizedBox(height: 8),
      Text('Pilih reward yang berlaku untuk member ini.', style: TextStyle(color: GimsColors.mutedForeground.withValues(alpha: 0.9))),
      const SizedBox(height: 10),
      for (final r in rewards) Card(child: RadioListTile<LoyaltyReward>(value: r, groupValue: _selectedReward, onChanged: (v) => setState(() => _selectedReward = v), title: Text(r.name), subtitle: Text('${r.type} · ${r.pointsRequired.toStringAsFixed(0)} poin'))),
    ]))),
    const SizedBox(height: 12),
    Row(children: [
      Expanded(child: OutlinedButton(onPressed: _loading ? null : () => setState(() => _step = 0), child: const Text('Kembali'))),
      const SizedBox(width: 10),
      Expanded(child: FilledButton(onPressed: _loading ? null : () => setState(() => _step = 2), child: const Text('Lanjut ke Pembayaran'))),
    ]),
  ];

  List<Widget> _buildPaymentStep() => [
    Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('Pembayaran', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
      const SizedBox(height: 12),
      TextField(controller: _tender, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: 'Nominal cash', helperText: formatMoney(_orderTotal, widget.config?.currency ?? 'IDR'), prefixIcon: const Icon(Icons.payments_outlined))),
      const SizedBox(height: 12),
      Wrap(spacing: 8, runSpacing: 8, children: [
        FilledButton.icon(onPressed: _loading ? null : _payCash, icon: const Icon(Icons.payments_outlined), label: const Text('Cash')),
        FilledButton.icon(onPressed: _loading ? null : _payDigital, icon: const Icon(Icons.qr_code_2), label: const Text('Xendit')),
      ]),
    ]))),
    const SizedBox(height: 12),
    Row(children: [
      Expanded(child: OutlinedButton(onPressed: _loading ? null : () => setState(() => _step = _memberLookup?.availableRewards.isNotEmpty == true ? 1 : 0), child: const Text('Kembali'))),
      const SizedBox(width: 10),
      Expanded(child: OutlinedButton(onPressed: _loading ? null : () => Navigator.of(context).pop(), child: const Text('Batal'))),
    ]),
  ];
}
