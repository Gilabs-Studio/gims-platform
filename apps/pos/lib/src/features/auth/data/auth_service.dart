import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../shared/models/user_session.dart';

/// Authentication service — login / logout.
class AuthService {
  AuthService(this._api);

  final ApiClient _api;

  Future<UserSession> login({
    required String username,
    required String password,
  }) async {
    await _api.clearSession();
    await _api.bootstrapCsrf();
    final response = await _api.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': username, 'password': password},
    );
    final data = _dataMap(response.data);
    final user = data['user'];
    if (user is Map<String, dynamic>) {
      return UserSession.fromJson(user);
    }
    throw ApiException('Login response tidak memiliki data user');
  }

  Future<void> logout() async {
    try {
      await _api.post<Map<String, dynamic>>('/auth/logout');
    } finally {
      await _api.clearSession();
    }
  }

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }
}
