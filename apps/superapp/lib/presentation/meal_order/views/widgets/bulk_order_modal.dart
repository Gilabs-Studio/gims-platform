import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../domain/entities/meal_entity.dart';
import '../../../auth/viewmodels/auth_viewmodel.dart';
import '../../viewmodels/meal_order_viewmodel.dart';

class BulkOrderModal extends StatefulWidget {
  final List<MealMenuItem> availableMenuItems;

  const BulkOrderModal({super.key, required this.availableMenuItems});

  static void show(BuildContext context, List<MealMenuItem> availableMenuItems) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BulkOrderModal(availableMenuItems: availableMenuItems),
    );
  }

  @override
  State<BulkOrderModal> createState() => _BulkOrderModalState();
}

class _BulkOrderModalState extends State<BulkOrderModal> {
  final TextEditingController _groupNameCtrl = TextEditingController(text: "Pesanan Ramai-Ramai Tim");
  final TextEditingController _overallNotesCtrl = TextEditingController();
  final Map<String, int> _selectedQuantities = {};
  final Map<String, String> _itemNotes = {};

  @override
  void dispose() {
    _groupNameCtrl.dispose();
    _overallNotesCtrl.dispose();
    super.dispose();
  }

  double get _totalPrice {
    double sum = 0;
    _selectedQuantities.forEach((menuId, qty) {
      if (qty > 0) {
        final item = widget.availableMenuItems.firstWhere((m) => m.id == menuId);
        sum += item.price * qty;
      }
    });
    return sum;
  }

  int get _totalPorsi {
    int sum = 0;
    _selectedQuantities.forEach((_, qty) {
      sum += qty;
    });
    return sum;
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = context.read<AuthViewModel>().currentUser;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Pesan Ramai-Ramai (Bulk)",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    "Titip makanan kolektif untuk tim / divisi",
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.groups_rounded, size: 16, color: AppColors.warning),
                    SizedBox(width: 4),
                    Text(
                      "Group Order",
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.warning,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Group Name Input
          TextField(
            controller: _groupNameCtrl,
            decoration: InputDecoration(
              labelText: "Nama Kelompok / Tim",
              hintText: "misal: Makan Siang Tim QA Line 1",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              prefixIcon: const Icon(Icons.group_rounded, color: AppColors.primary),
            ),
          ),
          const SizedBox(height: 14),

          const Text(
            "Pilih Menu & Jumlah Porsi Tim",
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),

          // Menu items list
          Expanded(
            child: ListView.builder(
              itemCount: widget.availableMenuItems.length,
              itemBuilder: (context, index) {
                final item = widget.availableMenuItems[index];
                final qty = _selectedQuantities[item.id] ?? 0;

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: CustomCard(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.network(
                                item.imageUrl,
                                width: 48,
                                height: 48,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => Container(
                                  width: 48,
                                  height: 48,
                                  color: AppColors.primarySoft,
                                  child: const Icon(Icons.restaurant_rounded, color: AppColors.primary),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.name,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                  Text(
                                    CurrencyFormatter.formatRupiah(item.price),
                                    style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            // Counter
                            Container(
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.cardBorder),
                              ),
                              child: Row(
                                children: [
                                  InkWell(
                                    onTap: qty > 0
                                        ? () {
                                            setState(() {
                                              _selectedQuantities[item.id] = qty - 1;
                                            });
                                          }
                                        : null,
                                    child: const Padding(
                                      padding: EdgeInsets.all(6),
                                      child: Icon(Icons.remove_rounded, size: 16),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 6),
                                    child: Text(
                                      "$qty",
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  InkWell(
                                    onTap: () {
                                      setState(() {
                                        _selectedQuantities[item.id] = qty + 1;
                                      });
                                    },
                                    child: const Padding(
                                      padding: EdgeInsets.all(6),
                                      child: Icon(Icons.add_rounded, size: 16),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        if (qty > 0) ...[
                          const SizedBox(height: 8),
                          TextField(
                            onChanged: (val) => _itemNotes[item.id] = val,
                            decoration: InputDecoration(
                              hintText: "Catatan khusus untuk $qty porsi ini (misal: 2 pedas, 1 tanpa cabai)",
                              hintStyle: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 12),

          // Total Summary & Submit
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Total Porsi: $_totalPorsi Porsi",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      CurrencyFormatter.formatRupiah(_totalPrice),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                  ],
                ),
                ElevatedButton(
                  onPressed: _totalPorsi > 0
                      ? () {
                          final List<BulkMealOrderItem> bulkItems = [];
                          _selectedQuantities.forEach((menuId, qty) {
                            if (qty > 0) {
                              final item = widget.availableMenuItems.firstWhere((m) => m.id == menuId);
                              bulkItems.add(BulkMealOrderItem(
                                menuItemId: item.id,
                                menuItemName: item.name,
                                quantity: qty,
                                notes: _itemNotes[item.id] ?? "",
                                price: item.price,
                              ));
                            }
                          });

                          context.read<MealOrderViewModel>().placeBulkOrder(
                                groupName: _groupNameCtrl.text.trim().isEmpty ? "Pesanan Ramai-Ramai" : _groupNameCtrl.text.trim(),
                                customerName: currentUser?.name ?? "Staff Operasional",
                                department: currentUser?.department ?? "Manufaktur",
                                items: bulkItems,
                                notes: "Bulk Order $_totalPorsi porsi",
                              );

                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text("Pesanan Ramai-Ramai ($_totalPorsi porsi) dikirim ke OB!"),
                              backgroundColor: AppColors.success,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text("Kirim Pesanan Bulk", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
