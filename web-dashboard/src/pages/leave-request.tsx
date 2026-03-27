import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";

type LeaveType = "SICK_LEAVE" | "PERSONAL_LEAVE";

export default function LeaveRequestPage() {
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("SICK_LEAVE");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createLeave = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {
        leaveType,
        date,
      };

      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      if (userId.trim()) {
        payload.userId = userId.trim();
      }

      return api.post("/timesheet/leave-request", payload);
    },
    onSuccess: () => {
      setMessage("Input izin berhasil disimpan.");
      setError(null);
      setNotes("");
    },
    onError: (err: any) => {
      const apiMessage = err?.response?.data?.message;
      setError(apiMessage || "Gagal menyimpan input izin.");
      setMessage(null);
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setError("Tanggal wajib diisi.");
      setMessage(null);
      return;
    }

    createLeave.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="mb-1 text-lg font-semibold">Input Izin</h2>
        <p className="text-sm text-slate-500">Buat izin sakit atau keperluan pribadi untuk tanggal tertentu.</p>
      </div>

      <form className="card grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-slate-600">Employee ID (opsional, hanya admin)</label>
          <input
            className="input"
            placeholder="Contoh: cmn8ksf4b000fq6mj8uftcw0q"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Tanggal</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Jenis Izin</label>
          <select className="input" value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)}>
            <option value="SICK_LEAVE">Sakit</option>
            <option value="PERSONAL_LEAVE">Keperluan Pribadi</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-slate-600">Keterangan (opsional)</label>
          <textarea
            className="input min-h-24"
            placeholder="Contoh: Demam, istirahat 1 hari"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <button className="btn btn-primary" type="submit" disabled={createLeave.isPending}>
            {createLeave.isPending ? "Menyimpan..." : "Simpan Izin"}
          </button>
          {message ? <span className="text-sm text-emerald-600">{message}</span> : null}
          {error ? <span className="text-sm text-rose-600">{error}</span> : null}
        </div>
      </form>
    </div>
  );
}
