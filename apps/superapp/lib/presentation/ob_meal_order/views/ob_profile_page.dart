import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../auth/viewmodels/auth_viewmodel.dart';
import '../../auth/views/login_page.dart';
import '../../meal_order/viewmodels/meal_order_viewmodel.dart';

class ObProfilePage extends StatelessWidget {
  const ObProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final mealVm = context.watch<MealOrderViewModel>();
    final user = authVm.currentUser;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: const Text(
          "Profil",
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
          children: [
            // Ultra Clean OB Profile Card
            CustomCard(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: AppColors.primarySoft,
                        backgroundImage: user?.avatarUrl != null ? NetworkImage(user!.avatarUrl) : null,
                        child: user?.avatarUrl == null
                            ? const Icon(Icons.person_rounded, size: 40, color: AppColors.primary)
                            : null,
                      ),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: AppColors.success,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check_rounded, color: Colors.white, size: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  Text(
                    user?.name ?? "Pak Agus (OB Specialist)",
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.position ?? "Personal Food Assistant & OB Specialist",
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    user?.department ?? "Umum & Rumah Tangga Pabrik",
                    style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 16),

                  // Active toggle status
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              mealVm.isObActive ? Icons.notifications_active_rounded : Icons.notifications_off_rounded,
                              color: mealVm.isObActive ? AppColors.success : Colors.grey,
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  mealVm.isObActive ? "Status: Aktif Belanja" : "Status: Off / Istirahat",
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                Text(
                                  mealVm.isObActive ? "Menerima notifikasi titipan baru" : "Titipan baru ditunda sementara",
                                  style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ],
                        ),
                        Switch(
                          value: mealVm.isObActive,
                          activeTrackColor: AppColors.success,
                          onChanged: (_) => mealVm.toggleObActive(),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Daily Stats Grid
            Row(
              children: [
                Expanded(
                  child: CustomCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(color: AppColors.primarySoft, borderRadius: BorderRadius.circular(10)),
                          child: const Icon(Icons.assignment_turned_in_rounded, color: AppColors.primary, size: 20),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          "${mealVm.orders.length}",
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 2),
                        const Text("Total Titipan Today", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: CustomCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(color: AppColors.warning.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                          child: const Icon(Icons.star_rounded, color: AppColors.warning, size: 20),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          "4.9 ★",
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 2),
                        const Text("Rating Kepuasan Staff", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Info Details
            CustomCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildProfileInfoRow(Icons.badge_rounded, "ID Anggota OB", user?.id ?? "OB-7007"),
                  const Divider(height: 16),
                  _buildProfileInfoRow(Icons.access_time_rounded, "Jam Shift Operasional", "07:00 - 17:00 WIB"),
                  const Divider(height: 16),
                  _buildProfileInfoRow(Icons.storefront_rounded, "Area Kerja Utama", "Kantin A, B & Area Produksi"),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Logout Button
            ElevatedButton.icon(
              onPressed: () {
                authVm.logout();
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginPage()),
                );
              },
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: const Text("Keluar (Ganti Akun)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
                backgroundColor: AppColors.danger.withValues(alpha: 0.1),
                foregroundColor: AppColors.danger,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
              Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            ],
          ),
        ),
      ],
    );
  }
}
