import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../meal_order/viewmodels/meal_order_viewmodel.dart';
import '../widgets/shopping_list_widget.dart';
import '../widgets/custom_menu_modal.dart';

class ObOrdersPage extends StatefulWidget {
  const ObOrdersPage({super.key});

  @override
  State<ObOrdersPage> createState() => _ObOrdersPageState();
}

class _ObOrdersPageState extends State<ObOrdersPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MealOrderViewModel>(
      builder: (context, vm, child) {
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            elevation: 0,
            titleSpacing: 20,
            title: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Pesanan Makanan",
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      "Dashboard Kelola Titipan",
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    "${vm.pendingOrdersCount} Aktif",
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: AppColors.textPrimary, size: 22),
                onPressed: () => vm.loadMealData(),
              ),
              const SizedBox(width: 8),
            ],
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(48),
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: Colors.white,
                  unselectedLabelColor: AppColors.textSecondary,
                  labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal, fontSize: 12),
                  dividerColor: Colors.transparent,
                  tabs: [
                    Tab(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text("Pesanan Masuk"),
                          if (vm.pendingOrdersCount > 0) ...[
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.3),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                "${vm.pendingOrdersCount}",
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const Tab(text: "Daftar Belanja"),
                    const Tab(text: "Kelola Menu"),
                  ],
                ),
              ),
            ),
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              // 1. Combined Pesanan Masuk (Single + Bulk)
              _buildCombinedOrdersTab(context, vm),

              // 2. Daftar Belanja Tab (Checkboxes)
              const ShoppingListWidget(),

              // 3. Kelola Menu Tab (OB Admin Custom Menu)
              _buildMenuManagementTab(context, vm),
            ],
          ),
        );
      },
    );
  }

  // --- Combined Tab: Pesanan Masuk (Individual + Bulk Orders) ---
  Widget _buildCombinedOrdersTab(BuildContext context, MealOrderViewModel vm) {
    final activeOrders = vm.orders;

    if (activeOrders.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: AppColors.primarySoft,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.inbox_rounded, size: 40, color: AppColors.primary),
              ),
              const SizedBox(height: 12),
              const Text(
                "Tidak Ada Pesanan Masuk",
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 4),
              const Text(
                "Semua titipan makanan dari staff telah diproses.",
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: activeOrders.length,
      itemBuilder: (context, index) {
        final order = activeOrders[index];
        final isDone = order.status == "Selesai";

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          child: CustomCard(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Customer Name & Department + Order Type Badge & Status Badge
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            order.customerName,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.background,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: AppColors.cardBorder),
                                ),
                                child: Text(
                                  order.department,
                                  style: const TextStyle(fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                                ),
                              ),
                              if (order.isBulkOrder) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.warning.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    "Pesanan Ramai-Ramai",
                                    style: TextStyle(fontSize: 10, color: AppColors.warning, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    StatusBadge(
                      label: order.status,
                      type: isDone
                          ? BadgeType.success
                          : (order.status == "Sedang Dibeli" ? BadgeType.info : BadgeType.warning),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Clean Item Details (No Image, No Avatar)
                if (order.isBulkOrder && order.bulkItems.isNotEmpty) ...[
                  // Bulk Order Items Breakdown
                  Text(
                    order.groupName ?? "Pesanan Kolektif Tim",
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 6),
                  ...order.bulkItems.map((bItem) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "• ${bItem.quantity}x ${bItem.menuItemName}",
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                            ),
                            Text(
                              CurrencyFormatter.formatRupiah(bItem.totalPrice),
                              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      )),
                ] else ...[
                  // Single Item Display
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          "${order.quantity}x ${order.menuItem.name}",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                        ),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 10),

                // Clear & Prominent Total Price Display Banner (Requirement 3)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "Total Harga (${order.quantity} Porsi):",
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                      ),
                      Text(
                        CurrencyFormatter.formatRupiah(order.totalPrice),
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),

                // Catatan Khusus Box
                if (order.notes.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.sticky_note_2_rounded, size: 15, color: AppColors.warning),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            "Catatan: ${order.notes}",
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Action Progress Buttons
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (order.status == "Diproses OB")
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => vm.updateOrderStatus(order.id, "Sedang Dibeli"),
                          icon: const Icon(Icons.shopping_bag_outlined, size: 14),
                          label: const Text("Tandai Sedang Dibeli", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                        ),
                      ),
                    if (order.status == "Sedang Dibeli")
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => vm.updateOrderStatus(order.id, "Siap Diantar"),
                          icon: const Icon(Icons.delivery_dining_rounded, size: 14),
                          label: const Text("Siap Diantar Ke Staff", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                        ),
                      ),
                    if (order.status == "Siap Diantar")
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => vm.updateOrderStatus(order.id, "Selesai"),
                          icon: const Icon(Icons.check_circle_rounded, size: 14),
                          label: const Text("Selesaikan Titipan", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.success,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                        ),
                      ),
                    if (isDone)
                      const Row(
                        children: [
                          Icon(Icons.check_circle_rounded, size: 16, color: AppColors.success),
                          SizedBox(width: 4),
                          Text(
                            "Titipan Selesai Diantar",
                            style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ],
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // --- Sub-Tab: Kelola Menu (OB Custom Menu) ---
  Widget _buildMenuManagementTab(BuildContext context, MealOrderViewModel vm) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Daftar Menu Kantin",
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                  ),
                  Text(
                    "OB Admin dapat mengatur ketersediaan menu",
                    style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => CustomMenuModal.show(context),
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text("Tambah Menu"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: vm.rawMenuItems.length,
            itemBuilder: (context, index) {
              final item = vm.rawMenuItems[index];

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                child: CustomCard(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          item.imageUrl,
                          width: 46,
                          height: 46,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            width: 46,
                            height: 46,
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
                            const SizedBox(height: 2),
                            Text(
                              "${CurrencyFormatter.formatRupiah(item.price)} • ${item.vendorName}",
                              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: item.isAvailableToday,
                        activeTrackColor: AppColors.primary,
                        onChanged: (_) => vm.toggleMenuItemAvailability(item.id),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit_rounded, size: 18, color: AppColors.textSecondary),
                        onPressed: () => CustomMenuModal.show(context, existingItem: item),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
