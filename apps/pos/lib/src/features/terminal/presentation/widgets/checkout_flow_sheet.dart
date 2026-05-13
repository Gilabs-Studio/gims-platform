import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../../app/app.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/error_utils.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/utils/url_utils.dart';
import '../../../loyalty/domain/models/loyalty_member.dart';
import '../../domain/models/pos_config.dart';
import '../../domain/models/pos_customer.dart';
import '../../domain/models/pos_order.dart';
import '../../domain/models/table_selection.dart';

class CheckoutResult {
  const CheckoutResult({
    required this.customerName,
    this.customerPhone,
    this.tenderAmount,
  });

  final String? customerName;
  final String? customerPhone;
  final double? tenderAmount;
}

enum _CheckoutStep { customer, reward, payment, receipt }

enum _CustomerMode { newCustomer, existing }

enum _PaymentTab { cash, digital }

class _PaymentChannel {
  const _PaymentChannel({
    required this.code,
    required this.name,
    required this.category,
  });

  final String code;
  final String name;
  final String category;
}

const List<_PaymentChannel> _channels = [
  _PaymentChannel(code: 'QRIS', name: 'QRIS', category: 'QR_CODE'),
  _PaymentChannel(code: 'DANA', name: 'DANA', category: 'EWALLET'),
  _PaymentChannel(code: 'GOPAY', name: 'GoPay', category: 'EWALLET'),
  _PaymentChannel(code: 'OVO', name: 'OVO', category: 'EWALLET'),
  _PaymentChannel(code: 'SHOPEEPAY', name: 'ShopeePay', category: 'EWALLET'),
  _PaymentChannel(code: 'LINKAJA', name: 'LinkAja', category: 'EWALLET'),
  _PaymentChannel(code: 'ASTRAPAY', name: 'AstraPay', category: 'EWALLET'),
  _PaymentChannel(code: 'JENIUSPAY', name: 'Jenius Pay', category: 'EWALLET'),
  _PaymentChannel(code: 'BCA', name: 'BCA', category: 'BANK_TRANSFER'),
  _PaymentChannel(code: 'BNI', name: 'BNI', category: 'BANK_TRANSFER'),
  _PaymentChannel(code: 'BRI', name: 'BRI', category: 'BANK_TRANSFER'),
  _PaymentChannel(code: 'MANDIRI', name: 'Mandiri', category: 'BANK_TRANSFER'),
  _PaymentChannel(code: 'PERMATA', name: 'Permata', category: 'BANK_TRANSFER'),
  _PaymentChannel(code: 'CIMB', name: 'CIMB Niaga', category: 'BANK_TRANSFER'),
  _PaymentChannel(code: 'BSI', name: 'BSI', category: 'BANK_TRANSFER'),
  _PaymentChannel(
    code: 'CREDIT_CARD',
    name: 'Credit or Debit Card',
    category: 'CARDS',
  ),
];

const List<String> _numpadKeys = [
  '7',
  '8',
  '9',
  '4',
  '5',
  '6',
  '1',
  '2',
  '3',
  '000',
  '0',
  '⌫',
];

const Map<String, String> _channelLogos = {
  'QRIS':
      'assets/logo/quick-response-code-indonesia-standard-qris-seeklogo.svg',
  'DANA': 'assets/logo/Logo DANA - (Koleksilogo.com).svg',
  'GOPAY': 'assets/logo/Logo GoPay - (Koleksilogo.com).svg',
  'OVO': 'assets/logo/Logo_ovo_purple.svg',
  'SHOPEEPAY': 'assets/logo/ShopeePay Logo - (Koleksilogo.com).svg',
  'LINKAJA': 'assets/logo/LinkAja.svg',
  'ASTRAPAY': 'assets/logo/astra-pay-logo_svgstack_com_73131775993940.svg',
  'JENIUSPAY': 'assets/logo/jenius-seeklogo.png',
  'BCA': 'assets/logo/bca-bank-central-asia-logo-svgrepo-com.svg',
  'BNI': 'assets/logo/Bank_Negara_Indonesia_logo_(2004).svg',
  'BRI': 'assets/logo/BANK_BRI_logo_(vertical).svg',
  'MANDIRI': 'assets/logo/Bank_Mandiri_logo_2016.svg',
  'PERMATA': 'assets/logo/Permata_Bank_(2024).svg',
  'CIMB': 'assets/logo/CIMB_Niaga_logo.svg',
  'BSI': 'assets/logo/Bank_Syariah_Indonesia.svg',
};

class CheckoutFlowSheet extends StatefulWidget {
  const CheckoutFlowSheet({
    super.key,
    required this.order,
    required this.config,
    required this.selectedTable,
    required this.outletId,
    required this.outletName,
  });

  final PosOrder order;
  final PosConfig? config;
  final TableSelection? selectedTable;
  final String outletId;
  final String outletName;

  @override
  State<CheckoutFlowSheet> createState() => _CheckoutFlowSheetState();
}

class _CheckoutFlowSheetState extends State<CheckoutFlowSheet> {
  final _customerName = TextEditingController();
  final _customerPhone = TextEditingController();
  final _customerEmail = TextEditingController();
  final _customerSearch = TextEditingController();
  final _tender = TextEditingController();

  _CheckoutStep _step = _CheckoutStep.customer;
  _CustomerMode _customerMode = _CustomerMode.newCustomer;
  _PaymentTab _paymentTab = _PaymentTab.cash;

  bool _loading = false;
  bool _polling = false;
  String _channelSearch = '';

  List<PosCustomer> _customers = const [];
  PosCustomer? _selectedCustomer;
  LoyaltyMemberLookup? _memberLookup;
  LoyaltyReward? _selectedReward;
  PosPayment? _digitalPayment;
  PosPayment? _finalPayment;
  XenditConnectionStatus? _xenditStatus;
  Timer? _paymentPollTimer;
  WebViewController? _receiptPreviewController;
  bool _receiptPreviewError = false;

  @override
  void initState() {
    super.initState();
    _initReceiptPreview();
    _loadXenditStatus();
    _loadCustomers();
  }

  void _initReceiptPreview() {
    if (kIsWeb) {
      _receiptPreviewError = true;
      return;
    }
    if (_receiptPreviewController != null) return;
    final url = ServiceLocator.instance.terminalService.receiptUrl(
      widget.order.id,
    );
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onWebResourceError: (_) {
            if (!mounted) return;
            setState(() => _receiptPreviewError = true);
          },
        ),
      )
      ..loadRequest(Uri.parse(url));
    _receiptPreviewController = controller;
  }

  @override
  void dispose() {
    _paymentPollTimer?.cancel();
    _customerName.dispose();
    _customerPhone.dispose();
    _customerEmail.dispose();
    _customerSearch.dispose();
    _tender.dispose();
    super.dispose();
  }

  double get _amountBeforeReward =>
      widget.order.subtotal +
      widget.order.taxAmount +
      widget.order.serviceCharge;

  double get _selectedRewardDiscount =>
      _calculateRewardDiscount(_amountBeforeReward, _selectedReward);

  double get _totalAmount {
    final total = _amountBeforeReward - _selectedRewardDiscount;
    return total < 0 ? 0 : total;
  }

  int get _tenderAmount {
    final raw = _tender.text.replaceAll(RegExp(r'[^0-9]'), '');
    return int.tryParse(raw) ?? 0;
  }

  String get _resolvedCustomerName {
    if (_customerMode == _CustomerMode.existing && _selectedCustomer != null) {
      return _selectedCustomer!.name;
    }
    return _customerName.text.trim();
  }

  String? get _resolvedCustomerId {
    return _customerMode == _CustomerMode.existing
        ? _selectedCustomer?.id
        : null;
  }

  String? get _resolvedCustomerPhone {
    if (_customerMode == _CustomerMode.existing) {
      return _selectedCustomer?.contactPerson?.trim().isEmpty == true
          ? null
          : _selectedCustomer?.contactPerson?.trim();
    }
    final value = _customerPhone.text.trim();
    return value.isEmpty ? null : value;
  }

  String? get _resolvedCustomerEmail {
    if (_customerMode == _CustomerMode.existing) {
      return _selectedCustomer?.email?.trim().isEmpty == true
          ? null
          : _selectedCustomer?.email?.trim();
    }
    final value = _customerEmail.text.trim();
    return value.isEmpty ? null : value;
  }

  Future<void> _loadXenditStatus() async {
    try {
      final status = await ServiceLocator.instance.terminalService
          .getXenditConnectionStatus();
      if (!mounted) return;
      setState(() => _xenditStatus = status);
    } catch (_) {
      // Keep digital flow disabled on status fetch failure.
      if (!mounted) return;
      setState(() {
        _xenditStatus = XenditConnectionStatus(
          isConnected: false,
          status: 'not_connected',
        );
      });
    }
  }

  Future<void> _loadCustomers() async {
    try {
      final list = await ServiceLocator.instance.terminalService.listCustomers(
        search: _customerSearch.text.trim().isEmpty
            ? null
            : _customerSearch.text.trim(),
      );
      if (!mounted) return;
      setState(() => _customers = list);
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    }
  }

  Future<void> _createCustomer() async {
    final name = _customerName.text.trim();
    if (name.isEmpty) {
      showError(
        context,
        ApiException('Masukkan nama customer terlebih dahulu'),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final customer = await ServiceLocator.instance.terminalService
          .createCustomer(
            name: name,
            phone: _resolvedCustomerPhone,
            email: _resolvedCustomerEmail,
          );
      if (!mounted) return;
      setState(() {
        _customerMode = _CustomerMode.existing;
        _selectedCustomer = customer;
      });
      await _loadCustomers();
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMembershipByCustomer(PosCustomer customer) async {
    setState(() {
      _loading = true;
      _memberLookup = null;
      _selectedReward = null;
    });

    try {
      final member = await ServiceLocator.instance.loyaltyService
          .getMemberByCustomer(customer.id);

      if (!mounted) return;
      if (member == null) {
        setState(() {
          _memberLookup = null;
        });
        return;
      }

      final lookup = await ServiceLocator.instance.loyaltyService.lookupMember(
        name: customer.name,
        outletId: widget.outletId,
      );

      if (!mounted) return;
      setState(() {
        _memberLookup = lookup.found ? lookup : member;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _memberLookup = null;
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _continueFromCustomer() async {
    if (_customerMode == _CustomerMode.existing && _selectedCustomer == null) {
      showError(context, ApiException('Pilih customer terlebih dahulu'));
      return;
    }

    if (_customerMode == _CustomerMode.newCustomer &&
        _resolvedCustomerName.isEmpty) {
      showError(
        context,
        ApiException('Masukkan nama customer terlebih dahulu'),
      );
      return;
    }

    final hasRewardOptions =
        (_memberLookup?.availableRewards ?? const <LoyaltyReward>[]).isNotEmpty;
    setState(() {
      _step = hasRewardOptions ? _CheckoutStep.reward : _CheckoutStep.payment;
    });
  }

  Future<void> _payCash() async {
    if (_tenderAmount < _totalAmount) {
      showError(context, ApiException('Nominal cash kurang dari total'));
      return;
    }

    setState(() => _loading = true);
    try {
      final payment = await ServiceLocator.instance.terminalService.processCash(
        widget.order.id,
        amount: _tenderAmount,
        customerId: _resolvedCustomerId,
        customerName: _resolvedCustomerName,
        customerPhone: _resolvedCustomerPhone,
        customerEmail: _resolvedCustomerEmail,
        loyaltyMemberId: _memberLookup?.memberId,
        loyaltyRewardId: _selectedReward?.id,
      );

      if (!mounted) return;
      setState(() {
        _finalPayment = payment;
        _step = _CheckoutStep.receipt;
      });
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _payDigital(_PaymentChannel channel) async {
    setState(() {
      _loading = true;
      _digitalPayment = null;
      _polling = false;
    });

    try {
      final payment = await ServiceLocator.instance.terminalService
          .initiateDigital(
            widget.order.id,
            amount: _totalAmount,
            channelCode: channel.code,
            customerId: _resolvedCustomerId,
            customerName: _resolvedCustomerName,
            customerPhone: _resolvedCustomerPhone,
            customerEmail: _resolvedCustomerEmail,
            loyaltyMemberId: _memberLookup?.memberId,
            loyaltyRewardId: _selectedReward?.id,
          );

      if (!mounted) return;
      setState(() {
        _digitalPayment = payment;
      });

      if (payment.paymentUrl != null && payment.paymentUrl!.isNotEmpty) {
        await openExternal(payment.paymentUrl!);
      }

      if (payment.status == 'PAID') {
        if (!mounted) return;
        setState(() {
          _finalPayment = payment;
          _step = _CheckoutStep.receipt;
        });
        return;
      }

      _startPaymentPolling();
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _startPaymentPolling() {
    _paymentPollTimer?.cancel();
    setState(() => _polling = true);

    _paymentPollTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      try {
        final payments = await ServiceLocator.instance.terminalService
            .getPaymentsByOrderId(widget.order.id);
        if (!mounted) return;
        if (payments.isEmpty) return;

        final latest = payments.first;
        if (latest.status == 'PAID') {
          _paymentPollTimer?.cancel();
          setState(() {
            _polling = false;
            _finalPayment = latest;
            _digitalPayment = latest;
            _step = _CheckoutStep.receipt;
          });
        } else if (latest.status == 'FAILED' || latest.status == 'EXPIRED') {
          _paymentPollTimer?.cancel();
          setState(() {
            _polling = false;
            _digitalPayment = latest;
          });
        }
      } catch (_) {
        // Polling can continue silently on transient errors.
      }
    });
  }

  void _resetDigitalSelection() {
    _paymentPollTimer?.cancel();
    setState(() {
      _polling = false;
      _digitalPayment = null;
    });
  }

  void _finishCheckout() {
    final tenderAmount =
        _finalPayment?.tenderAmount ??
        (_paymentTab == _PaymentTab.cash ? _tenderAmount.toDouble() : null);

    Navigator.of(context).pop(
      CheckoutResult(
        customerName: _resolvedCustomerName.isEmpty
            ? null
            : _resolvedCustomerName,
        customerPhone: _resolvedCustomerPhone,
        tenderAmount: tenderAmount,
      ),
    );
  }

  void _handleNumpadTap(String key) {
    if (key == '⌫') {
      if (_tender.text.isEmpty) return;
      setState(() {
        _tender.text = _tender.text.substring(0, _tender.text.length - 1);
      });
      return;
    }

    if (key == '000') {
      if (_tender.text.isEmpty) return;
      setState(() => _tender.text = '${_tender.text}000');
      return;
    }

    if (_tender.text.length >= 10) return;
    setState(() => _tender.text = '${_tender.text}$key');
  }

  Future<void> _confirmCancelCheckout() async {
    final shouldCancel = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(GimsRadius.medium),
            side: const BorderSide(color: GimsColors.border),
          ),
          title: const Text('Batalkan transaksi?'),
          content: const Text(
            'Order draft akan dibatalkan dan item dikembalikan ke cart.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Lanjutkan pembayaran'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: FilledButton.styleFrom(
                backgroundColor: GimsColors.destructive,
              ),
              child: const Text('Batalkan transaksi'),
            ),
          ],
        );
      },
    );

    if (shouldCancel == true && mounted) {
      Navigator.of(context).pop();
    }
  }

  Future<void> _openReceipt() async {
    final url = ServiceLocator.instance.terminalService.receiptUrl(
      widget.order.id,
    );
    await openExternal(url);
  }

  Future<void> _sendWhatsApp() async {
    final phone = _resolvedCustomerPhone;
    if (phone == null || phone.isEmpty) {
      showError(
        context,
        ApiException('Nomor WhatsApp customer belum tersedia'),
      );
      return;
    }

    final template = widget.config?.receiptWhatsAppTemplate ?? '';
    final rendered = _renderWhatsAppTemplate(
      template: template,
      values: _buildTemplateValues(),
    );

    final waUrl = _formatWhatsAppLink(phone, rendered);
    await openExternal(waUrl);
  }

  Map<String, String> _buildTemplateValues() {
    final tender = _finalPayment?.tenderAmount ?? _tenderAmount.toDouble();
    final change =
        _finalPayment?.changeAmount ??
        ((tender - _totalAmount) < 0 ? 0 : (tender - _totalAmount));

    return {
      'customer_name': _resolvedCustomerName.isEmpty
          ? '-'
          : _resolvedCustomerName,
      'order_number': widget.order.orderNumber,
      'outlet_name': widget.outletName,
      'order_date': _formatDateTime(widget.order.createdAt),
      'subtotal': formatMoney(
        widget.order.subtotal,
        widget.config?.currency ?? 'IDR',
      ),
      'tax_amount': formatMoney(
        widget.order.taxAmount,
        widget.config?.currency ?? 'IDR',
      ),
      'service_amount': formatMoney(
        widget.order.serviceCharge,
        widget.config?.currency ?? 'IDR',
      ),
      'discount_amount': formatMoney(
        _selectedRewardDiscount,
        widget.config?.currency ?? 'IDR',
      ),
      'total_amount': formatMoney(
        _totalAmount,
        widget.config?.currency ?? 'IDR',
      ),
      'tender_amount': formatMoney(tender, widget.config?.currency ?? 'IDR'),
      'change_amount': formatMoney(change, widget.config?.currency ?? 'IDR'),
      'items_summary':
          widget.order.items
              .map(
                (item) =>
                    '${item.productName} x${item.quantity.toStringAsFixed(0)}',
              )
              .join(', ')
              .trim()
              .isEmpty
          ? '-'
          : widget.order.items
                .map(
                  (item) =>
                      '${item.productName} x${item.quantity.toStringAsFixed(0)}',
                )
                .join(', '),
    };
  }

  @override
  Widget build(BuildContext context) {
    _initReceiptPreview();
    final screen = MediaQuery.of(context).size;
    final dialogWidth = screen.width > 980 ? 920.0 : screen.width * 0.94;
    final dialogHeight = screen.height * 0.9;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: const BorderSide(color: GimsColors.border),
      ),
      child: SizedBox(
        width: dialogWidth,
        height: dialogHeight,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildStepIndicator(),
              const SizedBox(height: 12),
              _buildSummaryCard(),
              const SizedBox(height: 12),
              if (_step == _CheckoutStep.customer) ..._buildCustomerStep(),
              if (_step == _CheckoutStep.reward) ..._buildRewardStep(),
              if (_step == _CheckoutStep.payment) ..._buildPaymentStep(),
              if (_step == _CheckoutStep.receipt) ..._buildReceiptStep(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    final steps = <({String label, _CheckoutStep step, IconData icon})>[
      (
        label: 'Customer',
        step: _CheckoutStep.customer,
        icon: Icons.person_outline,
      ),
      (
        label: 'Redeem',
        step: _CheckoutStep.reward,
        icon: Icons.loyalty_outlined,
      ),
      (
        label: 'Payment',
        step: _CheckoutStep.payment,
        icon: Icons.payments_outlined,
      ),
      (
        label: 'Receipt',
        step: _CheckoutStep.receipt,
        icon: Icons.receipt_long_outlined,
      ),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            for (final step in steps)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: _StepChip(
                    label: step.label,
                    icon: step.icon,
                    active: step.step == _step,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            const Icon(Icons.receipt_long, color: GimsColors.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Checkout ${widget.order.orderNumber}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    widget.selectedTable == null
                        ? 'Take away'
                        : 'Meja ${widget.selectedTable!.label}',
                    style: const TextStyle(color: GimsColors.mutedForeground),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (_selectedRewardDiscount > 0)
                  Text(
                    '-${formatMoney(_selectedRewardDiscount, widget.config?.currency ?? 'IDR')}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.green,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                Text(
                  formatMoney(_totalAmount, widget.config?.currency ?? 'IDR'),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildCustomerStep() {
    return [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SegmentedButton<_CustomerMode>(
                segments: const [
                  ButtonSegment(
                    value: _CustomerMode.newCustomer,
                    label: Text('New Customer'),
                    icon: Icon(Icons.person_add_alt_1_outlined),
                  ),
                  ButtonSegment(
                    value: _CustomerMode.existing,
                    label: Text('Existing Customer'),
                    icon: Icon(Icons.badge_outlined),
                  ),
                ],
                selected: {_customerMode},
                onSelectionChanged: (selection) {
                  setState(() {
                    _customerMode = selection.first;
                    _selectedCustomer = null;
                    _memberLookup = null;
                    _selectedReward = null;
                  });
                },
              ),
              const SizedBox(height: 12),
              if (_customerMode == _CustomerMode.existing) ...[
                TextField(
                  controller: _customerSearch,
                  decoration: InputDecoration(
                    labelText: 'Search customer',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: IconButton(
                      onPressed: _loading ? null : _loadCustomers,
                      icon: const Icon(Icons.refresh),
                    ),
                  ),
                  onSubmitted: (_) => _loadCustomers(),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: _selectedCustomer?.id,
                  decoration: const InputDecoration(
                    labelText: 'Customer master',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  items: _customers
                      .map(
                        (customer) => DropdownMenuItem(
                          value: customer.id,
                          child: Text('${customer.code} - ${customer.name}'),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value == null) return;
                    final selected = _customers.firstWhere(
                      (customer) => customer.id == value,
                      orElse: () => _customers.first,
                    );
                    setState(() {
                      _selectedCustomer = selected;
                      _customerPhone.text = selected.contactPerson ?? '';
                      _customerEmail.text = selected.email ?? '';
                    });
                    _loadMembershipByCustomer(selected);
                  },
                ),
              ] else ...[
                TextField(
                  controller: _customerName,
                  decoration: const InputDecoration(
                    labelText: 'Customer name',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _customerPhone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Phone number (optional)',
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _customerEmail,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email (optional)',
                    prefixIcon: Icon(Icons.mail_outline),
                  ),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: _loading ? null : _createCustomer,
                  icon: const Icon(Icons.save_outlined),
                  label: const Text('Create Customer Master'),
                ),
              ],
              if (_customerMode == _CustomerMode.existing &&
                  _memberLookup != null) ...[
                const SizedBox(height: 14),
                Card(
                  child: ListTile(
                    leading: Icon(
                      _memberLookup!.found
                          ? Icons.verified_outlined
                          : Icons.info_outline,
                    ),
                    title: Text(_memberLookup!.customerName ?? 'Member'),
                    subtitle: Text(
                      '${_memberLookup!.currentTier ?? '-'} - ${_memberLookup!.pointBalance.toStringAsFixed(0)} poin',
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
      const SizedBox(height: 12),
      FilledButton(
        onPressed: _loading ? null : _continueFromCustomer,
        child: Text(
          (_memberLookup?.availableRewards ?? const <LoyaltyReward>[])
                  .isNotEmpty
              ? 'Continue to Redeem Code'
              : 'Continue to Payment',
        ),
      ),
    ];
  }

  List<Widget> _buildRewardStep() {
    final rewards = _memberLookup?.availableRewards ?? const <LoyaltyReward>[];

    return [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Redeem Membership Reward',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
              const SizedBox(height: 8),
              const Text(
                'Pilih reward yang ingin digunakan untuk order ini.',
                style: TextStyle(color: GimsColors.mutedForeground),
              ),
              const SizedBox(height: 10),
              for (final reward in rewards)
                Card(
                  child: RadioListTile<LoyaltyReward>(
                    value: reward,
                    groupValue: _selectedReward,
                    onChanged: (value) =>
                        setState(() => _selectedReward = value),
                    title: Text(reward.name),
                    subtitle: Text(
                      '${reward.type} - ${reward.pointsRequired.toStringAsFixed(0)} poin',
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 12),
      Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: _loading
                  ? null
                  : () => setState(() => _step = _CheckoutStep.customer),
              child: const Text('Back'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton(
              onPressed: _loading
                  ? null
                  : () => setState(() => _step = _CheckoutStep.payment),
              child: const Text('Continue to Payment'),
            ),
          ),
        ],
      ),
    ];
  }

  List<Widget> _buildPaymentStep() {
    final xenditConnected = _xenditStatus?.isConnected == true;

    return [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SegmentedButton<_PaymentTab>(
                segments: const [
                  ButtonSegment(
                    value: _PaymentTab.cash,
                    label: Text('Cash'),
                    icon: Icon(Icons.payments_outlined),
                  ),
                  ButtonSegment(
                    value: _PaymentTab.digital,
                    label: Text('Digital'),
                    icon: Icon(Icons.qr_code_2_outlined),
                  ),
                ],
                selected: {_paymentTab},
                onSelectionChanged: (selection) {
                  setState(() => _paymentTab = selection.first);
                },
              ),
              const SizedBox(height: 12),
              if (_paymentTab == _PaymentTab.cash) ...[
                GridView.builder(
                  itemCount: 4,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                    mainAxisExtent: 50,
                  ),
                  itemBuilder: (context, index) {
                    const amounts = [10000, 20000, 50000, 100000];
                    return _quickAmountButton(amounts[index]);
                  },
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => setState(
                          () => _tender.text = _totalAmount.toStringAsFixed(0),
                        ),
                        child: const Text('Exact'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => setState(() => _tender.clear()),
                        child: const Text('Reset'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(GimsRadius.medium),
                    border: Border.all(color: GimsColors.border),
                    color: Colors.white,
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(
                            Icons.payments_outlined,
                            color: GimsColors.mutedForeground,
                          ),
                          SizedBox(width: 8),
                          Text(
                            'Tender Amount',
                            style: TextStyle(color: GimsColors.mutedForeground),
                          ),
                        ],
                      ),
                      Text(
                        _tenderAmount <= 0
                            ? '0'
                            : formatMoney(
                                _tenderAmount.toDouble(),
                                widget.config?.currency ?? 'IDR',
                              ),
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Amount due: ${formatMoney(_totalAmount, widget.config?.currency ?? 'IDR')}',
                  style: const TextStyle(
                    color: GimsColors.mutedForeground,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 8),
                GridView.builder(
                  itemCount: _numpadKeys.length,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    mainAxisExtent: 44,
                  ),
                  itemBuilder: (context, index) {
                    final key = _numpadKeys[index];
                    final isDelete = key == '⌫';
                    return OutlinedButton(
                      onPressed: _loading ? null : () => _handleNumpadTap(key),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: isDelete
                            ? GimsColors.destructive
                            : GimsColors.foreground,
                        side: BorderSide(
                          color: isDelete
                              ? GimsColors.destructive
                              : GimsColors.border,
                        ),
                      ),
                      child: Text(
                        key,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    _tenderAmount >= _totalAmount
                        ? 'Change: ${formatMoney((_tenderAmount - _totalAmount).toDouble(), widget.config?.currency ?? 'IDR')}'
                        : 'Short: ${formatMoney((_totalAmount - _tenderAmount).toDouble(), widget.config?.currency ?? 'IDR')}',
                    style: TextStyle(
                      color: _tenderAmount >= _totalAmount
                          ? Colors.green
                          : GimsColors.destructive,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                FilledButton.icon(
                  onPressed: _loading ? null : _payCash,
                  icon: _loading
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check_circle_outline),
                  label: const Text('Confirm Cash Payment'),
                ),
              ] else ...[
                if (!xenditConnected)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: Column(
                      children: [
                        Icon(Icons.wifi_off_outlined, size: 36),
                        SizedBox(height: 8),
                        Text(
                          'Digital payment tidak tersedia. Hubungkan profil Xendit pada terminal web.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: GimsColors.mutedForeground),
                        ),
                      ],
                    ),
                  )
                else if (_digitalPayment != null)
                  _buildDigitalStatusCard()
                else
                  _buildDigitalChannels(),
              ],
            ],
          ),
        ),
      ),
      const SizedBox(height: 12),
      Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(GimsRadius.medium),
          border: Border.all(color: GimsColors.border),
        ),
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _loading
                    ? null
                    : () {
                        if (_memberLookup?.availableRewards.isNotEmpty ==
                            true) {
                          setState(() => _step = _CheckoutStep.reward);
                          return;
                        }
                        setState(() => _step = _CheckoutStep.customer);
                      },
                child: const Text('Back'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton(
                onPressed: _loading ? null : _confirmCancelCheckout,
                child: const Text('Cancel'),
              ),
            ),
          ],
        ),
      ),
    ];
  }

  Widget _quickAmountButton(int amount) {
    return OutlinedButton(
      onPressed: () {
        final next = _tenderAmount + amount;
        setState(() => _tender.text = '$next');
      },
      child: Text(
        '+${formatMoney(amount.toDouble(), widget.config?.currency ?? 'IDR')}',
      ),
    );
  }

  Widget _buildDigitalChannels() {
    final categories = ['QR_CODE', 'EWALLET', 'BANK_TRANSFER', 'CARDS'];
    final query = _channelSearch.trim().toLowerCase();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          decoration: const InputDecoration(
            labelText: 'Search payment channel',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: (value) => setState(() => _channelSearch = value),
        ),
        const SizedBox(height: 10),
        for (final category in categories) ...[
          Text(
            _categoryLabel(category),
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          for (final channel in _channels.where((item) {
            if (item.category != category) return false;
            if (query.isEmpty) return true;
            final haystack = '${item.code} ${item.name}'.toLowerCase();
            return haystack.contains(query);
          }))
            Card(
              child: ListTile(
                leading: _ChannelLogo(code: channel.code),
                title: Text(channel.name),
                subtitle: Text(channel.code),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                onTap: _loading ? null : () => _payDigital(channel),
              ),
            ),
          const SizedBox(height: 6),
        ],
      ],
    );
  }

  Widget _buildDigitalStatusCard() {
    final payment = _digitalPayment!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.qr_code_2_outlined),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    payment.channelCode ?? payment.method,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                if (_polling)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Text('Status: ${payment.status}'),
            if (payment.paymentUrl != null && payment.paymentUrl!.isNotEmpty)
              TextButton.icon(
                onPressed: () => openExternal(payment.paymentUrl!),
                icon: const Icon(Icons.open_in_new_outlined),
                label: const Text('Open payment URL'),
              ),
            const SizedBox(height: 4),
            OutlinedButton.icon(
              onPressed: _polling ? null : _resetDigitalSelection,
              icon: const Icon(Icons.arrow_back),
              label: const Text('Back to Channel List'),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildReceiptStep() {
    final payment = _finalPayment;
    final hasPhone = (_resolvedCustomerPhone ?? '').isNotEmpty;

    return [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Receipt',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
              const SizedBox(height: 8),
              Text('Order: ${widget.order.orderNumber}'),
              Text(
                'Payment: ${payment?.method ?? '-'} (${payment?.status ?? '-'})',
              ),
              Text(
                'Total: ${formatMoney(_totalAmount, widget.config?.currency ?? 'IDR')}',
              ),
              const SizedBox(height: 12),
              Container(
                height: 420,
                decoration: BoxDecoration(
                  border: Border.all(color: GimsColors.border),
                  borderRadius: BorderRadius.circular(GimsRadius.medium),
                  color: Colors.white,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(GimsRadius.medium),
                  child: _receiptPreviewError
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.receipt_long_outlined,
                                  color: GimsColors.mutedForeground,
                                ),
                                const SizedBox(height: 10),
                                const Text(
                                  'Preview nota tidak dapat dimuat.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Buka nota di browser untuk melihat printable receipt.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: GimsColors.mutedForeground,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                OutlinedButton.icon(
                                  onPressed: _openReceipt,
                                  icon: const Icon(Icons.open_in_new_outlined),
                                  label: const Text('Buka Nota'),
                                ),
                              ],
                            ),
                          ),
                        )
                      : WebViewWidget(controller: _receiptPreviewController!),
                ),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 12),
      Row(
        children: [
          Expanded(
            child: FilledButton.icon(
              onPressed: hasPhone ? _sendWhatsApp : null,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(64),
                backgroundColor: GimsColors.success,
              ),
              icon: SvgPicture.asset(
                'assets/logo/whatsapp-svgrepo-com.svg',
                width: 22,
                height: 22,
              ),
              label: const Text(
                'Kirim WA',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FilledButton(
              onPressed: _finishCheckout,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(64),
              ),
              child: const Text(
                'Done',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    ];
  }
}

class _ChannelLogo extends StatelessWidget {
  const _ChannelLogo({required this.code});

  final String code;

  @override
  Widget build(BuildContext context) {
    final path = _channelLogos[code];
    if (path == null) {
      return CircleAvatar(
        radius: 16,
        child: Text(code.substring(0, code.length > 3 ? 3 : code.length)),
      );
    }

    if (path.toLowerCase().endsWith('.svg')) {
      return Container(
        width: 52,
        height: 30,
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        decoration: BoxDecoration(
          border: Border.all(color: GimsColors.border),
          borderRadius: BorderRadius.circular(GimsRadius.small),
          color: Colors.white,
        ),
        child: SvgPicture.asset(path, fit: BoxFit.contain),
      );
    }

    return Container(
      width: 52,
      height: 30,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        border: Border.all(color: GimsColors.border),
        borderRadius: BorderRadius.circular(GimsRadius.small),
        color: Colors.white,
      ),
      child: Image.asset(path, fit: BoxFit.contain),
    );
  }
}

class _StepChip extends StatelessWidget {
  const _StepChip({
    required this.label,
    required this.icon,
    required this.active,
  });

  final String label;
  final IconData icon;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(GimsRadius.medium),
        border: Border.all(
          color: active ? GimsColors.primary : GimsColors.border,
        ),
        color: active
            ? GimsColors.primary.withValues(alpha: 0.08)
            : Colors.white,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 16,
            color: active ? GimsColors.primary : GimsColors.mutedForeground,
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: active ? GimsColors.primary : GimsColors.mutedForeground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _categoryLabel(String category) {
  switch (category) {
    case 'QR_CODE':
      return 'QRIS';
    case 'EWALLET':
      return 'E-Wallet';
    case 'BANK_TRANSFER':
      return 'Bank Transfer';
    case 'CARDS':
      return 'Cards';
    default:
      return category;
  }
}

String _formatDateTime(DateTime value) {
  final local = value.toLocal();
  final month = <int, String>{
    1: 'Jan',
    2: 'Feb',
    3: 'Mar',
    4: 'Apr',
    5: 'May',
    6: 'Jun',
    7: 'Jul',
    8: 'Aug',
    9: 'Sep',
    10: 'Oct',
    11: 'Nov',
    12: 'Dec',
  };

  return '${local.day} ${month[local.month]} ${local.year} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

String _renderWhatsAppTemplate({
  required String template,
  required Map<String, String> values,
}) {
  final base = template.trim().isEmpty
      ? 'Halo #customer_name, ini receipt order #order_number dari #outlet_name. Total #total_amount. Terima kasih.'
      : template;

  return base
      .replaceAllMapped(RegExp(r'#([A-Za-z0-9_]+)'), (match) {
        final tag = match.group(1) ?? '';
        return values[tag] ?? match.group(0) ?? '';
      })
      .replaceAll('\u202f', ' ');
}

String _formatWhatsAppLink(String phone, String message) {
  final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
  final target = digits.isEmpty ? '' : digits;
  if (target.isEmpty) {
    return 'https://wa.me/?text=${Uri.encodeComponent(message)}';
  }
  return 'https://wa.me/$target?text=${Uri.encodeComponent(message)}';
}

double _normalizeRewardPercent(double value) {
  if (value <= 0) return 0;
  if (value > 100) return value > 1000 ? value / 1000 : value / 100;
  return value;
}

double _calculateRewardDiscount(double baseAmount, LoyaltyReward? reward) {
  if (reward == null || baseAmount <= 0) return 0;

  if (reward.type == 'discount_fixed') {
    if (reward.value > baseAmount) return baseAmount;
    if (reward.value < 0) return 0;
    return reward.value;
  }

  if (reward.type == 'discount_percent') {
    final pct = _normalizeRewardPercent(reward.value);
    final amount = (baseAmount * pct) / 100;
    if (amount < 0) return 0;
    return amount;
  }

  return 0;
}
