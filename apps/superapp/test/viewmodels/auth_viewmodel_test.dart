import 'package:flutter_test/flutter_test.dart';
import 'package:superapp/domain/entities/user_role.dart';
import 'package:superapp/presentation/auth/viewmodels/auth_viewmodel.dart';

void main() {
  group('AuthViewModel Unit Tests', () {
    late AuthViewModel viewModel;

    setUp(() {
      viewModel = AuthViewModel();
    });

    test('Initial state should be logged out', () {
      expect(viewModel.isLoggedIn, false);
      expect(viewModel.currentUser, null);
    });

    test('loginAsStaff should set staff profile correctly', () {
      viewModel.loginAsStaff();
      expect(viewModel.isLoggedIn, true);
      expect(viewModel.currentUser?.role, UserRole.staff);
      expect(viewModel.currentUser?.isAdmin, false);
    });

    test('loginAsAdmin should set admin profile correctly', () {
      viewModel.loginAsAdmin();
      expect(viewModel.isLoggedIn, true);
      expect(viewModel.currentUser?.role, UserRole.admin);
      expect(viewModel.currentUser?.isAdmin, true);
    });

    test('logout should clear currentUser', () {
      viewModel.loginAsStaff();
      expect(viewModel.isLoggedIn, true);
      viewModel.logout();
      expect(viewModel.isLoggedIn, false);
      expect(viewModel.currentUser, null);
    });
  });
}
