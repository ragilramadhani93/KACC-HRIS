import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";

export default function DashboardPage() {
  const { data: summary = [] } = useQuery({
    queryKey: ["summary"],
    queryFn: async () => (await api.get("/reports/summary")).data,
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Present" value={String(summary.length)} />
        <StatCard title="Absent" value="0" />
        <StatCard title="Late" value="0" />
        <StatCard title="Overtime" value="0" />
      </section>

      <section className="card">
        <h3 className="mb-4 text-lg font-semibold">Weekly Hours per Employee</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalHours" fill="#1A56DB" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 text-lg font-semibold">Live Feed</h3>
          <p className="text-sm text-slate-500">Current clock-in status is available via the status endpoint.</p>
        </div>

        <div className="card">
          <h3 className="mb-3 text-lg font-semibold">Recent Activities</h3>
          <p className="text-sm text-slate-500">Showing latest activities for {today}.</p>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}
