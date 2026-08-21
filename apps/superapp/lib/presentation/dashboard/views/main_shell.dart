import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../auth/viewmodels/auth_viewmodel.dart';
import '../../auth/views/login_page.dart';
import '../viewmodels/dashboard_viewmodel.dart';
import 'staff_dashboard_view.dart';
import 'admin_dashboard_view.dart';
import '../../meal_order/views/meal_order_page.dart';
import '../../room_booking/views/room_booking_page.dart';
import '../../asset_borrowing/views/asset_borrowing_page.dart';
import '../../manufacturing/views/manufacturing_dashboard_page.dart';
import '../../profile/views/profile_page.dart';

class MainShell extends StatelessWidget {
  const MainShell({super.key});

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final dashVm = context.watch<DashboardViewModel>();

    final user = authVm.currentUser;
    if (user == null) {
      return const LoginPage();
    }

    final isAdmin = user.isAdmin;

    final List<Widget> pages = [
      isAdmin ? const AdminDashboardView() : const StaffDashboardView(),
      const MealOrderPage(),
      const RoomBookingPage(),
      const AssetBorrowingPage(),
      if (isAdmin) const ManufacturingDashboardPage(),
      const ProfilePage(),
    ];

    final currentIndex = dashVm.currentIndex.clamp(0, pages.length - 1);

    return Scaffold(
      extendBody: true,
      backgroundColor: AppColors.background,
      body: pages[currentIndex],
      // Floating Dock Navigation Bar
      bottomNavigationBar: Container(
        margin: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(30),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.12),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(30),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: BottomNavigationBar(
              currentIndex: currentIndex,
              onTap: (index) => dashVm.setIndex(index),
              selectedItemColor: AppColors.primary,
              unselectedItemColor: AppColors.textMuted,
              type: BottomNavigationBarType.fixed,
              backgroundColor: AppColors.surface,
              elevation: 0,
              selectedFontSize: 11,
              unselectedFontSize: 11,
              selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold),
              items: [
                const BottomNavigationBarItem(
                  icon: Icon(Icons.grid_view_rounded),
                  label: "Beranda",
                ),
                const BottomNavigationBarItem(
                  icon: Icon(Icons.restaurant_rounded),
                  label: "Kantin",
                ),
                const BottomNavigationBarItem(
                  icon: Icon(Icons.meeting_room_rounded),
                  label: "Booking",
                ),
                const BottomNavigationBarItem(
                  icon: Icon(Icons.inventory_2_rounded),
                  label: "Aset",
                ),
                if (isAdmin)
                  const BottomNavigationBarItem(
                    icon: Icon(Icons.precision_manufacturing_rounded),
                    label: "Manufaktur",
                  ),
                const BottomNavigationBarItem(
                  icon: Icon(Icons.person_rounded),
                  label: "Profil",
                ),
              ],
            ),
          ),
        ),
      ),
      drawer: Drawer(
        child: SafeArea(
          child: Column(
            children: [
              UserAccountsDrawerHeader(
                decoration: const BoxDecoration(color: AppColors.secondary),
                currentAccountPicture: ClipOval(
                  child: Image.asset('assets/logo.jpg', fit: BoxFit.cover),
                ),
                accountName: Text(user.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                accountEmail: Text(user.email),
              ),
              ListTile(
                leading: const Icon(Icons.person_rounded),
                title: Text("Role Saat Ini: ${isAdmin ? 'ADMIN' : 'STAFF'}"),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.logout_rounded, color: AppColors.danger),
                title: const Text("Keluar (Ganti Role)", style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold)),
                onTap: () {
                  Navigator.pop(context); // Close drawer
                  authVm.logout();
                  dashVm.setIndex(0);
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const LoginPage()),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
