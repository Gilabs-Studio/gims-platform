import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/error_utils.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../outlet/domain/models/outlet.dart';
import '../domain/models/pos_order.dart';

class SavedTransactionsScreen extends StatefulWidget {
  const SavedTransactionsScreen({
    super.key,
    required this.outlet,
    required this.onApplyOrder,
  });

  final Outlet outlet;
  final ValueChanged<PosOrder> onApplyOrder;

  @override
  State<SavedTransactionsScreen> createState() => _SavedTransactionsScreenState();
}

class _SavedTransactionsScreenState extends State<SavedTransactionsScreen> {
  List<PosOrder> _drafts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadDrafts();
  }

  Future<void> _loadDrafts() async {
    setState(() => _loading = true);
    try {
      final orders = await ServiceLocator.instance.terminalService.listOrders(
        outletId: widget.outlet.id,
        status: 'DRAFT',
      );
      // Filter out drafts that are linked to a table (since those are managed on the floor plan)
      setState(() {
        _drafts = orders.where((o) => o.tableId == null).toList();
      });
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _deleteDraft(PosOrder order) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus Transaksi'),
        content: Text('Apakah Anda yakin ingin menghapus draft transaksi #${order.orderNumber}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: GimsColors.destructive),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _loading = true);
    try {
      await ServiceLocator.instance.terminalService.deleteOrder(order.id);
      if (mounted) {
        showNotification(context, 'Draft #${order.orderNumber} berhasil dihapus');
      }
      _loadDrafts();
    } catch (error) {
      if (mounted) showError(context, error);
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: GimsColors.background,
      body: _drafts.isEmpty
          ? const EmptyState(
              icon: Icons.archive_outlined,
              title: 'Tidak Ada Transaksi Tersimpan',
              message: 'Semua draft transaksi saat ini kosong atau telah diproses.',
            )
          : RefreshIndicator(
              onRefresh: _loadDrafts,
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                itemCount: _drafts.length,
                itemBuilder: (context, index) {
                  final draft = _drafts[index];
                  final itemsSummary = draft.items
                      .map((i) => '${i.quantity.toInt()}x ${i.productName}')
                      .join(', ');

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(
                        color: GimsColors.border.withValues(alpha: 0.5),
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '#${draft.orderNumber}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    draft.customerName != null && draft.customerName!.isNotEmpty
                                        ? draft.customerName!
                                        : 'Walk-in Customer',
                                    style: TextStyle(
                                      color: GimsColors.mutedForeground,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                              Text(
                                'Rp ${draft.totalAmount.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 18,
                                  color: GimsColors.primary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Divider(height: 1),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              const Icon(
                                Icons.shopping_bag_outlined,
                                size: 16,
                                color: GimsColors.mutedForeground,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  itemsSummary.isNotEmpty ? itemsSummary : 'Tidak ada item',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: GimsColors.foreground,
                                    height: 1.3,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () => _deleteDraft(draft),
                                  icon: const Icon(Icons.delete_outline, size: 16),
                                  label: const Text('Hapus'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: GimsColors.destructive,
                                    side: BorderSide(color: GimsColors.destructive.withValues(alpha: 0.5)),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: FilledButton.icon(
                                  onPressed: () => widget.onApplyOrder(draft),
                                  icon: const Icon(Icons.play_arrow_outlined, size: 16),
                                  label: const Text('Lanjutkan'),
                                  style: FilledButton.styleFrom(
                                    backgroundColor: GimsColors.primary,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
