import 'package:flutter/material.dart';
import '../../../domain/entities/user_role.dart';

class AuthViewModel extends ChangeNotifier {
  UserProfile? _currentUser;
  bool _isLoading = false;

  UserProfile? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isLoggedIn => _currentUser != null;

  void loginAsStaff() {
    _isLoading = true;
    notifyListeners();

    _currentUser = const UserProfile(
      id: "EMP-8802",
      name: "Budi Pratama",
      email: "budi.pratama@gilabs.id",
      avatarUrl: "https://i.pravatar.cc/150?img=11",
      position: "Staff Operator Production Line 2",
      department: "Divisi Manufaktur & Operasional",
      role: UserRole.staff,
    );

    _isLoading = false;
    notifyListeners();
  }

  void loginAsAdmin() {
    _isLoading = true;
    notifyListeners();

    _currentUser = const UserProfile(
      id: "ADM-1001",
      name: "Hendrik Wijaya, M.T.",
      email: "hendrik.wijaya@gilabs.id",
      avatarUrl: "https://i.pravatar.cc/150?img=60",
      position: "Plant General Manager & Admin ERP",
      department: "Direksi & Operasional Pabrik",
      role: UserRole.admin,
    );

    _isLoading = false;
    notifyListeners();
  }

  void loginAsOB() {
    _isLoading = true;
    notifyListeners();

    _currentUser = const UserProfile(
      id: "OB-7007",
      name: "Pak Agus (OB Specialist)",
      email: "agus.ob@gilabs.id",
      avatarUrl: "https://i.pravatar.cc/150?img=68",
      position: "Assisten Personal & Titip Makanan",
      department: "Umum & Rumah Tangga",
      role: UserRole.ob,
    );

    _isLoading = false;
    notifyListeners();
  }

  void logout() {
    _currentUser = null;
    notifyListeners();
  }
}
