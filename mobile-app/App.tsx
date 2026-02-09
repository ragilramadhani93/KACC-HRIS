import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useState, useRef, useEffect } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Modal, ActivityIndicator, Alert } from 'react-native';

// Backend API URL - update this IP if your network changes
const API_URL = "http://10.11.15.159:3000/api/attendance/scan";

export default function App() {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [time, setTime] = useState(new Date());
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Request location permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();
  }, []);

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const handleScan = async () => {
    if (!cameraRef.current) return;
    setScanning(true);

    try {
      // Get current GPS location
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (locationPermission) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        } catch (locError) {
          console.log('Location error:', locError);
          // Continue without location if it fails
        }
      }

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });

      if (photo?.base64) {
        const base64Img = `data:image/jpeg;base64,${photo.base64}`;

        // Send to Backend with location
        try {
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64Img,
              latitude,
              longitude,
            }),
          });

          const data = await response.json();

          if (data.success) {
            const locationInfo = latitude && longitude
              ? `\nLocation: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              : '';
            Alert.alert(
              data.action === 'CLOCK_IN' ? "Clock In Successful" : "Clock Out Successful",
              `${data.message}\nEmployee: ${data.employeeName}${locationInfo}`
            );
          } else {
            Alert.alert("Scan Failed", data.message || "Face not recognized.");
          }

        } catch (netError) {
          Alert.alert("Network Error", "Could not connect to server. Check IP in App.tsx.");
          console.log(netError);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to take picture.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>

        {/* Top Overlay: Digital Clock */}
        <View style={styles.topOverlay}>
          <Text style={styles.clockText}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.dateText}>
            {time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          {/* Location permission indicator */}
          <Text style={styles.locationIndicator}>
            📍 {locationPermission ? 'GPS Active' : 'GPS Disabled'}
          </Text>
        </View>

        {/* Center: Face Guide */}
        <View style={styles.centerContainer}>
          <View style={styles.faceGuide} />
          <Text style={styles.guideText}>Position face within circle</Text>
        </View>

        {/* Bottom: Scan Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.scanButton, scanning && styles.disabledButton]}
            onPress={handleScan}
            disabled={scanning}
          >
            {scanning ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : (
              <View style={styles.innerButton} />
            )}
          </TouchableOpacity>
        </View>

      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 60,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  clockText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  dateText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 0,
  },
  locationIndicator: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  guideText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    alignItems: 'center',
  },
  scanButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  innerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6', // blue-500
  },
  disabledButton: {
    opacity: 0.7,
  }
});
