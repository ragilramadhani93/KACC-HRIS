import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/employees", label: "Employees" },
  { to: "/outlets", label: "Outlets & Shifts" },
  { to: "/timesheet", label: "Timesheet" },
  { to: "/leave-request", label: "Input Izin" },
  { to: "/reports", label: "Reports" },
];

export default function Layout() {
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-primary">Employee Time Clock</h1>
            <p className="text-sm text-slate-500">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user?.name}</span>
            <button className="rounded bg-primary px-3 py-2 text-sm text-white" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border bg-white p-3">
          <nav className="space-y-2">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  location.pathname.startsWith(item.to)
                    ? "bg-primary text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
