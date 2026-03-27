import { useState } from "react";

export function GeofenceForm({ outlet, onSubmit, isLoading }) {
  const [latitude, setLatitude] = useState(outlet?.latitude || "");
  const [longitude, setLongitude] = useState(outlet?.longitude || "");
  const [radius, setRadius] = useState(outlet?.radius || 100);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validasi
    if (!latitude || !longitude) {
      setError("Latitude dan Longitude harus diisi");
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseInt(radius);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError("Latitude harus antara -90 dan 90");
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      setError("Longitude harus antara -180 dan 180");
      return;
    }

    if (isNaN(rad) || rad < 10 || rad > 5000) {
      setError("Radius harus antara 10 dan 5000 meter");
      return;
    }

    onSubmit({ latitude: lat, longitude: lon, radius: rad });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="0.000001"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="Contoh: -6.2088"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Range: -90 hingga 90</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="0.000001"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="Contoh: 106.8456"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Range: -180 hingga 180</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Radius Geofence (meter)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="10"
            max="5000"
            step="10"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="flex-1"
          />
          <span className="text-lg font-semibold text-blue-600 min-w-24">
            {radius}m
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Atau input langsung:
        </p>
        <input
          type="number"
          min="10"
          max="5000"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 mt-1"
        />
      </div>

      <div className="bg-blue-50 p-3 rounded border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Info:</strong> Geofence digunakan untuk validasi check-in karyawan. 
          Karyawan hanya bisa check-in jika berada dalam radius ini dari lokasi outlet.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Menyimpan..." : "Simpan Geofence"}
      </button>
    </form>
  );
}
