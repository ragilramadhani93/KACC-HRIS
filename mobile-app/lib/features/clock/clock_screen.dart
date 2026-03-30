import "dart:convert";
import "dart:io";

import "package:dio/dio.dart";
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:geocoding/geocoding.dart";
import "package:geolocator/geolocator.dart";
import "package:go_router/go_router.dart";
import "package:image_picker/image_picker.dart";

import "../../core/api_client.dart";
import "../../core/constants.dart";

class ClockScreen extends ConsumerStatefulWidget {
  const ClockScreen({super.key});

  @override
  ConsumerState<ClockScreen> createState() => _ClockScreenState();
}

class _ClockScreenState extends ConsumerState<ClockScreen> {
  final ImagePicker _imagePicker = ImagePicker();

  File? _capturedPhoto;
  String? _photoBase64;
  bool _loadingLocation = false;
  bool _submitting = false;
  String? _statusMessage;
  _ScanResult? _scanResult;
  _LocationState? _locationState;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1D4ED8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(28),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Face Clock",
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      "Employee cukup berdiri di depan kamera. Sistem langsung mengenali wajah lalu clock in atau clock out tanpa login.",
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: Colors.white.withValues(alpha: 0.88),
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        _InfoPill(label: _locationState?.summary ?? "Lokasi belum diambil"),
                        const _InfoPill(label: "Mode kiosk tanpa login"),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x120F172A),
                      blurRadius: 28,
                      offset: Offset(0, 16),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            "Scan Wajah",
                            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        TextButton.icon(
                          onPressed: _loadingLocation ? null : _refreshLocation,
                          icon: _loadingLocation
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.my_location_rounded),
                          label: const Text("Refresh lokasi"),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Container(
                      height: 320,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFFD7E0F0)),
                      ),
                      child: _capturedPhoto == null
                          ? const _EmptyPreview()
                          : ClipRRect(
                              borderRadius: BorderRadius.circular(24),
                              child: Image.file(_capturedPhoto!, fit: BoxFit.cover),
                            ),
                    ),
                    const SizedBox(height: 18),
                    if (_statusMessage != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: Text(
                          _statusMessage!,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: const Color(0xFFB42318),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    Row(
                      children: [
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: _submitting ? null : _capturePhoto,
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(AppColors.primary),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                            ),
                            icon: const Icon(Icons.camera_alt_rounded),
                            label: Text(_capturedPhoto == null ? "Ambil foto" : "Ambil ulang"),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: (_photoBase64 == null || _submitting) ? null : _scanFace,
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              side: const BorderSide(color: Color(0xFF1D4ED8)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                            ),
                            icon: _submitting
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Icon(Icons.face_retouching_natural_rounded),
                            label: const Text("Scan & clock"),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (_scanResult != null) _ResultCard(result: _scanResult!),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.push("/timesheet"),
                      icon: const Icon(Icons.history_rounded),
                      label: const Text("Timesheet"),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.push("/profile"),
                      icon: const Icon(Icons.badge_rounded),
                      label: const Text("Info app"),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _refreshLocation() async {
    setState(() {
      _loadingLocation = true;
      _statusMessage = null;
    });

    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception("GPS belum aktif di device.");
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        throw Exception("Izin lokasi diperlukan untuk validasi outlet.");
      }

      final position = await Geolocator.getCurrentPosition();
      String? address;

      try {
        final placemarks = await placemarkFromCoordinates(position.latitude, position.longitude);
        if (placemarks.isNotEmpty) {
          final place = placemarks.first;
          address = [place.street, place.subLocality, place.locality]
              .where((value) => value != null && value!.trim().isNotEmpty)
              .map((value) => value!.trim())
              .join(", ");
        }
      } catch (_) {
        address = null;
      }

      if (!mounted) return;
      setState(() {
        _locationState = _LocationState(
          latitude: position.latitude,
          longitude: position.longitude,
          address: address,
        );
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _statusMessage = error.toString().replaceFirst("Exception: ", "");
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingLocation = false;
        });
      }
    }
  }

  Future<void> _capturePhoto() async {
    setState(() {
      _statusMessage = null;
    });

    final pickedFile = await _imagePicker.pickImage(
      source: ImageSource.camera,
      imageQuality: 82,
      maxWidth: 1280,
    );

    if (pickedFile == null) {
      return;
    }

    final file = File(pickedFile.path);
    final bytes = await file.readAsBytes();
    final mimeType = _mimeTypeForPath(pickedFile.path);

    setState(() {
      _capturedPhoto = file;
      _photoBase64 = "data:$mimeType;base64,${base64Encode(bytes)}";
      _scanResult = null;
    });

    if (_locationState == null) {
      await _refreshLocation();
    }
  }

  Future<void> _scanFace() async {
    if (_photoBase64 == null) {
      return;
    }

    setState(() {
      _submitting = true;
      _statusMessage = null;
    });

    try {
      final response = await ref.read(dioProvider).post(
            "/timeclock/face-scan",
            data: {
              "photo_base64": _photoBase64,
              "latitude": _locationState?.latitude,
              "longitude": _locationState?.longitude,
              "address": _locationState?.address,
            },
          );

      final data = Map<String, dynamic>.from(response.data as Map);
      if (!mounted) return;

      setState(() {
        _scanResult = _ScanResult.fromJson(data);
      });
    } on DioException catch (error) {
      final payload = error.response?.data;
      String message = "Scan gagal. Coba lagi.";

      if (payload is Map) {
        final json = Map<String, dynamic>.from(payload);
        message = (json["message"] ?? json["error"] ?? message).toString();

        if (json["employee"] is Map<String, dynamic>) {
          setState(() {
            _scanResult = _ScanResult.fromJson({
              ...json,
              "action": "REJECTED",
            });
          });
        }
      }

      if (!mounted) return;
      setState(() {
        _statusMessage = message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _statusMessage = "Terjadi error yang tidak terduga saat scan wajah.";
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  String _mimeTypeForPath(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    return "image/jpeg";
  }
}

class _LocationState {
  const _LocationState({required this.latitude, required this.longitude, this.address});

  final double latitude;
  final double longitude;
  final String? address;

  String get summary {
    final coords = "${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)}";
    if (address == null || address!.isEmpty) {
      return coords;
    }
    return "$coords • $address";
  }
}

class _ScanResult {
  const _ScanResult({
    required this.employeeName,
    required this.action,
    required this.message,
    required this.confidence,
    this.position,
    this.serverTime,
    this.geofenceSummary,
  });

  final String employeeName;
  final String action;
  final String message;
  final double confidence;
  final String? position;
  final String? serverTime;
  final String? geofenceSummary;

  factory _ScanResult.fromJson(Map<String, dynamic> json) {
    final employee = json["employee"] is Map ? Map<String, dynamic>.from(json["employee"] as Map) : <String, dynamic>{};
    final geofence = json["geofence"] is Map ? Map<String, dynamic>.from(json["geofence"] as Map) : null;
    final geofenceSummary = geofence == null
        ? null
        : "${geofence["outletName"]} • ${geofence["distance"]}m dari outlet";

    return _ScanResult(
      employeeName: (employee["name"] ?? "Employee tidak dikenal").toString(),
      action: (json["action"] ?? "CLOCK_IN").toString(),
      message: (json["message"] ?? "Scan selesai").toString(),
      confidence: ((json["confidence"] as num?) ?? 0).toDouble(),
      position: employee["position"]?.toString(),
      serverTime: json["serverTime"]?.toString(),
      geofenceSummary: geofenceSummary,
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

class _EmptyPreview extends StatelessWidget {
  const _EmptyPreview();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 74,
              height: 74,
              decoration: const BoxDecoration(
                color: Color(0xFFE0E7FF),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.camera_enhance_rounded, color: Color(0xFF1D4ED8), size: 34),
            ),
            const SizedBox(height: 16),
            Text(
              "Belum ada foto",
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              "Ambil foto wajah dengan pencahayaan cukup. Sistem akan mencocokkan wajah dan langsung menentukan clock in atau clock out.",
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: const Color(0xFF64748B), height: 1.45),
            ),
          ],
        ),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result});

  final _ScanResult result;

  @override
  Widget build(BuildContext context) {
    final isClockIn = result.action == "CLOCK_IN";
    final isRejected = result.action == "REJECTED";
    final accent = isRejected
        ? const Color(0xFFDC2626)
        : isClockIn
            ? const Color(0xFF0E9F6E)
            : const Color(0xFFF59E0B);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: accent.withValues(alpha: 0.22), width: 1.4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  result.action.replaceAll("_", " "),
                  style: TextStyle(color: accent, fontWeight: FontWeight.w700),
                ),
              ),
              const Spacer(),
              Text(
                "${(result.confidence * 100).toStringAsFixed(0)}% match",
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF475569),
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            result.employeeName,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          if (result.position != null) ...[
            const SizedBox(height: 4),
            Text(
              result.position!,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: const Color(0xFF64748B)),
            ),
          ],
          const SizedBox(height: 12),
          Text(
            result.message,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.45),
          ),
          if (result.geofenceSummary != null) ...[
            const SizedBox(height: 10),
            Text(
              result.geofenceSummary!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: const Color(0xFF475569)),
            ),
          ],
          if (result.serverTime != null) ...[
            const SizedBox(height: 10),
            Text(
              "Server time: ${result.serverTime}",
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF94A3B8)),
            ),
          ],
        ],
      ),
    );
  }
}