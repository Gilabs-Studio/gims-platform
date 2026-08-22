import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/constants/app_colors.dart';
import 'data/datasources/mock_payroll_datasource.dart';
import 'data/datasources/mock_hris_datasource.dart';
import 'data/datasources/mock_meal_datasource.dart';
import 'data/datasources/mock_manufacturing_datasource.dart';
import 'data/repositories/payroll_repository_impl.dart';
import 'data/repositories/hris_repository_impl.dart';
import 'data/repositories/meal_repository_impl.dart';
import 'data/repositories/manufacturing_repository_impl.dart';
import 'domain/repositories/payroll_repository.dart';
import 'domain/repositories/hris_repository.dart';
import 'domain/repositories/meal_repository.dart';
import 'domain/repositories/manufacturing_repository.dart';
import 'presentation/auth/viewmodels/auth_viewmodel.dart';
import 'presentation/dashboard/viewmodels/dashboard_viewmodel.dart';
import 'presentation/payroll/viewmodels/payroll_viewmodel.dart';
import 'presentation/hris/viewmodels/attendance_viewmodel.dart';
import 'presentation/meal_order/viewmodels/meal_order_viewmodel.dart';
import 'presentation/manufacturing/viewmodels/manufacturing_viewmodel.dart';
import 'presentation/auth/views/login_page.dart';
import 'presentation/dashboard/views/main_shell.dart';
import 'presentation/ob_meal_order/views/ob_main_shell.dart';

class SuperApp extends StatelessWidget {
  const SuperApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // 1. Data Sources
        Provider(create: (_) => MockPayrollDatasource()),
        Provider(create: (_) => MockHrisDatasource()),
        Provider(create: (_) => MockMealDatasource()),
        Provider(create: (_) => MockManufacturingDatasource()),

        // 2. Repositories
        ProxyProvider<MockPayrollDatasource, PayrollRepository>(
          update: (_, ds, targetRepo) => PayrollRepositoryImpl(datasource: ds),
        ),
        ProxyProvider<MockHrisDatasource, HrisRepository>(
          update: (_, ds, targetRepo) => HrisRepositoryImpl(datasource: ds),
        ),
        ProxyProvider<MockMealDatasource, MealRepository>(
          update: (_, ds, targetRepo) => MealRepositoryImpl(datasource: ds),
        ),
        ProxyProvider<MockManufacturingDatasource, ManufacturingRepository>(
          update: (_, ds, targetRepo) => ManufacturingRepositoryImpl(datasource: ds),
        ),

        // 3. ViewModels
        ChangeNotifierProvider(create: (_) => AuthViewModel()),
        ChangeNotifierProvider(create: (_) => DashboardViewModel()),
        ChangeNotifierProxyProvider<PayrollRepository, PayrollViewModel>(
          create: (ctx) => PayrollViewModel(ctx.read<PayrollRepository>()),
          update: (_, repo, vm) => vm ?? PayrollViewModel(repo),
        ),
        ChangeNotifierProxyProvider<HrisRepository, AttendanceViewModel>(
          create: (ctx) => AttendanceViewModel(ctx.read<HrisRepository>()),
          update: (_, repo, vm) => vm ?? AttendanceViewModel(repo),
        ),
        ChangeNotifierProxyProvider<MealRepository, MealOrderViewModel>(
          create: (ctx) => MealOrderViewModel(ctx.read<MealRepository>()),
          update: (_, repo, vm) => vm ?? MealOrderViewModel(repo),
        ),
        ChangeNotifierProxyProvider<ManufacturingRepository, ManufacturingViewModel>(
          create: (ctx) => ManufacturingViewModel(ctx.read<ManufacturingRepository>()),
          update: (_, repo, vm) => vm ?? ManufacturingViewModel(repo),
        ),
      ],
      child: MaterialApp(
        title: 'GIMS SuperApp',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: AppColors.primary,
            primary: AppColors.primary,
            surface: AppColors.surface,
          ),
          textTheme: GoogleFonts.interTextTheme(Theme.of(context).textTheme),
        ),
        home: Consumer<AuthViewModel>(
          builder: (context, auth, _) {
            if (auth.isLoggedIn) {
              if (auth.currentUser?.isOb == true) {
                return const ObMainShell();
              }
              return const MainShell();
            }
            return const LoginPage();
          },
        ),
      ),
    );
  }
}
