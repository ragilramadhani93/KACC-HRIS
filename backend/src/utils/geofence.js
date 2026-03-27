/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Check if coordinates are within outlet geofence
 * Returns { isWithinGeofence: boolean, distance: number }
 */
function isWithinGeofence(userLat, userLon, outletLat, outletLon, radiusMeters) {
  const distance = calculateDistance(
    parseFloat(userLat),
    parseFloat(userLon),
    parseFloat(outletLat),
    parseFloat(outletLon)
  );
  
  return {
    isWithinGeofence: distance <= radiusMeters,
    distance: Math.round(distance), // distance in meters
  };
}

/**
 * Validate geofence coordinates and radius
 */
function validateGeofence(latitude, longitude, radius) {
  const errors = [];
  
  if (latitude !== null && latitude !== undefined) {
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push("Latitude must be between -90 and 90");
    }
  }
  
  if (longitude !== null && longitude !== undefined) {
    const lon = parseFloat(longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) {
      errors.push("Longitude must be between -180 and 180");
    }
  }
  
  if (radius !== null && radius !== undefined) {
    const rad = parseInt(radius);
    if (isNaN(rad) || rad < 10 || rad > 5000) {
      errors.push("Radius must be between 10 and 5000 meters");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export { calculateDistance, isWithinGeofence, validateGeofence };
