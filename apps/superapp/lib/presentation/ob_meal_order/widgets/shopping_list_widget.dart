import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../meal_order/viewmodels/meal_order_viewmodel.dart';

class ShoppingListWidget extends StatelessWidget {
  const ShoppingListWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<MealOrderViewModel>(
      builder: (context, vm, child) {
        final items = vm.aggregatedShoppingList;

        if (items.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check_circle_outline_rounded, size: 48, color: AppColors.primary),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "Daftar Belanja Kosong",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    "Belum ada titipan makanan aktif yang perlu dibeli saat ini.",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          );
        }

        return ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            // Banner summary count
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.shopping_bag_rounded, color: AppColors.primary, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Total ${items.length} Jenis Menu Makanan",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          "Centang daftar belanja di bawah setelah Anda membelinya di kantin/warung.",
                          style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            ...items.map((item) {
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                child: CustomCard(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          // Interactive Checkbox for OB
                          Transform.scale(
                            scale: 1.1,
                            child: Checkbox(
                              value: item.isAllChecked,
                              activeColor: AppColors.success,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                              onChanged: (_) {
                                vm.toggleGroupShoppingCheck(item.orderIds);
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.menuItemName,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: item.isAllChecked ? AppColors.textMuted : AppColors.textPrimary,
                                    decoration: item.isAllChecked ? TextDecoration.lineThrough : null,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  "Kategori: ${item.category}",
                                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          // Quantity Pill Badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: item.isAllChecked ? Colors.grey[200] : AppColors.primary,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              "${item.totalQuantity}x Porsi",
                              style: TextStyle(
                                color: item.isAllChecked ? AppColors.textMuted : Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),

                      // Notes breakdown per customer
                      if (item.notes.isNotEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 6),
                          child: Divider(height: 1, color: AppColors.cardBorder),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: item.notes.map((noteStr) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.sticky_note_2_rounded, size: 13, color: AppColors.warning),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      noteStr,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: item.isAllChecked ? AppColors.textMuted : AppColors.textPrimary,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }),

            const SizedBox(height: 40),
          ],
        );
      },
    );
  }
}
