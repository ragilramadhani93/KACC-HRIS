import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../features/auth/auth_controller.dart";
import "../features/auth/login_screen.dart";
import "../features/auth/splash_screen.dart";
import "../features/clock/clock_screen.dart";
import "../features/profile/profile_screen.dart";
import "../features/timesheet/timesheet_screen.dart";

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: "/splash",
    routes: [
      GoRoute(path: "/splash", builder: (context, state) => const SplashScreen()),
      GoRoute(path: "/login", builder: (context, state) => const LoginScreen()),
      GoRoute(path: "/home", builder: (context, state) => const ClockScreen()),
      GoRoute(path: "/timesheet", builder: (context, state) => const TimesheetScreen()),
      GoRoute(path: "/profile", builder: (context, state) => const ProfileScreen()),
    ],
    redirect: (context, state) {
      final isLoggedIn = auth.isLoggedIn;
      final onAuthRoutes = state.fullPath == "/login" || state.fullPath == "/splash";

      if (!isLoggedIn && !onAuthRoutes) return "/login";
      if (isLoggedIn && (state.fullPath == "/login" || state.fullPath == "/splash")) return "/home";
      return null;
    },
  );
});
