import 'package:dio/dio.dart';

import 'dio_adapter_stub.dart'
    if (dart.library.html) 'dio_adapter_web.dart';

void configureDioAdapter(Dio dio) {
  configurePlatformDioAdapter(dio);
}

bool canSetCookieHeader() {
  return platformCanSetCookieHeader();
}
