import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/viewmodels/auth_viewmodel.dart';
import '../viewmodels/dashboard_viewmodel.dart';
import '../../manufacturing/viewmodels/manufacturing_viewmodel.dart';

class AdminDashboardView extends StatelessWidget {
  const AdminDashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthViewModel>().currentUser;
    final mfgVm = context.watch<ManufacturingViewModel>();
    final dashVm = context.read<DashboardViewModel>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Admin Header
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
                            user?.name ?? "Admin Enterprise",
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Text(
                            user?.position ?? "General Manager",
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const StatusBadge(label: "ADMIN ACCESS", type: BadgeType.danger),
                ],
              ),
              const SizedBox(height: 24),

              // Highlight Banner: Manufacturing ERP Efficiency Dashboard Access
              CustomCard(
                gradient: AppColors.adminHeaderGradient,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const StatusBadge(label: "MONITORING ERP DOWNTIME", type: BadgeType.warning),
                        Text(
                          "OEE Pabrik: ${mfgVm.averageOee.toStringAsFixed(1)}%",
                          style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      "Dashboard Monitoring Efisiensi Mesin",
                      style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      "Monitoring status mesin real-time (Running/Idle/Downtime), output vs target per line, & alert kerusakan otomatis.",
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => dashVm.setIndex(4), // Manufacturing Dashboard Tab
                      icon: const Icon(Icons.precision_manufacturing_rounded, size: 16),
                      label: const Text("Buka Live Dashboard Mesin", style: TextStyle(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Admin All Modul Access Grid
              const Text("Modul Lengkap Enterprise (Admin Oversight)", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: _buildAdminTile(
                      icon: Icons.precision_manufacturing_rounded,
                      title: "Manufacturing ERP",
                      subtitle: "Downtime, OEE & Alert",
                      color: AppColors.danger,
                      onTap: () => dashVm.setIndex(4),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildAdminTile(
                      icon: Icons.account_balance_wallet_rounded,
                      title: "Payroll Oversight",
                      subtitle: "Audit Slip Gaji Staff",
                      color: AppColors.primary,
                      onTap: () => dashVm.setIndex(1),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildAdminTile(
                      icon: Icons.access_time_filled_rounded,
                      title: "HRIS Presensi",
                      subtitle: "Rekap Absen & Cuti",
                      color: AppColors.success,
                      onTap: () => dashVm.setIndex(2),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildAdminTile(
                      icon: Icons.restaurant_rounded,
                      title: "Order Makan OB",
                      subtitle: "Monitoring Pesanan OB",
                      color: AppColors.warning,
                      onTap: () => dashVm.setIndex(3),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAdminTile({
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
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
        ],
      ),
    );
  }
}
