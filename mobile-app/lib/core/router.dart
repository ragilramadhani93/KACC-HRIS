import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../features/auth/login_screen.dart";
import "../features/auth/splash_screen.dart";
import "../features/clock/clock_screen.dart";
import "../features/profile/profile_screen.dart";
import "../features/timesheet/timesheet_screen.dart";

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: "/home",
    routes: [
      GoRoute(path: "/splash", builder: (context, state) => const SplashScreen()),
      GoRoute(path: "/login", builder: (context, state) => const LoginScreen()),
      GoRoute(path: "/home", builder: (context, state) => const ClockScreen()),
      GoRoute(path: "/timesheet", builder: (context, state) => const TimesheetScreen()),
      GoRoute(path: "/profile", builder: (context, state) => const ProfileScreen()),
    ],
    redirect: (context, state) {
      if (state.fullPath == "/splash") return "/home";
      return null;
    },
  );
});
