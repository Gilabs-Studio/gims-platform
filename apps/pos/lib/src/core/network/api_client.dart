import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_exception.dart';
import 'dio_adapter.dart';

class ApiClient {
  ApiClient._();

  static const _baseUrlKey = 'gims_pos_base_url';
  static const _cookieKey = 'gims_pos_cookies';
  static const _csrfKey = 'gims_pos_csrf';
  static const defaultBaseUrl = String.fromEnvironment(
    'GIMS_API_URL',
    defaultValue: 'http://localhost:8087',
  );

  static final ApiClient instance = ApiClient._();

  final Dio _dio = Dio();
  final Map<String, String> _cookies = {};
  late SharedPreferences _prefs;
  String _baseUrl = defaultBaseUrl;
  String? _csrfToken;
  bool _isReady = false;

  String get baseUrl => _baseUrl;
  String get apiOrigin => _baseUrl.replaceAll(RegExp(r'/+$'), '');
  String get apiV1 => '$apiOrigin/api/v1';
  bool get hasSession => _cookies.containsKey('gims_access_token');

  Future<void> init() async {
    if (_isReady) return;
    _prefs = await SharedPreferences.getInstance();
    _baseUrl = _prefs.getString(_baseUrlKey) ?? defaultBaseUrl;
    _csrfToken = _prefs.getString(_csrfKey);
    final rawCookies = _prefs.getString(_cookieKey);
    if (rawCookies != null && rawCookies.isNotEmpty) {
      final parsed = jsonDecode(rawCookies);
      if (parsed is Map<String, dynamic>) {
        for (final entry in parsed.entries) {
          if (entry.value is String) {
            _cookies[entry.key] = entry.value as String;
          }
        }
      }
    }
    _configureDio();
    _isReady = true;
  }

  Future<void> setBaseUrl(String value) async {
    final normalized = value.trim().replaceAll(RegExp(r'/+$'), '');
    if (normalized.isEmpty) return;
    _baseUrl = normalized;
    await _prefs.setString(_baseUrlKey, normalized);
  }

  Future<void> clearSession() async {
    _cookies.clear();
    _csrfToken = null;
    await _prefs.remove(_cookieKey);
    await _prefs.remove(_csrfKey);
  }

  void _configureDio() {
    configureDioAdapter(_dio);
    _dio.options = BaseOptions(
      baseUrl: apiV1,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Content-Type': 'application/json'},
    );
    _dio.interceptors.clear();
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          options.headers.remove('Authorization');
          if (_cookies.isNotEmpty && canSetCookieHeader()) {
            options.headers['Cookie'] = _cookies.entries
                .map((entry) => '${entry.key}=${entry.value}')
                .join('; ');
          }

          final method = options.method.toUpperCase();
          final unsafe = {'POST', 'PUT', 'PATCH', 'DELETE'}.contains(method);
          final isCsrfEndpoint = options.path.endsWith('/auth/csrf');
          if (unsafe && !isCsrfEndpoint) {
            _csrfToken ??= await bootstrapCsrf();
            if (_csrfToken != null) {
              options.headers['X-CSRF-Token'] = _csrfToken;
            }
          }
          handler.next(options);
        },
        onResponse: (response, handler) async {
          await _captureCookies(response.headers);
          final csrf = response.headers.value('x-csrf-token');
          if (csrf != null && csrf.isNotEmpty) {
            _csrfToken = csrf;
            await _prefs.setString(_csrfKey, csrf);
          }
          handler.next(response);
        },
        onError: (error, handler) async {
          if (error.response != null) {
            await _captureCookies(error.response!.headers);
          }
          handler.next(error);
        },
      ),
    );
  }

  Future<String?> bootstrapCsrf() async {
    final response = await _dio.get<Map<String, dynamic>>('/auth/csrf');
    final data = response.data?['data'];
    String? token;
    if (data is Map<String, dynamic>) {
      token = data['csrf_token'] as String?;
    }
    token ??= response.headers.value('x-csrf-token');
    if (token != null && token.isNotEmpty) {
      _csrfToken = token;
      await _prefs.setString(_csrfKey, token);
    }
    return token;
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _guard(
      () => _dio.get<T>(
        path,
        queryParameters: _cleanParams(queryParameters),
        options: options,
      ),
    );
  }

  Future<Response<T>> post<T>(String path, {Object? data}) async {
    return _guard(() => _dio.post<T>(path, data: data));
  }

  Future<Response<T>> put<T>(String path, {Object? data}) async {
    return _guard(() => _dio.put<T>(path, data: data));
  }

  Future<Response<T>> patch<T>(String path, {Object? data}) async {
    return _guard(() => _dio.patch<T>(path, data: data));
  }

  Future<Response<T>> delete<T>(String path) async {
    return _guard(() => _dio.delete<T>(path));
  }

  Future<Response<T>> _guard<T>(Future<Response<T>> Function() action) async {
    try {
      return await action();
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  ApiException _toApiException(DioException error) {
    final response = error.response;
    final body = response?.data;
    String message = error.message ?? 'Request failed';
    String? code;

    if (body is Map<String, dynamic>) {
      final err = body['error'];
      if (err is Map<String, dynamic>) {
        code = err['code'] as String?;
        message = (err['message'] as String?) ?? code ?? message;
      } else {
        code = body['code'] as String?;
        message =
            (body['message'] as String?) ??
            (body['error'] as String?) ??
            code ??
            message;
      }
    }

    return ApiException(message, code: code, statusCode: response?.statusCode);
  }

  Map<String, dynamic>? _cleanParams(Map<String, dynamic>? params) {
    if (params == null) return null;
    final cleaned = <String, dynamic>{};
    for (final entry in params.entries) {
      final value = entry.value;
      if (value == null) continue;
      if (value is String && value.trim().isEmpty) continue;
      cleaned[entry.key] = value;
    }
    return cleaned;
  }

  Future<void> _captureCookies(Headers headers) async {
    final setCookie = headers.map['set-cookie'];
    if (setCookie == null || setCookie.isEmpty) return;
    for (final raw in setCookie) {
      final first = raw.split(';').first;
      final index = first.indexOf('=');
      if (index <= 0) continue;
      final name = first.substring(0, index).trim();
      final value = first.substring(index + 1).trim();
      if (value.isEmpty) {
        _cookies.remove(name);
      } else {
        _cookies[name] = value;
      }
    }
    await _prefs.setString(_cookieKey, jsonEncode(_cookies));
  }
}
