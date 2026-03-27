import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const DEFAULT_API_BASE_URL = Platform.select({
  android: "http://10.0.2.2:4000/api",
  default: "http://localhost:4000/api",
});

const API_BASE_URL = resolveApiBaseUrl();

const AUTH_STORAGE_KEY = "hris.mobile.auth";

type AppTab = "home" | "timesheet" | "profile";

type Department = {
  id?: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: Department | null;
  position?: string | null;
  hourlyRate?: number | null;
  avatarUrl?: string | null;
  isActive?: boolean;
};

type TimeEntry = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  totalHours?: number | null;
  status?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  selfieUrl?: string | null;
};

type StatusResponse = {
  isClockedIn: boolean;
  entry: TimeEntry | null;
  serverTime: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
};

type ApiError = {
  message?: string;
  errors?: Array<{ msg?: string; message?: string }>;
};

type LoginResponse = {
  token: string;
  user: User;
};

type LocationPayload = {
  latitude?: number;
  longitude?: number;
  address?: string;
};

const seedCredentials = {
  employee: { email: "ari@company.com", password: "Employee123!" },
  admin: { email: "admin@company.com", password: "Admin123!" },
};

function resolveApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const selectedBaseUrl = configuredUrl && configuredUrl.length > 0 ? configuredUrl : DEFAULT_API_BASE_URL;

  return selectedBaseUrl?.replace(/\/+$/, "") ?? "http://localhost:4000/api";
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ token: null, user: null });
  const [email, setEmail] = useState(seedCredentials.employee.email);
  const [password, setPassword] = useState(seedCredentials.employee.password);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [submittingClock, setSubmittingClock] = useState(false);
  const [refreshingTimesheet, setRefreshingTimesheet] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [timesheet, setTimesheet] = useState<TimeEntry[]>([]);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [timesheetError, setTimesheetError] = useState<string | null>(null);
  const [homeLastSync, setHomeLastSync] = useState<Date | null>(null);
  const [timesheetLastSync, setTimesheetLastSync] = useState<Date | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraFacing] = useState<CameraType>("front");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationGranted, setLocationGranted] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    void requestLocationPermission();
  }, []);

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    if (!auth.token || !auth.user) {
      setStatus(null);
      setTimesheet([]);
      setHomeError(null);
      setTimesheetError(null);
      setHomeLastSync(null);
      setTimesheetLastSync(null);
      return;
    }

    void refreshHome();
  }, [auth.token, auth.user?.id]);

  useEffect(() => {
    if (auth.user && activeTab === "timesheet" && timesheet.length === 0 && !refreshingTimesheet) {
      void loadTimesheet();
    }
  }, [activeTab, auth.user, timesheet.length, refreshingTimesheet]);

  const currentEntry = status?.entry ?? null;
  const isClockedIn = status?.isClockedIn ?? false;

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, [currentTime]);

  async function restoreSession() {
    try {
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const stored = JSON.parse(raw) as AuthState;
      if (stored?.token && stored?.user?.id) {
        setAuth(stored);
      }
    } catch {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setBootstrapping(false);
    }
  }

  async function persistSession(nextAuth: AuthState) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
  }

  async function clearSession() {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }

  async function requestLocationPermission() {
    const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(permissionStatus === "granted");
  }

  async function safeJson<T>(response: Response): Promise<T | null> {
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers ?? undefined);
    headers.set("Content-Type", "application/json");

    if (auth.token) {
      headers.set("Authorization", `Bearer ${auth.token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const payload = (await safeJson<ApiError>(response)) ?? {};
      const message = payload.message ?? payload.errors?.[0]?.msg ?? payload.errors?.[0]?.message ?? "Request failed";
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing information", "Enter both email and password.");
      return;
    }

    setLoginSubmitting(true);
    try {
      const result = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const nextAuth = { token: result.token, user: result.user };
      await persistSession(nextAuth);
      setAuth(nextAuth);
      setActiveTab("home");
    } catch (error) {
      Alert.alert("Login failed", getErrorMessage(error));
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function refreshHome() {
    if (!auth.user) return;

    setLoadingStatus(true);
    try {
      const [profile, nextStatus] = await Promise.all([
        apiRequest<User>("/auth/me"),
        apiRequest<StatusResponse>(`/timeclock/status/${auth.user.id}`),
      ]);

      setAuth((current) => {
        const nextAuth = { ...current, user: profile };
        void persistSession(nextAuth);
        return nextAuth;
      });
      setStatus(nextStatus);
      setHomeError(null);
      setHomeLastSync(new Date());
    } catch (error) {
      const message = getErrorMessage(error).toLowerCase();
      if (message.includes("token") || message.includes("jwt") || message.includes("unauthorized")) {
        void handleLogout();
        return;
      }

      setHomeError(getErrorMessage(error));
    } finally {
      setLoadingStatus(false);
    }
  }

  async function loadTimesheet() {
    if (!auth.user) return;

    setRefreshingTimesheet(true);
    try {
      const rows = await apiRequest<TimeEntry[]>(`/timesheet/${auth.user.id}`);
      setTimesheet(rows);
      setTimesheetError(null);
      setTimesheetLastSync(new Date());
    } catch (error) {
      setTimesheetError(getErrorMessage(error));
    } finally {
      setRefreshingTimesheet(false);
    }
  }

  async function ensureCameraAccess() {
    if (!cameraPermission) {
      return false;
    }

    if (cameraPermission.granted) {
      return true;
    }

    const result = await requestCameraPermission();
    return result.granted;
  }

  async function resolveLocation(): Promise<LocationPayload> {
    const permission = await Location.getForegroundPermissionsAsync();
    let granted = permission.status === "granted" || locationGranted;

    if (!granted) {
      const request = await Location.requestForegroundPermissionsAsync();
      granted = request.status === "granted";
      setLocationGranted(granted);
    }

    if (!granted) {
      return {};
    }

    const currentPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    let address: string | undefined;

    try {
      const reverse = await Location.reverseGeocodeAsync({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });

      const first = reverse[0];
      if (first) {
        address = [first.street, first.city, first.region, first.country].filter(Boolean).join(", ");
      }
    } catch {
      address = undefined;
    }

    return {
      latitude: currentPosition.coords.latitude,
      longitude: currentPosition.coords.longitude,
      address,
    };
  }

  async function submitClockIn() {
    if (!cameraRef.current) {
      return;
    }

    setSubmittingClock(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error("Photo capture failed");
      }

      const processed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 720 } }],
        {
          compress: 0.65,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!processed.base64) {
        throw new Error("Photo processing failed");
      }

      const location = await resolveLocation();

      await apiRequest<TimeEntry>("/timeclock/clock-in", {
        method: "POST",
        body: JSON.stringify({
          photo_base64: `data:image/jpeg;base64,${processed.base64}`,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        }),
      });

      setCameraVisible(false);
      setHomeError(null);
      setTimesheetError(null);
      await refreshHome();
      await loadTimesheet();
      Alert.alert("Clock in recorded", "Your selfie and current location were submitted.");
    } catch (error) {
      Alert.alert("Clock in failed", getErrorMessage(error));
    } finally {
      setSubmittingClock(false);
    }
  }

  async function handleClockOut() {
    setSubmittingClock(true);
    try {
      const location = await resolveLocation();
      await apiRequest<TimeEntry>("/timeclock/clock-out", {
        method: "POST",
        body: JSON.stringify(location),
      });
      setHomeError(null);
      setTimesheetError(null);
      await refreshHome();
      await loadTimesheet();
      Alert.alert("Clock out recorded", "Your shift has been closed successfully.");
    } catch (error) {
      Alert.alert("Clock out failed", getErrorMessage(error));
    } finally {
      setSubmittingClock(false);
    }
  }

  async function startClockInFlow() {
    const cameraReady = await ensureCameraAccess();
    if (!cameraReady) {
      Alert.alert("Camera required", "Grant camera access before clocking in.");
      return;
    }

    setCameraVisible(true);
  }

  async function handleLogout() {
    await clearSession();
    setAuth({ token: null, user: null });
    setStatus(null);
    setTimesheet([]);
    setActiveTab("home");
  }

  function applySeed(type: keyof typeof seedCredentials) {
    setEmail(seedCredentials[type].email);
    setPassword(seedCredentials[type].password);
  }

  if (bootstrapping) {
    return (
      <SafeAreaView style={styles.loaderScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator color="#175CD3" size="large" />
        <Text style={styles.loaderText}>Restoring session...</Text>
      </SafeAreaView>
    );
  }

  if (!auth.token || !auth.user) {
    return (
      <SafeAreaView style={styles.authRoot}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.authContent}>
          <Text style={styles.eyebrow}>Employee Time Clock</Text>
          <Text style={styles.authTitle}>Sign in to start your shift</Text>
          <Text style={styles.authSubtitle}>
            This Expo app talks directly to the backend API running on port 4000.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="name@company.com"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              value={email}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="#98A2B3"
              secureTextEntry
              style={styles.input}
              value={password}
            />

            <Pressable disabled={loginSubmitting} onPress={handleLogin} style={styles.primaryButton}>
              {loginSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign in</Text>
              )}
            </Pressable>

            <View style={styles.seedRow}>
              <Pressable onPress={() => applySeed("employee")} style={styles.seedPill}>
                <Text style={styles.seedPillText}>Use employee demo</Text>
              </Pressable>
              <Pressable onPress={() => applySeed("admin")} style={styles.seedPill}>
                <Text style={styles.seedPillText}>Use admin demo</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Default seeded employee</Text>
            <Text style={styles.tipText}>ari@company.com / Employee123!</Text>
            <Text style={styles.tipText}>Backend URL: {API_BASE_URL}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.appRoot}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>{greeting}</Text>
          <Text style={styles.screenTitle}>{auth.user.name}</Text>
          <Text style={styles.screenSubtitle}>{auth.user.position ?? "Employee"}</Text>
        </View>
        <View style={styles.timeBox}>
          <Text style={styles.timeValue}>{formatClock(currentTime)}</Text>
          <Text style={styles.timeLabel}>{formatDate(currentTime)}</Text>
        </View>
      </View>

      {activeTab === "home" ? (
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loadingStatus} onRefresh={refreshHome} />}>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Shift status</Text>
            <Text style={styles.heroValue}>{isClockedIn ? "Clocked in" : "Ready to clock in"}</Text>
            <Text style={styles.heroDetail}>
              {currentEntry
                ? `Started ${formatDateTime(currentEntry.clockIn)}`
                : "Capture a selfie and your current GPS location to start work."}
            </Text>
          </View>

          <StatusMetaRow
            loading={loadingStatus}
            error={homeError}
            lastSync={homeLastSync}
            fallback="Pull down to sync your current shift status."
          />

          <View style={styles.actionsRow}>
            <Pressable
              disabled={submittingClock || isClockedIn}
              onPress={startClockInFlow}
              style={[styles.actionButton, styles.clockInButton, isClockedIn && styles.buttonDisabled]}
            >
              {submittingClock && !isClockedIn ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Clock in</Text>
              )}
            </Pressable>

            <Pressable
              disabled={submittingClock || !isClockedIn}
              onPress={handleClockOut}
              style={[styles.actionButton, styles.clockOutButton, !isClockedIn && styles.buttonDisabled]}
            >
              {submittingClock && isClockedIn ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Clock out</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Current entry</Text>
            <InfoRow label="Clock in" value={currentEntry ? formatDateTime(currentEntry.clockIn) : "Not started"} />
            <InfoRow label="Clock out" value={currentEntry?.clockOut ? formatDateTime(currentEntry.clockOut) : "Still on shift"} />
            <InfoRow label="Location" value={currentEntry?.address ?? formatCoordinates(currentEntry)} />
            <InfoRow label="Status" value={currentEntry?.status ?? (isClockedIn ? "PRESENT" : "OFF_SHIFT")} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Backend connection</Text>
            <InfoRow label="API" value={API_BASE_URL ?? "Unavailable"} />
            <InfoRow label="Role" value={auth.user.role} />
            <InfoRow label="Department" value={auth.user.department?.name ?? "Unassigned"} />
          </View>
        </ScrollView>
      ) : null}

      {activeTab === "timesheet" ? (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={timesheet}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshingTimesheet} onRefresh={loadTimesheet} />}
          ListHeaderComponent={
            <StatusMetaRow
              loading={refreshingTimesheet}
              error={timesheetError}
              lastSync={timesheetLastSync}
              fallback="Pull down to sync your latest attendance rows."
            />
          }
          ListEmptyComponent={
            refreshingTimesheet ? null : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No timesheet rows yet</Text>
                <Text style={styles.emptyText}>Clock in and out once to create your first attendance entry.</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryDate}>{formatDateTime(item.clockIn)}</Text>
                <Badge value={item.status ?? "PENDING"} />
              </View>
              <InfoRow label="Clock in" value={formatClockOnly(item.clockIn)} />
              <InfoRow label="Clock out" value={item.clockOut ? formatClockOnly(item.clockOut) : "Open shift"} />
              <InfoRow label="Hours" value={item.totalHours != null ? `${item.totalHours.toFixed(2)} h` : "Pending"} />
              <InfoRow label="Location" value={item.address ?? formatCoordinates(item)} />
              {item.notes ? <Text style={styles.entryNotes}>{item.notes}</Text> : null}
            </View>
          )}
        />
      ) : null}

      {activeTab === "profile" ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileHero}>
            <Text style={styles.profileInitial}>{auth.user.name.charAt(0).toUpperCase()}</Text>
            <Text style={styles.profileName}>{auth.user.name}</Text>
            <Text style={styles.profileEmail}>{auth.user.email}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Employment</Text>
            <InfoRow label="Role" value={auth.user.role} />
            <InfoRow label="Department" value={auth.user.department?.name ?? "Unassigned"} />
            <InfoRow label="Position" value={auth.user.position ?? "Not set"} />
            <InfoRow
              label="Hourly rate"
              value={auth.user.hourlyRate != null ? `$${auth.user.hourlyRate.toFixed(2)}` : "Not set"}
            />
            <InfoRow label="Account" value={auth.user.isActive === false ? "Inactive" : "Active"} />
          </View>

          <Pressable onPress={() => void handleLogout()} style={[styles.actionButton, styles.logoutButton]}>
            <Text style={styles.actionButtonText}>Log out</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      <View style={styles.bottomNav}>
        <TabButton active={activeTab === "home"} label="Home" onPress={() => setActiveTab("home")} />
        <TabButton active={activeTab === "timesheet"} label="Timesheet" onPress={() => setActiveTab("timesheet")} />
        <TabButton active={activeTab === "profile"} label="Profile" onPress={() => setActiveTab("profile")} />
      </View>

      <Modal animationType="slide" transparent visible={cameraVisible} onRequestClose={() => setCameraVisible(false)}>
        <View style={styles.modalShell}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Selfie check-in</Text>
            <Text style={styles.modalText}>Align your face inside the frame, then capture the selfie to clock in.</Text>

            <View style={styles.cameraShell}>
              <CameraView facing={cameraFacing} ref={cameraRef} style={styles.camera} />
              <View style={styles.cameraGuide} />
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setCameraVisible(false)} style={styles.modalSecondary}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={submittingClock} onPress={submitClockIn} style={styles.primaryButtonSmall}>
                {submittingClock ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Capture</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function Badge({ value }: { value: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{value}</Text>
    </View>
  );
}

function StatusMetaRow({
  error,
  lastSync,
  loading,
  fallback,
}: {
  error: string | null;
  lastSync: Date | null;
  loading: boolean;
  fallback: string;
}) {
  if (error) {
    return (
      <View style={styles.feedbackCardError}>
        <Text style={styles.feedbackTitleError}>Sync issue</Text>
        <Text style={styles.feedbackTextError}>{error}</Text>
      </View>
    );
  }

  if (loading && !lastSync) {
    return (
      <View style={styles.feedbackCardNeutral}>
        <Text style={styles.feedbackTextNeutral}>Syncing latest data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.feedbackCardNeutral}>
      <Text style={styles.feedbackTextNeutral}>
        {loading
          ? "Refreshing latest data..."
          : lastSync
            ? `Last synced ${formatRelativeSync(lastSync)}`
            : fallback}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "-"}</Text>
    </View>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatClockOnly(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCoordinates(entry: Pick<TimeEntry, "latitude" | "longitude"> | null) {
  if (entry?.latitude == null || entry?.longitude == null) {
    return "No location saved";
  }

  return `${entry.latitude.toFixed(5)}, ${entry.longitude.toFixed(5)}`;
}

function formatRelativeSync(value: Date) {
  const diffMs = Date.now() - value.getTime();
  const diffSeconds = Math.max(0, Math.round(diffMs / 1000));

  if (diffSeconds < 10) {
    return "just now";
  }

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  loaderScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#F5F7FB",
  },
  loaderText: {
    color: "#475467",
    fontSize: 15,
    fontWeight: "600",
  },
  authRoot: {
    flex: 1,
    backgroundColor: "#EAF2FF",
  },
  authContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 18,
  },
  eyebrow: {
    color: "#175CD3",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  authTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#101828",
    marginTop: 10,
  },
  authSubtitle: {
    color: "#475467",
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 14,
    shadowColor: "#101828",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  tipCard: {
    backgroundColor: "#101828",
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  tipTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  tipText: {
    color: "#D0D5DD",
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344054",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    color: "#101828",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#175CD3",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 52,
    marginTop: 8,
  },
  primaryButtonSmall: {
    alignItems: "center",
    backgroundColor: "#175CD3",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  seedRow: {
    flexDirection: "row",
    gap: 10,
  },
  seedPill: {
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  seedPillText: {
    color: "#175CD3",
    fontSize: 13,
    fontWeight: "700",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  screenTitle: {
    color: "#101828",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  screenSubtitle: {
    color: "#667085",
    fontSize: 15,
    marginTop: 2,
  },
  timeBox: {
    alignItems: "flex-end",
  },
  timeValue: {
    color: "#101828",
    fontSize: 18,
    fontWeight: "800",
  },
  timeLabel: {
    color: "#667085",
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 110,
  },
  feedbackCardNeutral: {
    backgroundColor: "#EEF4FF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  feedbackCardError: {
    backgroundColor: "#FEF3F2",
    borderColor: "#FECACA",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  feedbackTitleError: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  feedbackTextError: {
    color: "#912018",
    fontSize: 14,
    lineHeight: 21,
  },
  feedbackTextNeutral: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "600",
  },
  heroCard: {
    backgroundColor: "#101828",
    borderRadius: 28,
    padding: 22,
    gap: 10,
  },
  heroLabel: {
    color: "#98A2B3",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroValue: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
  },
  heroDetail: {
    color: "#D0D5DD",
    fontSize: 14,
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 18,
    flex: 1,
    justifyContent: "center",
    minHeight: 58,
  },
  clockInButton: {
    backgroundColor: "#0E9F6E",
  },
  clockOutButton: {
    backgroundColor: "#D92D20",
  },
  logoutButton: {
    backgroundColor: "#111827",
    marginBottom: 100,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  sectionTitle: {
    color: "#101828",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  infoRow: {
    alignItems: "flex-start",
    borderTopColor: "#EAECF0",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
  },
  infoLabel: {
    color: "#667085",
    flex: 0.9,
    fontSize: 13,
  },
  infoValue: {
    color: "#101828",
    flex: 1.1,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  listContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 110,
  },
  entryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 12,
    shadowColor: "#101828",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  entryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entryDate: {
    color: "#101828",
    fontSize: 15,
    fontWeight: "800",
  },
  badge: {
    backgroundColor: "#ECFDF3",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#027A48",
    fontSize: 12,
    fontWeight: "800",
  },
  entryNotes: {
    color: "#667085",
    fontSize: 13,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginTop: 12,
    padding: 24,
  },
  emptyTitle: {
    color: "#101828",
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },
  profileHero: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    gap: 8,
    padding: 24,
    shadowColor: "#101828",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  profileInitial: {
    alignItems: "center",
    backgroundColor: "#175CD3",
    borderRadius: 40,
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    height: 80,
    lineHeight: 80,
    overflow: "hidden",
    textAlign: "center",
    width: 80,
  },
  profileName: {
    color: "#101828",
    fontSize: 22,
    fontWeight: "800",
  },
  profileEmail: {
    color: "#667085",
    fontSize: 14,
  },
  bottomNav: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#EAECF0",
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 20,
    paddingTop: 14,
    position: "absolute",
    width: "100%",
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabLabel: {
    color: "#667085",
    fontSize: 14,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#175CD3",
  },
  modalShell: {
    backgroundColor: "rgba(16, 24, 40, 0.42)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 16,
    minHeight: 520,
    padding: 20,
  },
  modalText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 22,
  },
  cameraShell: {
    alignItems: "center",
    backgroundColor: "#0B1220",
    borderRadius: 24,
    height: 320,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    height: "100%",
    width: "100%",
  },
  cameraGuide: {
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 120,
    borderWidth: 2,
    height: 220,
    position: "absolute",
    width: 220,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  modalSecondary: {
    alignItems: "center",
    backgroundColor: "#F2F4F7",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: 18,
  },
  modalSecondaryText: {
    color: "#344054",
    fontSize: 15,
    fontWeight: "700",
  },
});
