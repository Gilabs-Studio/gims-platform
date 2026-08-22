import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/viewmodels/auth_viewmodel.dart';
import '../viewmodels/dashboard_viewmodel.dart';
import '../../hris/viewmodels/attendance_viewmodel.dart';
import '../../meal_order/viewmodels/meal_order_viewmodel.dart';
import '../../hris/views/attendance_page.dart';
import '../../ticketing/views/ticketing_page.dart';
import '../../room_booking/views/room_booking_page.dart';
import '../../asset_borrowing/views/asset_borrowing_page.dart';

class StaffDashboardView extends StatelessWidget {
  const StaffDashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthViewModel>().currentUser;
    final attendanceVm = context.watch<AttendanceViewModel>();
    final mealVm = context.watch<MealOrderViewModel>();
    final dashVm = context.read<DashboardViewModel>();

    final today = attendanceVm.todayAttendance;
    final isClockedIn = attendanceVm.isClockedIn;
    final profileIndex = user?.isAdmin == true ? 5 : 4;

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
                  // User Greeting Header (8-pt spacing)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      InkWell(
                        onTap: () => dashVm.setIndex(profileIndex),
                        borderRadius: BorderRadius.circular(16),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: AppColors.primaryGradient,
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
                                  "Halo, ${user?.name.split(' ')[0] ?? 'Staff'} 👋",
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 18,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                Text(
                                  user?.position ?? "Staff Production",
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Row(
                        children: [
                          IconButton(
                            onPressed: () {
                              Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendancePage(isOversightMode: false)));
                            },
                            icon: const Icon(Icons.calendar_month_rounded, color: AppColors.primary, size: 22),
                            tooltip: "Detail HRIS Absensi",
                            style: IconButton.styleFrom(
                              backgroundColor: AppColors.surface,
                              elevation: 1,
                              shadowColor: Colors.black12,
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            onPressed: () => dashVm.setIndex(profileIndex),
                            icon: const Icon(Icons.person_outline_rounded, color: AppColors.textPrimary, size: 22),
                            style: IconButton.styleFrom(
                              backgroundColor: AppColors.surface,
                              elevation: 1,
                              shadowColor: Colors.black12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // HERO ATTENDANCE DRAWER CARD (24px Radius)
                  CustomCard(
                    borderRadius: BorderRadius.circular(24),
                    gradient: AppColors.primaryGradient,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.verified_rounded, color: Colors.white, size: 16),
                                const SizedBox(width: 6),
                                Text(
                                  DateFormatter.formatFullDate(DateTime.now()),
                                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                            StatusBadge(
                              label: isClockedIn ? "PRESENSI MASUK" : "BELUM ABSEN",
                              type: isClockedIn ? BadgeType.success : BadgeType.warning,
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("Jam Masuk", style: TextStyle(color: Colors.white70, fontSize: 11)),
                                  const SizedBox(height: 2),
                                  Text(
                                    today?.checkInTime ?? "--:--",
                                    style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                            Container(width: 1, height: 32, color: Colors.white30),
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.only(left: 16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("Jam Pulang", style: TextStyle(color: Colors.white70, fontSize: 11)),
                                    const SizedBox(height: 2),
                                    Text(
                                      today?.checkOutTime ?? "--:--",
                                      style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),

                        // Prominent Solid White Button
                        ElevatedButton(
                          onPressed: () {
                            if (!isClockedIn) {
                              attendanceVm.clockIn("Presensi Langsung via Dashboard Staff");
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("Berhasil Presensi Masuk! Jam tercatat otomatis."),
                                  backgroundColor: AppColors.success,
                                ),
                              );
                            } else {
                              attendanceVm.clockOut();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("Berhasil Presensi Pulang! Terimakasih atas kerja keras Anda hari ini."),
                                  backgroundColor: AppColors.info,
                                ),
                              );
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size.fromHeight(48),
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.primary,
                            elevation: 4,
                            shadowColor: Colors.black26,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                isClockedIn ? Icons.logout_rounded : Icons.fingerprint_rounded,
                                size: 20,
                                color: AppColors.primary,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                isClockedIn ? "Absen Pulang Sekarang (Clock Out)" : "Klik untuk Absen Masuk Sekarang",
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
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
                        icon: Icons.calendar_month_outlined,
                        label: "Cuti",
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendancePage(isOversightMode: false)));
                        },
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

                  // LIVE ITEM PESANAN MAKANAN KANTIN
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Pesanan Makan Hari Ini",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      TextButton(
                        onPressed: () => dashVm.setIndex(1),
                        child: const Text("Lihat Kantin", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (mealVm.orders.isNotEmpty) ...[
                    ...mealVm.orders.map((ord) => Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: CustomCard(
                        borderRadius: BorderRadius.circular(16),
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(14),
                              child: Image.network(
                                ord.menuItem.imageUrl,
                                width: 64,
                                height: 64,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => Container(
                                  width: 64,
                                  height: 64,
                                  color: AppColors.primarySoft,
                                  child: const Icon(Icons.restaurant_rounded, color: AppColors.primary),
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
                                          ord.menuItem.name,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                                        ),
                                      ),
                                      StatusBadge(
                                        label: ord.status,
                                        type: ord.status == "Selesai" ? BadgeType.success : BadgeType.warning,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "Porsi: ${ord.quantity}x • ${CurrencyFormatter.formatRupiah(ord.totalPrice)}",
                                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w500),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    ord.notes.isNotEmpty ? "Catatan: ${ord.notes}" : "Pesanan sedang diproses di kantin",
                                    style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    )),
                  ] else ...[
                    CustomCard(
                      borderRadius: BorderRadius.circular(16),
                      padding: const EdgeInsets.all(16),
                      backgroundColor: AppColors.surface,
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.primarySoft,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: const Icon(Icons.fastfood_rounded, color: AppColors.primary, size: 24),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text("Belum Ada Pesanan Makan", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                SizedBox(height: 2),
                                Text("Pilih menu makan siang hari ini di kantin perusahaan", style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              ],
                            ),
                          ),
                          ElevatedButton(
                            onPressed: () => dashVm.setIndex(1),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text("Pesan", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 90), // Bottom spacing for floating dock navigation
                ],
              ),
            ),
          ),
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
