import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { api } from "../lib/api";

type Shift = {
  id: string;
  outletId: string;
  name: string;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
  isActive: boolean;
};

type Outlet = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  isActive: boolean;
  shifts: Shift[];
};

export default function OutletsPage() {
  const queryClient = useQueryClient();
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [editingOutletId, setEditingOutletId] = useState<string | null>(null);

  const [outletForm, setOutletForm] = useState({
    code: "",
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radius: "100",
  });
  const [shiftForm, setShiftForm] = useState({ name: "", startTime: "08:00", endTime: "16:00", isOvernight: false });

  const { data: outlets = [] } = useQuery<Outlet[]>({
    queryKey: ["outlets"],
    queryFn: async () => (await api.get("/outlets")).data,
  });

  const selectedOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === selectedOutletId) ?? outlets[0] ?? null,
    [outlets, selectedOutletId]
  );

  const createOutlet = useMutation({
    mutationFn: async () => api.post("/outlets", outletForm),
    onSuccess: async () => {
      resetOutletForm();
      await queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
  });

  const updateOutlet = useMutation({
    mutationFn: async () => api.put(`/outlets/${editingOutletId}`, outletForm),
    onSuccess: async () => {
      resetOutletForm();
      await queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
  });

  const toggleOutlet = useMutation({
    mutationFn: async (outlet: Outlet) => api.put(`/outlets/${outlet.id}`, { isActive: !outlet.isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
  });

  const deleteOutlet = useMutation({
    mutationFn: async (outletId: string) => api.delete(`/outlets/${outletId}`),
    onSuccess: async () => {
      setSelectedOutletId("");
      await queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
  });

  const createShift = useMutation({
    mutationFn: async (outletId: string) => api.post(`/outlets/${outletId}/shifts`, shiftForm),
    onSuccess: async () => {
      setShiftForm({ name: "", startTime: "08:00", endTime: "16:00", isOvernight: false });
      await queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
  });

  const toggleShift = useMutation({
    mutationFn: async ({ outletId, shift }: { outletId: string; shift: Shift }) =>
      api.put(`/outlets/${outletId}/shifts/${shift.id}`, { isActive: !shift.isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
  });

  const deleteShift = useMutation({
    mutationFn: async ({ outletId, shiftId }: { outletId: string; shiftId: string }) =>
      api.delete(`/outlets/${outletId}/shifts/${shiftId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
  });

  function onSubmitOutlet(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editingOutletId) {
      updateOutlet.mutate();
      return;
    }
    createOutlet.mutate();
  }

  function onEditOutlet(outlet: Outlet) {
    setEditingOutletId(outlet.id);
    setOutletForm({
      code: outlet.code,
      name: outlet.name,
      address: outlet.address || "",
      latitude: outlet.latitude !== null ? String(outlet.latitude) : "",
      longitude: outlet.longitude !== null ? String(outlet.longitude) : "",
      radius: String(outlet.radius || 100),
    });
  }

  function resetOutletForm() {
    setEditingOutletId(null);
    setOutletForm({ code: "", name: "", address: "", latitude: "", longitude: "", radius: "100" });
  }

  function onSubmitShift(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedOutlet) return;
    createShift.mutate(selectedOutlet.id);
  }

  function handleExportOutlets() {
    const rows = outlets.map((outlet, index) => ({
      No: index + 1,
      Code: outlet.code,
      Name: outlet.name,
      Address: outlet.address || "",
      Latitude: outlet.latitude ?? "",
      Longitude: outlet.longitude ?? "",
      RadiusMeters: outlet.radius ?? "",
      GeofenceConfigured: outlet.latitude !== null && outlet.longitude !== null ? "Yes" : "No",
      ShiftCount: outlet.shifts.length,
      Status: outlet.isActive ? "Active" : "Inactive",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outlets");
    XLSX.writeFile(workbook, `outlets-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
      <section className="space-y-4">
        <div className="card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">{editingOutletId ? "Edit Outlet" : "Outlet Management"}</h3>
            <button className="btn btn-secondary" onClick={handleExportOutlets} type="button">
              Export Excel
            </button>
          </div>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmitOutlet}>
            <input
              className="input"
              placeholder="Code (JKT-01)"
              value={outletForm.code}
              onChange={(e) => setOutletForm((prev) => ({ ...prev, code: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder="Outlet Name"
              value={outletForm.name}
              onChange={(e) => setOutletForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder="Address"
              value={outletForm.address}
              onChange={(e) => setOutletForm((prev) => ({ ...prev, address: e.target.value }))}
            />
            <input
              className="input"
              type="number"
              step="any"
              placeholder="Latitude (-6.2088)"
              value={outletForm.latitude}
              onChange={(e) => setOutletForm((prev) => ({ ...prev, latitude: e.target.value }))}
            />
            <input
              className="input"
              type="number"
              step="any"
              placeholder="Longitude (106.8456)"
              value={outletForm.longitude}
              onChange={(e) => setOutletForm((prev) => ({ ...prev, longitude: e.target.value }))}
            />
            <input
              className="input"
              type="number"
              min={10}
              max={5000}
              placeholder="Radius (meter)"
              value={outletForm.radius}
              onChange={(e) => setOutletForm((prev) => ({ ...prev, radius: e.target.value }))}
            />
            <button className="btn btn-primary" disabled={createOutlet.isPending || updateOutlet.isPending} type="submit">
              {createOutlet.isPending || updateOutlet.isPending
                ? "Saving..."
                : editingOutletId
                  ? "Update Outlet"
                  : "Add Outlet"}
            </button>
            {editingOutletId ? (
              <button className="btn btn-secondary" type="button" onClick={resetOutletForm}>
                Cancel Edit
              </button>
            ) : null}
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Isi latitude, longitude, dan radius untuk mengaktifkan geofence outlet.
          </p>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Code</th>
                <th className="p-2">Outlet</th>
                <th className="p-2">Address</th>
                <th className="p-2">Geofence</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {outlets.map((outlet) => (
                <tr
                  key={outlet.id}
                  className={`border-b ${selectedOutlet?.id === outlet.id ? "bg-blue-50" : ""}`}
                  onClick={() => setSelectedOutletId(outlet.id)}
                >
                  <td className="p-2 font-medium">{outlet.code}</td>
                  <td className="p-2">{outlet.name}</td>
                  <td className="p-2">{outlet.address || "-"}</td>
                  <td className="p-2">
                    {outlet.latitude !== null && outlet.longitude !== null
                      ? `${outlet.latitude.toFixed(6)}, ${outlet.longitude.toFixed(6)} (${outlet.radius}m)`
                      : "Belum diset"}
                  </td>
                  <td className="p-2">{outlet.isActive ? "Active" : "Inactive"}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditOutlet(outlet);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOutlet.mutate(outlet);
                        }}
                      >
                        {outlet.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOutlet.mutate(outlet.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {outlets.length === 0 ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={6}>
                    No outlets found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="card">
          <h3 className="mb-1 text-lg font-semibold">Shift Management per Outlet</h3>
          <p className="mb-3 text-sm text-slate-500">
            {selectedOutlet ? `Selected outlet: ${selectedOutlet.name}` : "Pilih outlet dulu untuk kelola shift."}
          </p>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmitShift}>
            <input
              className="input"
              placeholder="Shift Name"
              value={shiftForm.name}
              onChange={(e) => setShiftForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              disabled={!selectedOutlet}
            />
            <input
              className="input"
              type="time"
              value={shiftForm.startTime}
              onChange={(e) => setShiftForm((prev) => ({ ...prev, startTime: e.target.value }))}
              required
              disabled={!selectedOutlet}
            />
            <input
              className="input"
              type="time"
              value={shiftForm.endTime}
              onChange={(e) => setShiftForm((prev) => ({ ...prev, endTime: e.target.value }))}
              required
              disabled={!selectedOutlet}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={shiftForm.isOvernight}
                onChange={(e) => setShiftForm((prev) => ({ ...prev, isOvernight: e.target.checked }))}
                disabled={!selectedOutlet}
              />
              Overnight Shift
            </label>
            <button className="btn btn-primary md:col-span-4" disabled={!selectedOutlet || createShift.isPending} type="submit">
              {createShift.isPending ? "Saving..." : "Add Shift"}
            </button>
          </form>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Shift</th>
                <th className="p-2">Start</th>
                <th className="p-2">End</th>
                <th className="p-2">Overnight</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {(selectedOutlet?.shifts || []).map((shift) => (
                <tr key={shift.id} className="border-b">
                  <td className="p-2 font-medium">{shift.name}</td>
                  <td className="p-2">{shift.startTime}</td>
                  <td className="p-2">{shift.endTime}</td>
                  <td className="p-2">{shift.isOvernight ? "Yes" : "No"}</td>
                  <td className="p-2">{shift.isActive ? "Active" : "Inactive"}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary"
                        onClick={() => toggleShift.mutate({ outletId: selectedOutlet.id, shift })}
                      >
                        {shift.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => deleteShift.mutate({ outletId: selectedOutlet.id, shiftId: shift.id })}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(selectedOutlet?.shifts || []).length === 0 ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={6}>
                    No shifts in this outlet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
