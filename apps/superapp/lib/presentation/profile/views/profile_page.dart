import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/viewmodels/auth_viewmodel.dart';
import '../../auth/views/login_page.dart';
import '../../dashboard/viewmodels/dashboard_viewmodel.dart';
import '../../payroll/views/payroll_page.dart';
import '../../hris/views/attendance_page.dart';
import '../../asset_borrowing/views/asset_borrowing_page.dart';
import '../../room_booking/views/room_booking_page.dart';
import '../../ticketing/views/ticketing_page.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final dashVm = context.read<DashboardViewModel>();
    final user = authVm.currentUser;

    if (user == null) {
      return const LoginPage();
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        centerTitle: false,
        title: const Text(
          "Profil Saya",
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Centered Clean Profile Avatar Header
            Center(
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: AppColors.primaryGradient,
                    ),
                    child: CircleAvatar(
                      radius: 44,
                      backgroundImage: NetworkImage(user.avatarUrl),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user.name,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user.position,
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      StatusBadge(
                        label: user.isAdmin ? "ADMIN ACCESS" : "STAFF ROLE",
                        type: user.isAdmin ? BadgeType.danger : BadgeType.success,
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primarySoft,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          "NIP: ${user.id.toUpperCase()}",
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // SECTION 1: AKSI HRIS & KEUANGAN
            const Text(
              "Akses HRIS & Keuangan",
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 10),
            CustomCard(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Column(
                children: [
                  _buildCleanTile(
                    icon: Icons.account_balance_wallet_outlined,
                    title: "Slip Gaji & Payroll",
                    subtitle: "Lihat rincian Take Home Pay bulan ini",
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => PayrollPage(isOversightMode: user.isAdmin)),
                      );
                    },
                  ),
                  _buildCleanTile(
                    icon: Icons.calendar_month_outlined,
                    title: "Rekap Absensi & Kalender HRIS",
                    subtitle: "Lihat riwayat jam presensi & ajukan cuti",
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => AttendancePage(isOversightMode: user.isAdmin)),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // SECTION 2: LAYANAN OPERASIONAL SAYA
            const Text(
              "Layanan Operasional",
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 10),
            CustomCard(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Column(
                children: [
                  _buildCleanTile(
                    icon: Icons.confirmation_number_outlined,
                    title: "Tiket Kendala Saya",
                    subtitle: "Laporkan masalah IT atau Fasilitas",
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const TicketingPage()));
                    },
                  ),
                  _buildCleanTile(
                    icon: Icons.meeting_room_outlined,
                    title: "Reservasi Ruang Meeting",
                    subtitle: "Pemesanan slot ruang rapat internal",
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const RoomBookingPage()));
                    },
                  ),
                  _buildCleanTile(
                    icon: Icons.inventory_2_outlined,
                    title: "Peminjaman Aset Saya",
                    subtitle: "Pinjam peralatan & perlengkapan kerja",
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const AssetBorrowingPage()));
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // SECTION 3: PENGATURAN & AKUN
            const Text(
              "Pengaturan & Akun",
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 10),
            CustomCard(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Column(
                children: [
                  _buildCleanTile(
                    icon: Icons.email_outlined,
                    title: "Email Perusahaan",
                    subtitle: user.email,
                  ),
                  _buildCleanTile(
                    icon: Icons.business_outlined,
                    title: "Departemen",
                    subtitle: user.isAdmin ? "Operational & Management" : "Pabrik Produksi A",
                  ),
                  _buildSwitchTile(
                    icon: Icons.fingerprint_outlined,
                    title: "Autentikasi Biometrik / Face ID",
                    value: true,
                  ),
                  _buildSwitchTile(
                    icon: Icons.notifications_active_outlined,
                    title: "Notifikasi Presensi & Makan",
                    value: true,
                  ),
                  _buildCleanTile(
                    icon: Icons.swap_horiz_outlined,
                    title: "Beralih Role System (Prototype)",
                    subtitle: "Saat ini login sebagai ${user.isAdmin ? 'Admin' : 'Staff'}",
                    onTap: () {
                      if (user.isAdmin) {
                        authVm.loginAsStaff();
                      } else {
                        authVm.loginAsAdmin();
                      }
                      dashVm.setIndex(0);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text("Berhasil beralih ke role ${authVm.currentUser?.isAdmin == true ? 'ADMIN' : 'STAFF'}"),
                          backgroundColor: AppColors.primary,
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Clean Minimalist Logout Button
            ElevatedButton(
              onPressed: () => _confirmLogout(context, authVm, dashVm),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                backgroundColor: AppColors.dangerBg,
                foregroundColor: AppColors.danger,
                elevation: 0,
                side: const BorderSide(color: AppColors.danger, width: 1),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.logout_rounded, color: AppColors.danger, size: 18),
                  SizedBox(width: 8),
                  Text(
                    "Keluar dari Akun (Logout)",
                    style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Center(
              child: Text(
                "SuperApp Meccaya v2.5.0 • Enterprise Edition",
                style: TextStyle(color: AppColors.textMuted, fontSize: 11),
              ),
            ),
            const SizedBox(height: 60), // Spacing for floating dock
          ],
        ),
      ),
    );
  }

  Widget _buildCleanTile({
    required IconData icon,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      leading: Icon(icon, color: AppColors.textSecondary, size: 22),
      title: Text(
        title,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
      ),
      trailing: onTap != null ? const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20) : null,
      onTap: onTap,
    );
  }

  Widget _buildSwitchTile({
    required IconData icon,
    required String title,
    required bool value,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
      leading: Icon(icon, color: AppColors.textSecondary, size: 22),
      title: Text(
        title,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      ),
      trailing: Switch(
        value: value,
        activeTrackColor: AppColors.primary,
        onChanged: (val) {},
      ),
    );
  }

  void _confirmLogout(BuildContext context, AuthViewModel authVm, DashboardViewModel dashVm) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: AppColors.danger),
            SizedBox(width: 8),
            Text("Konfirmasi Keluar"),
          ],
        ),
        content: const Text("Apakah Anda yakin ingin keluar dari aplikasi SuperApp Meccaya?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Batal", style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              authVm.logout();
              dashVm.setIndex(0);
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const LoginPage()),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text("Keluar", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
