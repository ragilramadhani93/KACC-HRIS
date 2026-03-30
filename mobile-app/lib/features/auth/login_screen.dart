import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.face_rounded, size: 72, color: Color(0xFF1D4ED8)),
                const SizedBox(height: 20),
                Text(
                  "Clock sekarang bisa dipakai tanpa login.",
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                Text(
                  "Gunakan mode kiosk untuk scan wajah dan sistem akan membaca nama employee secara otomatis.",
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => context.go("/home"),
                  child: const Text("Buka Face Clock"),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}