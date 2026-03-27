import { useState } from "react";
import { GeofenceForm } from "./geofence-form";

export function GeofenceCard({ outlet }) {
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [geofence, setGeofence] = useState({
    latitude: outlet?.latitude,
    longitude: outlet?.longitude,
    radius: outlet?.radius || 100,
    isConfigured: outlet?.latitude && outlet?.longitude,
  });

  const handleSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/outlets/${outlet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan geofence");
      }

      const updated = await response.json();
      setGeofence({
        latitude: updated.latitude,
        longitude: updated.longitude,
        radius: updated.radius,
        isConfigured: updated.latitude && updated.longitude,
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error:", error);
      alert(`Gagal: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Geofence Setting</h3>
        {geofence.isConfigured && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            ✓ Terkonfigurasi
          </span>
        )}
      </div>

      {!showForm && geofence.isConfigured && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-600 mb-1">Latitude</p>
              <p className="text-lg font-semibold">{geofence.latitude?.toFixed(6)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-600 mb-1">Longitude</p>
              <p className="text-lg font-semibold">{geofence.longitude?.toFixed(6)}</p>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 mb-1">Radius Geofence</p>
            <p className="text-lg font-semibold">{geofence.radius} meter</p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="w-full mt-4 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
          >
            Edit Geofence
          </button>
        </div>
      )}

      {!geofence.isConfigured && !showForm && (
        <div className="text-center py-6">
          <p className="text-gray-600 mb-4">Geofence belum dikonfigurasi</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Konfigurasi Geofence
          </button>
        </div>
      )}

      {showForm && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <GeofenceForm
            outlet={outlet}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
          <button
            onClick={() => setShowForm(false)}
            className="w-full mt-3 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Batal
          </button>
        </div>
      )}
    </div>
  );
}
