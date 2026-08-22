enum UserRole { staff, admin, ob }

class UserProfile {
  final String id;
  final String name;
  final String email;
  final String avatarUrl;
  final String position;
  final String department;
  final UserRole role;

  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.avatarUrl,
    required this.position,
    required this.department,
    required this.role,
  });

  bool get isAdmin => role == UserRole.admin;
  bool get isOb => role == UserRole.ob;
}
