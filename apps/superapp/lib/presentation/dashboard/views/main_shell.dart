import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../auth/viewmodels/auth_viewmodel.dart';
import '../../auth/views/login_page.dart';
import '../viewmodels/dashboard_viewmodel.dart';
import 'staff_dashboard_view.dart';
import 'admin_dashboard_view.dart';
import '../../payroll/views/payroll_page.dart';
import '../../hris/views/attendance_page.dart';
import '../../meal_order/views/meal_order_page.dart';
import '../../manufacturing/views/manufacturing_dashboard_page.dart';

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
      PayrollPage(isOversightMode: isAdmin),
      AttendancePage(isOversightMode: isAdmin),
      const MealOrderPage(),
      if (isAdmin) const ManufacturingDashboardPage(),
    ];

    final currentIndex = dashVm.currentIndex.clamp(0, pages.length - 1);

    return Scaffold(
      body: pages[currentIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
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
          items: [
            const BottomNavigationBarItem(
              icon: Icon(Icons.home_rounded),
              label: "Beranda",
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet_rounded),
              label: "Payroll",
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.access_time_filled_rounded),
              label: "HRIS Absen",
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.restaurant_rounded),
              label: "Order Makan",
            ),
            if (isAdmin)
              const BottomNavigationBarItem(
                icon: Icon(Icons.precision_manufacturing_rounded),
                label: "Manufaktur",
              ),
          ],
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
