import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "constants.dart";
import "storage.dart";

final appStorageProvider = Provider((ref) => AppStorage());

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await ref.read(appStorageProvider).getToken();
        if (token != null && token.isNotEmpty) {
          options.headers["Authorization"] = "Bearer $token";
        }
        handler.next(options);
      },
    ),
  );

  return dio;
});
