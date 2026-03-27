/// Helper function to validate geofence on mobile
/// Returns true if user is within geofence, false otherwise

import 'dart:math' as math;

/// Calculate distance between two coordinates using Haversine formula
/// Returns distance in meters
double calculateDistance(
  double userLat,
  double userLon,
  double outletLat,
  double outletLon,
) {
  const R = 6371000; // Earth's radius in meters
  final dLat = _toRad(outletLat - userLat);
  final dLon = _toRad(outletLon - userLon);

  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_toRad(userLat)) *
          math.cos(_toRad(outletLat)) *
          math.sin(dLon / 2) *
          math.sin(dLon / 2);

  final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  return R * c;
}

/// Convert degrees to radians
double _toRad(double deg) {
  return (deg * math.pi) / 180;
}

/// Check if user location is within outlet geofence
/// Returns a map with status and distance information
Map<String, dynamic> checkGeofence({
  required double userLatitude,
  required double userLongitude,
  required double outletLatitude,
  required double outletLongitude,
  required int radiusMeters,
}) {
  final distance = calculateDistance(
    userLatitude,
    userLongitude,
    outletLatitude,
    outletLongitude,
  );

  final isWithin = distance <= radiusMeters;

  return {
    'isWithin': isWithin,
    'distance': distance.toStringAsFixed(0),
    'isDanger': distance > radiusMeters && distance <= radiusMeters + 100,
    'message': isWithin
        ? 'Anda berada dalam area outlet'
        : 'Anda berada di luar area outlet (${distance.toStringAsFixed(0)}m away)',
  };
}
