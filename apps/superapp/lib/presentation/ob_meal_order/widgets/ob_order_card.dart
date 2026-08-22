import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../domain/entities/meal_entity.dart';

class ObOrderCard extends StatelessWidget {
  final MealOrder order;
  final Function(String orderId, String newStatus) onUpdateStatus;

  const ObOrderCard({
    super.key,
    required this.order,
    required this.onUpdateStatus,
  });

  Color _getStatusBgColor(String status) {
    switch (status) {
      case "Selesai":
        return const Color(0xFFE8F5E9);
      case "Sedang Dibeli":
        return const Color(0xFFE3F2FD);
      case "Siap Diantar":
        return const Color(0xFFE0F7FA);
      case "Diproses OB":
      default:
        return const Color(0xFFFFF8E1);
    }
  }

  Color _getStatusTextColor(String status) {
    switch (status) {
      case "Selesai":
        return const Color(0xFF2E7D32);
      case "Sedang Dibeli":
        return const Color(0xFF1976D2);
      case "Siap Diantar":
        return const Color(0xFF00838F);
      case "Diproses OB":
      default:
        return const Color(0xFFF57F17);
    }
  }

  String _getDisplayStatusLabel(String status) {
    if (status == "Diproses OB") return "Diproses";
    return status;
  }

  String _getNextStatus(String currentStatus) {
    switch (currentStatus) {
      case "Diproses OB":
        return "Sedang Dibeli";
      case "Sedang Dibeli":
        return "Siap Diantar";
      case "Siap Diantar":
        return "Selesai";
      case "Selesai":
      default:
        return "Selesai";
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDone = order.status == "Selesai";
    final nextStatus = _getNextStatus(order.status);

    return CustomCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header Row: Customer Name & Soft Status Pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  order.customerName,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _getStatusBgColor(order.status),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _getDisplayStatusLabel(order.status),
                  style: TextStyle(
                    color: _getStatusTextColor(order.status),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 4),

          // 2. Location / Department Row
          Row(
            children: [
              const Icon(
                Icons.location_on_outlined,
                size: 14,
                color: AppColors.textMuted,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  order.department,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // 3. Order Items Content
          if (order.isBulkOrder && order.bulkItems.isNotEmpty) ...[
            Text(
              order.groupName ?? "Pesanan Kolektif Tim",
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            ...order.bulkItems.map(
              (bItem) => Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Text(
                  "• ${bItem.quantity}x ${bItem.menuItemName}",
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ] else ...[
            Text(
              "${order.quantity}x ${order.menuItem.name}",
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: AppColors.textPrimary,
              ),
            ),
          ],

          const SizedBox(height: 10),

          // 4. Notes & Price Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: order.notes.isNotEmpty
                    ? Row(
                        children: [
                          const Icon(
                            Icons.chat_bubble_outline_rounded,
                            size: 13,
                            color: Color(0xFFF57C00),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              order.notes,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      )
                    : const SizedBox.shrink(),
              ),
              const SizedBox(width: 8),
              Text(
                CurrencyFormatter.formatRupiah(order.totalPrice),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),

          const Padding(
            padding: EdgeInsets.symmetric(vertical: 10),
            child: Divider(height: 1, color: AppColors.cardBorder),
          ),

          // 5. Footer Row: Date/Time & Action Trigger Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Calendar Date & Time
              Row(
                children: [
                  const Icon(
                    Icons.calendar_today_outlined,
                    size: 13,
                    color: AppColors.textMuted,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    "${DateFormatter.formatShortDate(order.orderTime)} • ${DateFormatter.formatTime(order.orderTime)}",
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),

              // Action Trigger Button with Chevron Right
              InkWell(
                onTap: isDone ? null : () => onUpdateStatus(order.id, nextStatus),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isDone) ...[
                        const Icon(
                          Icons.check_circle_rounded,
                          size: 15,
                          color: Color(0xFF2E7D32),
                        ),
                        const SizedBox(width: 4),
                        const Text(
                          "Selesai",
                          style: TextStyle(
                            color: Color(0xFF2E7D32),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 2),
                        const Icon(
                          Icons.chevron_right_rounded,
                          size: 18,
                          color: Color(0xFF2E7D32),
                        ),
                      ] else if (order.status == "Diproses OB") ...[
                        const Icon(
                          Icons.shopping_bag_outlined,
                          size: 15,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 4),
                        const Text(
                          "Tandai Dibeli",
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 2),
                        const Icon(
                          Icons.chevron_right_rounded,
                          size: 18,
                          color: AppColors.primary,
                        ),
                      ] else if (order.status == "Sedang Dibeli") ...[
                        const Icon(
                          Icons.delivery_dining_rounded,
                          size: 15,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 4),
                        const Text(
                          "Siap Diantar",
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 2),
                        const Icon(
                          Icons.chevron_right_rounded,
                          size: 18,
                          color: AppColors.primary,
                        ),
                      ] else ...[
                        const Icon(
                          Icons.check_circle_outline_rounded,
                          size: 15,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 4),
                        const Text(
                          "Selesaikan",
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 2),
                        const Icon(
                          Icons.chevron_right_rounded,
                          size: 18,
                          color: AppColors.primary,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
