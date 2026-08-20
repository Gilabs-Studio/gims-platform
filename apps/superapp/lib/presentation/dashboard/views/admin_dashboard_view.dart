import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/viewmodels/auth_viewmodel.dart';
import '../viewmodels/dashboard_viewmodel.dart';
import '../../manufacturing/viewmodels/manufacturing_viewmodel.dart';

import '../../payroll/views/payroll_page.dart';
import '../../hris/views/attendance_page.dart';

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
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Admin Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  InkWell(
                    onTap: () => dashVm.setIndex(5), // Profile tab
                    borderRadius: BorderRadius.circular(12),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(2),
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: AppColors.adminHeaderGradient,
                          ),
                          child: CircleAvatar(
                            radius: 24,
                            backgroundImage: NetworkImage(user?.avatarUrl ?? "https://i.pravatar.cc/150"),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user?.name ?? "Admin Enterprise",
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textPrimary),
                            ),
                            Text(
                              user?.position ?? "General Manager & Owner",
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const StatusBadge(label: "ADMIN ACCESS", type: BadgeType.danger),
                ],
              ),
              const SizedBox(height: 20),

              // ADVANCED OWNER MONITORING HERO BANNER
              CustomCard(
                gradient: AppColors.darkCardGradient,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 6),
                            const Text("REAL-TIME OWNER MONITORING", style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        Text(
                          "OEE Pabrik: ${mfgVm.averageOee.toStringAsFixed(1)}%",
                          style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      "Monitoring Sensor Telemetri & Mesin",
                      style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      "Pantau status 6 mesin pabrik, deteksi breakdown & overload suhu real-time dari manapun.",
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const SizedBox(height: 18),

                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => dashVm.setIndex(4), // Open Manufacturing Dashboard Tab
                            icon: const Icon(Icons.analytics_rounded, size: 18),
                            label: const Text("Buka Live Telemetri Mesin", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              elevation: 2,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Executive Quick Metric Grid
              const Text("Ringkasan Eksekutif Pabrik", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: CustomCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Status Mesin", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                          const SizedBox(height: 4),
                          Text(
                            "${mfgVm.runningCount} Run / ${mfgVm.downtimeCount} Down",
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CustomCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("OEE Average", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                          const SizedBox(height: 4),
                          Text(
                            "${mfgVm.averageOee.toStringAsFixed(1)}%",
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.success),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Admin All Module Grid
              const Text("Modul Enterprise Lengkap", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: _buildAdminTile(
                      icon: Icons.precision_manufacturing_rounded,
                      title: "Manufacturing ERP",
                      subtitle: "Downtime, OEE & Sensor",
                      color: AppColors.primary,
                      onTap: () => dashVm.setIndex(4),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildAdminTile(
                      icon: Icons.restaurant_rounded,
                      title: "Order Makan OB",
                      subtitle: "Monitoring Kantin",
                      color: AppColors.warning,
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
                      subtitle: "Rekap Absen & Kalender",
                      color: AppColors.success,
                      onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendancePage(isOversightMode: true)));
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildAdminTile(
                      icon: Icons.account_balance_wallet_rounded,
                      title: "Payroll Oversight",
                      subtitle: "Audit Slip Gaji Staff",
                      color: AppColors.accent,
                      onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const PayrollPage(isOversightMode: true)));
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildAdminTile(
                icon: Icons.person_rounded,
                title: "Profil & Pengaturan Sistem",
                subtitle: "Kelola akun admin, preferensi, & role switcher",
                color: AppColors.secondary,
                onTap: () => dashVm.setIndex(5),
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
      padding: const EdgeInsets.all(16),
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
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
        ],
      ),
    );
  }
}
