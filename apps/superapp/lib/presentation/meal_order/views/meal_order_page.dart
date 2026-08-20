import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../viewmodels/meal_order_viewmodel.dart';
import '../../../domain/entities/meal_entity.dart';

class MealOrderPage extends StatefulWidget {
  const MealOrderPage({super.key});

  @override
  State<MealOrderPage> createState() => _MealOrderPageState();
}

class _MealOrderPageState extends State<MealOrderPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MealOrderViewModel>().loadMealData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MealOrderViewModel>(
      builder: (context, vm, child) {
        if (vm.isLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final categories = ["Semua", "Makanan Utama", "Minuman", "Extra / Snack"];

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            elevation: 0,
            title: const Text(
              "Kantin & Pesanan OB",
              style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Active Order Tracker Banner (Inspired by Reference Image 1 "Cart food")
                if (vm.orders.isNotEmpty) ...[
                  const Text(
                    "Pesanan OB Aktif",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 12),
                  ...vm.orders.map((ord) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: CustomCard(
                      gradient: AppColors.primaryGradient,
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              ord.menuItem.imageUrl,
                              width: 56,
                              height: 56,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                width: 56,
                                height: 56,
                                color: Colors.white24,
                                child: const Icon(Icons.restaurant_rounded, color: Colors.white),
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  ord.menuItem.name,
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  "Porsi: ${ord.quantity}x • ${CurrencyFormatter.formatRupiah(ord.totalPrice)}",
                                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          StatusBadge(
                            label: ord.status,
                            type: ord.status == "Selesai" ? BadgeType.success : BadgeType.warning,
                          ),
                        ],
                      ),
                    ),
                  )),
                  const SizedBox(height: 20),
                ],

                // Category Filter Pills
                const Text(
                  "Pilih Menu Kantin Harian",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: categories.map((cat) {
                      final isSelected = vm.selectedCategory == cat;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(cat),
                          selected: isSelected,
                          onSelected: (_) => vm.selectCategory(cat),
                          selectedColor: AppColors.primary,
                          backgroundColor: AppColors.surface,
                          checkmarkColor: Colors.white,
                          side: BorderSide(
                            color: isSelected ? AppColors.primary : AppColors.cardBorder,
                          ),
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : AppColors.textPrimary,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            fontSize: 12,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),

                // Menu List (Reference Image 1 Food Card layout)
                ...vm.menuItems.map((item) => Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  child: CustomCard(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.network(
                            item.imageUrl,
                            width: 86,
                            height: 86,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(
                              width: 86,
                              height: 86,
                              color: AppColors.primarySoft,
                              child: const Icon(Icons.restaurant_rounded, color: AppColors.primary, size: 28),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      item.name,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      const Icon(Icons.star_rounded, color: AppColors.warning, size: 16),
                                      const SizedBox(width: 2),
                                      Text(
                                        "${item.rating}",
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                item.description,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    CurrencyFormatter.formatRupiah(item.price),
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primary),
                                  ),
                                  ElevatedButton.icon(
                                    onPressed: () => _showOrderModal(context, item),
                                    icon: const Icon(Icons.add_rounded, size: 16),
                                    label: const Text("Pesan"),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                )),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showOrderModal(BuildContext context, MealMenuItem item) {
    final notesCtrl = TextEditingController();
    int qty = 1;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final totalPrice = item.price * qty;

            return Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text("Konfirmasi Pesanan OB", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  const SizedBox(height: 12),

                  // Item Summary Card
                  CustomCard(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(item.imageUrl, width: 50, height: 50, fit: BoxFit.cover),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              Text(CurrencyFormatter.formatRupiah(item.price), style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Jumlah Porsi", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_rounded, size: 18),
                              onPressed: qty > 1 ? () => setModalState(() => qty--) : null,
                            ),
                            Text("$qty", style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                            IconButton(
                              icon: const Icon(Icons.add_rounded, size: 18),
                              onPressed: () => setModalState(() => qty++),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  TextField(
                    controller: notesCtrl,
                    decoration: InputDecoration(
                      labelText: "Catatan Khusus (misal: Sambal Dipisah)",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 20),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Total Pembayaran", style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                      Text(
                        CurrencyFormatter.formatRupiah(totalPrice),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  ElevatedButton(
                    onPressed: () {
                      context.read<MealOrderViewModel>().placeOrder(item, qty, notesCtrl.text);
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text("Pesanan ${item.name} berhasil dikirim ke OB Kantin!"),
                          backgroundColor: AppColors.success,
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text("Kirim Pesanan ke OB", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
