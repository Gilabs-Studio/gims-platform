import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/viewmodels/auth_viewmodel.dart';
import '../viewmodels/dashboard_viewmodel.dart';
import '../../payroll/viewmodels/payroll_viewmodel.dart';
import '../../hris/viewmodels/attendance_viewmodel.dart';
import '../../meal_order/viewmodels/meal_order_viewmodel.dart';

class StaffDashboardView extends StatelessWidget {
  const StaffDashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthViewModel>().currentUser;
    final payrollVm = context.watch<PayrollViewModel>();
    final attendanceVm = context.watch<AttendanceViewModel>();
    final mealVm = context.watch<MealOrderViewModel>();
    final dashVm = context.read<DashboardViewModel>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User Greeting Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundImage: NetworkImage(user?.avatarUrl ?? "https://i.pravatar.cc/150"),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Halo, ${user?.name.split(' ')[0] ?? 'Staff'} 👋",
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                          ),
                          Text(
                            user?.position ?? "Staff Production",
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const StatusBadge(label: "STAFF ROLE", type: BadgeType.info),
                ],
              ),
              const SizedBox(height: 24),

              // Summary Banner Card
              CustomCard(
                gradient: AppColors.primaryGradient,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text("Ringkasan Presensi & Slip Gaji", style: TextStyle(color: Colors.white70, fontSize: 12)),
                        Icon(Icons.auto_awesome_rounded, color: Colors.white70, size: 16),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text("Gaji Agustus 2026", style: TextStyle(color: Colors.white70, fontSize: 11)),
                            Text(
                              CurrencyFormatter.formatRupiah(payrollVm.latestPayslip?.netSalary ?? 0),
                              style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text("Status Absen Hari Ini", style: TextStyle(color: Colors.white70, fontSize: 11)),
                            const SizedBox(height: 4),
                            StatusBadge(
                              label: attendanceVm.isClockedIn ? "PRESENSI MASUK" : "BELUM ABSEN",
                              type: attendanceVm.isClockedIn ? BadgeType.success : BadgeType.warning,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Staff Quick Menu Grid
              const Text("Modul Staff Utama", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: _buildMenuTile(
                      icon: Icons.account_balance_wallet_rounded,
                      title: "Payroll & Slip",
                      subtitle: "Slip Gaji, Lembur, Claim",
                      color: AppColors.primary,
                      onTap: () => dashVm.setIndex(1),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMenuTile(
                      icon: Icons.access_time_filled_rounded,
                      title: "HRIS Absen",
                      subtitle: "Clock-In/Out & Cuti",
                      color: AppColors.success,
                      onTap: () => dashVm.setIndex(2),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildMenuTile(
                icon: Icons.restaurant_rounded,
                title: "Order Makan OB",
                subtitle: "Pilih Menu Harian & Pesan ke OB Kantin Internal",
                color: AppColors.warning,
                onTap: () => dashVm.setIndex(3),
              ),
              const SizedBox(height: 24),

              // Active OB Meal Order Tracker
              if (mealVm.orders.isNotEmpty) ...[
                const Text("Pesanan OB Terakhir", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                CustomCard(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: AppColors.warningBg, borderRadius: BorderRadius.circular(10)),
                        child: const Icon(Icons.restaurant_rounded, color: AppColors.warning, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(mealVm.orders[0].menuItem.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text("Status: ${mealVm.orders[0].status}", style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 18),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return CustomCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
        ],
      ),
    );
  }
}
