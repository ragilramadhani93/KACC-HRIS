# Geofence Feature Documentation

## Overview
Fitur geofence memungkinkan pembatasan check-in karyawan berdasarkan lokasi geografis. Setiap outlet memiliki koordinat (latitude dan longitude) dengan radius tertentu. Karyawan hanya bisa melakukan check-in jika berada dalam radius yang ditentukan.

## Database Schema

### Outlet Model
```prisma
model Outlet {
  id        String       @id @default(cuid())
  code      String       @unique
  name      String
  address   String?
  latitude  Decimal?     // Koordinat pusat geofence
  longitude Decimal?     // Koordinat pusat geofence
  radius    Int          @default(100) // Dalam meter, range: 10-5000m
  isActive  Boolean      @default(true)
  users     User[]
  shifts    OutletShift[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@index([name])
  @@map("outlets")
}
```

## Backend API Endpoints

### 1. Create Outlet dengan Geofence
```
POST /api/outlets
Content-Type: application/json

{
  "code": "OUT001",
  "name": "Outlet Jakarta Pusat",
  "address": "Jl. Sudirman No. 1",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "radius": 100,
  "isActive": true
}
```

### 2. Update Outlet Geofence
```
PUT /api/outlets/:id
Content-Type: application/json

{
  "latitude": -6.2088,
  "longitude": 106.8456,
  "radius": 150
}
```

### 3. Get Outlet Geofence Details
```
GET /api/outlets/:outletId/geofence

Response:
{
  "outletId": "outlet123",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "radius": 100,
  "isConfigured": true
}
```

### 4. Check if User is Within Geofence
```
POST /api/outlets/:outletId/geofence/check
Content-Type: application/json

{
  "latitude": -6.2095,
  "longitude": 106.8465
}

Response:
{
  "outletId": "outlet123",
  "userLatitude": -6.2095,
  "userLongitude": 106.8465,
  "isWithinGeofence": true,
  "distance": 89  // dalam meter
}
```

## Frontend Components

### 1. GeofenceForm Component
Component untuk input dan validasi data geofence (latitude, longitude, radius).

**Props:**
- `outlet?: Outlet` - Data outlet yang sedang diedit
- `onSubmit: (data) => Promise<void>` - Callback saat form disubmit
- `isLoading?: boolean` - Loading state

**Features:**
- Input manual latitude/longitude
- Range slider untuk radius (10-5000m)
- Input langsung untuk radius
- Validasi range koordinat
- Info message tentang penggunaan geofence

### 2. GeofenceCard Component
Card untuk display dan manage geofence settings outlet.

**Props:**
- `outlet: Outlet` - Data outlet

**Features:**
- Display status geofence (configured/not configured)
- Show koordinat dan radius
- Edit geofence data
- Visual confirmation saat save

### 3. OutletClient Component
Komponen utama untuk manage outlets, sudah include geofence form.

**Features:**
- Form untuk create/edit outlet dengan geofence
- Get current location button (menggunakan browser Geolocation API)
- Tabel outlet dengan kolom koordinat dan radius
- Delete outlet

## Mobile App Implementation

### Geofence Utility (lib/core/geofence.dart)
Fungsi helper untuk kalkulasi dan validasi geofence di mobile.

**Functions:**

#### `calculateDistance()`
Menghitung jarak antara dua titik koordinat menggunakan Haversine formula.

```dart
double distance = calculateDistance(
  userLat: -6.2095,
  userLon: 106.8465,
  outletLat: -6.2088,
  outletLon: 106.8456,
);
```

#### `checkGeofence()`
Validasi apakah user berada dalam geofence.

```dart
var result = checkGeofence(
  userLatitude: -6.2095,
  userLongitude: 106.8465,
  outletLatitude: -6.2088,
  outletLongitude: 106.8456,
  radiusMeters: 100,
);

print(result['isWithin']); // true/false
print(result['distance']); // "89"
```

## Implementation in Check-in Flow

### Frontend (Web Dashboard)
1. User membuka form check-in
2. Browser request current location (Geolocation API)
3. Coordinate dikirim ke backend: `POST /api/outlets/:id/geofence/check`
4. Backend return apakah user dalam geofence
5. Jika dalam geofence → allow check-in
6. Jika luar geofence → show error message dengan distance

### Mobile App
1. App request current location (GPS)
2. App menggunakan `checkGeofence()` utility untuk validasi local
3. Opsi 1: Hanya validasi local (lebih cepat, offline-capable)
4. Opsi 2: Kirim ke backend untuk double-check
5. Jika dalam geofence → allow check-in
6. Jika luar geofence → show warning/error

## Distance Calculation Algorithm

Menggunakan **Haversine Formula**:

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1−a))
d = R × c
```

Dimana:
- R = 6,371 km (radius bumi)
- Δlat = latitude difference
- Δlon = longitude difference

Akurasi: ±0.5% untuk jarak sedang

## Validasi dan Constraints

### Latitude
- Range: -90 to 90
- Precision: 6 decimal places (±0.1 meter)

### Longitude  
- Range: -180 to 180
- Precision: 6 decimal places (±0.1 meter)

### Radius
- Min: 10 meter
- Max: 5000 meter
- Default: 100 meter

## Best Practices

1. **Coordinate Precision**
   - Gunakan minimal 6 decimal places untuk akurasi ±0.1 meter
   - Jangan round ke 2-3 decimal places (akurasi hanya ±1-10 km)

2. **Radius Setting**
   - Industri standar: 100-200 meter
   - Indoor/Urban: 50-100 meter
   - Rural/Outdoor: 200-500 meter

3. **Testing**
   - Test dengan offline maps untuk validate coordinates
   - Test dengan variasi distance (in range, near edge, outside)
   - Test dengan network delay (validation mungkin terdelay)

4. **Privacy**
   - Coordinates disimpan di database (encrypted at rest recommended)
   - Location data hanya digunakan untuk check-in validation
   - Clear privacy policy untuk employee consent

## Future Enhancements

1. **Multiple Geofence Zones** - Support untuk berbagai zona dalam 1 outlet
2. **Geofence History** - Track ketika employee in/out geofence
3. **Map Integration** - Visual geofence mapping (Google Maps, Leaflet)
4. **Push Notifications** - Alert ketika approaching/leaving geofence
5. **Geofence Alerts** - Notify manager jika employee di luar geofence
6. **Timezone-aware Geofence** - Different radius per shift/time
