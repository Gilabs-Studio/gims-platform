import 'package:dio/browser.dart';
import 'package:dio/dio.dart';

void configurePlatformDioAdapter(Dio dio) {
  dio.httpClientAdapter = BrowserHttpClientAdapter()..withCredentials = true;
}

bool platformCanSetCookieHeader() => false;
