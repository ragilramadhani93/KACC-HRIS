import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "../lib/api";

type Entry = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  totalHours: number | null;
  status: string;
  selfieUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
};

export default function TimesheetPage() {
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const queryClient = useQueryClient();

  const enabled = Boolean(userId);

  const { data = [] } = useQuery<Entry[]>({
    queryKey: ["timesheet", userId, startDate, endDate],
    enabled,
    queryFn: async () =>
      (await api.get(`/timesheet/${userId}`, { params: { startDate, endDate } })).data,
  });

  const approve = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api.put(`/timesheet/${id}/approve`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timesheet"] }),
  });

  const rows = useMemo(() => data, [data]);

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 md:grid-cols-4">
        <input className="input" placeholder="Employee ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn btn-primary">Apply Filter</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Date</th>
              <th className="p-2">In</th>
              <th className="p-2">Out</th>
              <th className="p-2">Break</th>
              <th className="p-2">Hours</th>
              <th className="p-2">Status</th>
              <th className="p-2">Photo/GPS</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="p-2">{new Date(row.clockIn).toLocaleDateString()}</td>
                <td className="p-2">{new Date(row.clockIn).toLocaleTimeString()}</td>
                <td className="p-2">{row.clockOut ? new Date(row.clockOut).toLocaleTimeString() : "-"}</td>
                <td className="p-2">
                  {row.breakStart && row.breakEnd ? `${new Date(row.breakStart).toLocaleTimeString()} - ${new Date(row.breakEnd).toLocaleTimeString()}` : "-"}
                </td>
                <td className="p-2">{row.totalHours || 0}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">
                  {row.selfieUrl ? "Selfie" : "No selfie"} | {row.address || `${row.latitude || "-"}, ${row.longitude || "-"}`}
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => approve.mutate({ id: row.id, status: "APPROVED" })}>
                      Approve
                    </button>
                    <button className="btn btn-secondary" onClick={() => approve.mutate({ id: row.id, status: "REJECTED" })}>
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
