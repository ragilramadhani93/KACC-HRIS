import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";

export default function ReportsPage() {
  const { data = [] } = useQuery({
    queryKey: ["report-summary"],
    queryFn: async () => (await api.get("/reports/summary")).data,
  });

  async function exportFile(format: "csv" | "pdf") {
    const response = await api.get("/reports/export", {
      params: { format },
      responseType: "blob",
    });

    const url = URL.createObjectURL(response.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={() => exportFile("csv")}>Export CSV</button>
        <button className="btn btn-secondary" onClick={() => exportFile("pdf")}>Export PDF</button>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold">Payroll Preview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Name</th>
                <th className="p-2">Hours</th>
                <th className="p-2">Rate</th>
                <th className="p-2">Gross Pay</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row: any) => (
                <tr key={row.userId} className="border-b">
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.totalHours.toFixed(2)}</td>
                  <td className="p-2">{Number(row.hourlyRate || 0).toFixed(2)}</td>
                  <td className="p-2">{Number(row.grossPay || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold">Weekly Trend</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="totalHours" stroke="#1A56DB" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
