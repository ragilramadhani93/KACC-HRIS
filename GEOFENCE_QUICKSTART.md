# Geofence Feature - Quick Start Guide

## ✅ Implementation Summary

Fitur geofence telah berhasil diimplementasikan untuk menambahkan validasi lokasi pada saat check-in karyawan. 

## 📋 Yang Sudah Dilakukan

### 1. Database Schema Update
- ✅ Tambah 3 field ke model `Outlet`:
  - `latitude` (Decimal) - Koordinat pusat geofence
  - `longitude` (Decimal) - Koordinat pusat geofence  
  - `radius` (Int, default: 100) - Radius geofence dalam meter

### 2. Backend Implementation

#### Backend Utilities (`src/utils/geofence.js`)
- ✅ `calculateDistance()` - Hitung jarak antara dua titik (Haversine formula)
- ✅ `isWithinGeofence()` - Check apakah koordinat dalam geofence
- ✅ `validateGeofence()` - Validasi input latitude, longitude, radius

#### Backend Routes (`src/routes/outlets.routes.js`)
- ✅ Update `POST /api/outlets` - Terima latitude, longitude, radius
- ✅ Update `PUT /api/outlets/:id` - Update geofence data
- ✅ **NEW** `GET /api/outlets/:outletId/geofence` - Get geofence details
- ✅ **NEW** `POST /api/outlets/:outletId/geofence/check` - Check if coordinates within geofence

### 3. Frontend Components

#### GeofenceForm Component (`components/geofence-form.tsx`)
- ✅ Input latitude/longitude
- ✅ Range slider untuk radius (10-5000m)
- ✅ Input langsung untuk radius
- ✅ Client-side validation

#### GeofenceCard Component (`components/geofence-card.tsx`)
- ✅ Display geofence status
- ✅ Show current coordinates & radius
- ✅ Edit geofence button
- ✅ Toggle form on/off

#### OutletClient Component (sudah terintegrasi)
- ✅ Form untuk create/edit outlet dengan geofence
- ✅ "Get Current Location" button (Geolocation API)
- ✅ Tabel dengan kolom koordinat & radius

### 4. Mobile App
- ✅ `lib/core/geofence.dart` - Utility functions untuk geofence calculation
- ✅ `calculateDistance()` - Distance calculation untuk Flutter
- ✅ `checkGeofence()` - Validation helper

### 5. Documentation
- ✅ `GEOFENCE_DOCUMENTATION.md` - Complete documentation
- ✅ `GEOFENCE_EXAMPLE_CHECKIN.ts` - Example implementation

## 🚀 How to Use

### 1. Configure Outlet Geofence (Web Dashboard)

**Via UI:**
1. Go to Outlets page
2. Click "Add Outlet" atau "Edit" existing outlet
3. Input Outlet details:
   - Name: "Outlet Jakarta Pusat"
   - Address: "Jl. Sudirman No. 1"
4. Set geofence:
   - Click "Get Current Location" button (jika nearby outlet)
   - OR input manually: Latitude, Longitude
   - Set Radius (10-5000 meter)
5. Save

**Example Coordinates (Jakarta):**
```
Latitude: -6.2088
Longitude: 106.8456
Radius: 100 (meters)
```

### 2. API Usage

#### Get Geofence Details
```bash
curl -X GET http://localhost:4000/api/outlets/outlet123/geofence \
  -H "Authorization: Bearer TOKEN"
```

Response:
```json
{
  "outletId": "outlet123",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "radius": 100,
  "isConfigured": true
}
```

#### Check if Within Geofence
```bash
curl -X POST http://localhost:4000/api/outlets/outlet123/geofence/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "latitude": -6.2095,
    "longitude": 106.8465
  }'
```

Response:
```json
{
  "outletId": "outlet123",
  "userLatitude": -6.2095,
  "userLongitude": 106.8465,
  "isWithinGeofence": true,
  "distance": 89
}
```

### 3. Integrate with Check-in Flow

**Example pseudocode for check-in endpoint:**

```typescript
// 1. Get user location
const { latitude, longitude } = await getUserLocation();

// 2. Check geofence
const response = await fetch(
  `/api/outlets/${outletId}/geofence/check`,
  {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude })
  }
);

const { isWithinGeofence, distance } = await response.json();

// 3. Process check-in
if (isWithinGeofence) {
  // Allow check-in
  await submitCheckIn(userId, outletId, { latitude, longitude });
} else {
  // Show error
  alert(`You are ${Math.round(distance)}m away from the outlet`);
}
```

## 📱 Mobile App Integration

**Dart/Flutter example:**

```dart
import 'package:geolocator/geolocator.dart';
import 'package:Project_HRIS/core/geofence.dart';

// Get current location
Position position = await Geolocator.getCurrentPosition();

// Check geofence
var result = checkGeofence(
  userLatitude: position.latitude,
  userLongitude: position.longitude,
  outletLatitude: outlet.latitude,
  outletLongitude: outlet.longitude,
  radiusMeters: outlet.radius,
);

if (result['isWithin']) {
  // Proceed with check-in
} else {
  // Show warning
  print('You are ${result['distance']}m away from outlet');
}
```

## ⚙️ Configuration Parameters

### Radius Default Values (Rekomendasi)
- **Toko/Office Kecil**: 50-100 meter
- **Mall/Gedung Besar**: 100-200 meter
- **Kompleks Industri**: 200-500 meter
- **Area Terbuka**: 300-500 meter

### Validation Constraints
- **Latitude**: -90 to 90
- **Longitude**: -180 to 180
- **Radius**: 10 to 5000 meters
- **Precision**: 6 decimal places (±0.1 meter accuracy)

## 🧪 Testing Checklist

```
[ ] Database schema updated (3 new columns in outlets table)
[ ] Create outlet dengan geofence via UI
[ ] Edit outlet geofence settings
[ ] Get Current Location button works
[ ] API: GET /api/outlets/:id/geofence returns correct data
[ ] API: POST /api/outlets/:id/geofence/check works
[ ] Mobile app can calculate distance correctly
[ ] Check-in allowed when within geofence
[ ] Check-in blocked when outside geofence
```

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                  Configuration (Admin)                  │
├─────────────────────────────────────────────────────────┤
│  Web Dashboard                                          │
│  └─ Outlets Page → Configure Lat/Lon/Radius           │
│     └─ API: PUT /api/outlets/:id                       │
│        └─ Database: Outlet table updated               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Check-in (Employee)                    │
├─────────────────────────────────────────────────────────┤
│  Mobile App / Web Dashboard                             │
│  └─ Get GPS location                                   │
│     └─ API: POST /outlets/:id/geofence/check           │
│        └─ Backend: Calculate distance (Haversine)      │
│           └─ Response: isWithinGeofence: true/false    │
│              └─ If true → Allow check-in               │
│              └─ If false → Reject check-in             │
└─────────────────────────────────────────────────────────┘
```

## 📊 Database

**New columns in `outlets` table:**
```sql
ALTER TABLE outlets ADD COLUMN latitude DECIMAL(12, 6) NULL;
ALTER TABLE outlets ADD COLUMN longitude DECIMAL(12, 6) NULL;
ALTER TABLE outlets ADD COLUMN radius INTEGER DEFAULT 100;
```

## 🔐 Security Notes

1. **Location Privacy**
   - Coordinates hanya disimpan untuk outlet (bukan personal)
   - Tidak track karyawan individual (hanya validate check-in)

2. **API Security**
   - All endpoints require `requireAuth` middleware
   - Admin role required untuk configure geofence

3. **Future Enhancements**
   - Encrypt latitude/longitude di rest
   - Log geofence violations
   - Geofence entry/exit history

## 📚 Related Files

- Backend Utility: `backend/src/utils/geofence.js`
- Backend Routes: `backend/src/routes/outlets.routes.js`
- Frontend Components: `web-dashboard/components/geofence-*.tsx`
- Frontend Page: `web-dashboard/app/(dashboard)/outlets/`
- Mobile Utility: `mobile-app/lib/core/geofence.dart`
- Documentation: `GEOFENCE_DOCUMENTATION.md`

## ❓ Troubleshooting

### Issue: "Geofence not configured for this outlet"
- **Solution**: Configure latitude, longitude, radius di outlet settings

### Issue: Check-in rejected but sure user is nearby
- **Possible reasons**:
  - Radius terlalu kecil (coba naikin)
  - GPS inaccuracy (ambil rata-rata koordinat)
  - Network delay (gunakan local validation di mobile)

### Issue: Precision mismatch antara frontend & backend
- **Solution**: Ensure gunakan 6 decimal places minimal

## 🎯 Next Steps

1. **Monitoring & Logging**
   - Track geofence violations
   - Log failed check-ins dengan distance

2. **Advanced Features**
   - Multiple zones per outlet
   - Time-based radius changes
   - Geofence alerts/notifications
   - Map visualization

3. **Performance**
   - Cache outlet geofence data
   - Client-side validation untuk offline support

---

**Implementation Date**: March 26, 2026  
**Status**: ✅ Ready for Testing & Integration
