/// Authenticated user session from login response.
class UserSession {
  UserSession({
    required this.id,
    required this.name,
    required this.email,
    required this.roleName,
    required this.permissions,
  });

  final String id;
  final String name;
  final String email;
  final String roleName;
  final Map<String, String> permissions;

  factory UserSession.fromJson(Map<String, dynamic> json) {
    final role = json['role'] as Map<String, dynamic>? ?? {};
    final rawPermissions = json['permissions'];
    return UserSession(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Cashier',
      email: json['email'] as String? ?? '',
      roleName: role['name'] as String? ?? role['code'] as String? ?? '',
      permissions: rawPermissions is Map<String, dynamic>
          ? rawPermissions.map((key, value) => MapEntry(key, '$value'))
          : const {},
    );
  }
}
