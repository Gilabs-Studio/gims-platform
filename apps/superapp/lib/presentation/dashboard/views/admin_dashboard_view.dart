import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/viewmodels/auth_viewmodel.dart';
import '../viewmodels/dashboard_viewmodel.dart';
import '../../manufacturing/viewmodels/manufacturing_viewmodel.dart';
import '../../../domain/entities/manufacturing_entity.dart';
import '../../manufacturing/widgets/oee_donut_chart.dart';
import '../../ticketing/views/ticketing_page.dart';
import '../../room_booking/views/room_booking_page.dart';
import '../../asset_borrowing/views/asset_borrowing_page.dart';

class AdminDashboardView extends StatelessWidget {
  const AdminDashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthViewModel>().currentUser;
    final mfgVm = context.watch<ManufacturingViewModel>();
    final dashVm = context.read<DashboardViewModel>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Top Gradient Atmosphere (myXL Style Deep Backdrop)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 240,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFFEBF5FF),
                    AppColors.background,
                  ],
                ),
              ),
            ),
          ),

          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Admin Header (8-pt spacing)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      InkWell(
                        onTap: () => dashVm.setIndex(5), // Profile tab
                        borderRadius: BorderRadius.circular(16),
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
                  const SizedBox(height: 16),

                  // HERO MANUFACTURING DRAWER CARD (24px Radius Deep Drawer Card)
                  CustomCard(
                    borderRadius: BorderRadius.circular(24),
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                    ),
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
                                  decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
                                ),
                                const SizedBox(width: 6),
                                const Text(
                                  "STATUS MANUFAKTUR PABRIK",
                                  style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            StatusBadge(
                              label: "OEE: ${mfgVm.averageOee.toStringAsFixed(1)}%",
                              type: BadgeType.success,
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    "Monitoring Mesin Telemetri",
                                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    "Pantau live status 6 mesin produksi & sensor IoT real-time.",
                                    style: TextStyle(color: Colors.white70, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Executive Metric Pills (Solid White High Contrast Pills)
                        Row(
                          children: [
                            _buildMetricPill("Running", "${mfgVm.runningCount} Unit", const Color(0xFF10B981)),
                            const SizedBox(width: 8),
                            _buildMetricPill("Downtime", "${mfgVm.downtimeCount} Unit", const Color(0xFFEF4444)),
                            const SizedBox(width: 8),
                            _buildMetricPill("Target", "1,420 pcs", AppColors.textPrimary),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Action Button
                        ElevatedButton.icon(
                          onPressed: () => dashVm.setIndex(4), // Open Manufacturing Dashboard Tab
                          icon: const Icon(Icons.analytics_rounded, size: 18),
                          label: const Text("Buka Live Telemetri Mesin", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size.fromHeight(48),
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.primary,
                            elevation: 2,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // MINIMALIST CIRCULAR QUICK ACTIONS (myXL Style)
                  const Text("Layanan Operasional", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  const SizedBox(height: 16),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildCircularQuickAction(
                        icon: Icons.sensors_outlined,
                        label: "Telemetri",
                        onTap: () => dashVm.setIndex(4),
                      ),
                      _buildCircularQuickAction(
                        icon: Icons.meeting_room_outlined,
                        label: "Booking",
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const RoomBookingPage()));
                        },
                      ),
                      _buildCircularQuickAction(
                        icon: Icons.inventory_2_outlined,
                        label: "Aset",
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const AssetBorrowingPage()));
                        },
                      ),
                      _buildCircularQuickAction(
                        icon: Icons.warning_amber_rounded,
                        label: "Lapor",
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const TicketingPage()));
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Direct Visual Factory Floor Grid
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Visualisasi Denah Mesin Pabrik",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      TextButton(
                        onPressed: () => dashVm.setIndex(4),
                        child: const Text("Detail Telemetri", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.25,
                    ),
                    itemCount: mfgVm.machines.length,
                    itemBuilder: (context, index) {
                      final m = mfgVm.machines[index];
                      final isRunning = m.status == MachineStatus.running;
                      final isDown = m.status == MachineStatus.downtime;

                      return InkWell(
                        onTap: () => dashVm.setIndex(4),
                        borderRadius: BorderRadius.circular(16),
                        child: CustomCard(
                          borderRadius: BorderRadius.circular(16),
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isRunning ? AppColors.successBg : (isDown ? AppColors.dangerBg : AppColors.warningBg),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      m.lineName,
                                      style: TextStyle(
                                        color: isRunning ? AppColors.success : (isDown ? AppColors.danger : AppColors.warning),
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isRunning ? AppColors.success : (isDown ? AppColors.danger : AppColors.warning),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),

                              Row(
                                children: [
                                  OeeDonutChart(
                                    availability: isRunning ? 70 : 18,
                                    performance: isRunning ? 20 : 32,
                                    quality: isRunning ? 10 : 50,
                                    size: 40,
                                    strokeWidth: 6,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          m.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textPrimary),
                                        ),
                                        Text(
                                          "OEE ${m.oeeScore.toStringAsFixed(0)}% • ${isRunning ? "248 P/h" : "14 P/h"}",
                                          style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),

                              // Telemetry stats row
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text("${m.temperature.toStringAsFixed(0)}°C", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: m.temperature > 85 ? AppColors.danger : AppColors.textPrimary)),
                                  Text("Vib: ${m.vibrationLevel}", style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                                  Text("${m.oeeScore.toStringAsFixed(0)}% OEE", style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 90), // Bottom spacing for floating dock navigation
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricPill(String label, String val, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text("$label: ", style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.w500)),
          Text(val, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildCircularQuickAction({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.surface,
              border: Border.all(color: AppColors.cardBorder.withValues(alpha: 0.8), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Icon(icon, color: AppColors.primary, size: 24),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
