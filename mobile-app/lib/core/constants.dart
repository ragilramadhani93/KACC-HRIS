class AppColors {
  static const primary = 0xFF1A56DB;
  static const clockIn = 0xFF0E9F6E;
  static const clockOut = 0xFFE02424;
}

class ApiConfig {
  static const baseUrl = String.fromEnvironment(
    "API_BASE_URL",
    defaultValue: "http://10.0.2.2:4000/api",
  );
}
