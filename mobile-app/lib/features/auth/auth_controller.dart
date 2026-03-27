import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../core/api_client.dart";

class AuthState {
  final bool loading;
  final String? token;
  final String? userId;
  final String? name;
  final String? avatarUrl;

  const AuthState({
    this.loading = false,
    this.token,
    this.userId,
    this.name,
    this.avatarUrl,
  });

  bool get isLoggedIn => token != null && userId != null;

  AuthState copyWith({
    bool? loading,
    String? token,
    String? userId,
    String? name,
    String? avatarUrl,
    bool clearToken = false,
  }) {
    return AuthState(
      loading: loading ?? this.loading,
      token: clearToken ? null : (token ?? this.token),
      userId: clearToken ? null : (userId ?? this.userId),
      name: name ?? this.name,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this.ref) : super(const AuthState());

  final Ref ref;

  Future<void> bootstrap() async {
    final storage = ref.read(appStorageProvider);
    final token = await storage.getToken();
    final userId = await storage.getUserId();

    if (token != null && userId != null) {
      state = state.copyWith(token: token, userId: userId);
    }
  }

  Future<String?> login(String email, String password) async {
    state = state.copyWith(loading: true);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.post("/auth/login", data: {
        "email": email,
        "password": password,
      });

      final token = response.data["token"] as String;
      final user = response.data["user"] as Map<String, dynamic>;
      final userId = user["id"] as String;

      await ref.read(appStorageProvider).saveAuth(token: token, userId: userId);

      state = state.copyWith(
        loading: false,
        token: token,
        userId: userId,
        name: user["name"] as String?,
        avatarUrl: user["avatarUrl"] as String?,
      );

      return null;
    } catch (e) {
      state = state.copyWith(loading: false);
      return "Login failed. Check your email/password.";
    }
  }

  Future<void> logout() async {
    await ref.read(appStorageProvider).clear();
    state = state.copyWith(clearToken: true);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref);
});
