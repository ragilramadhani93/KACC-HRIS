import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout";
import DashboardPage from "./pages/dashboard";
import EmployeesPage from "./pages/employees";
import LoginPage from "./pages/login";
import OutletsPage from "./pages/outlets";
import ReportsPage from "./pages/reports";
import TimesheetPage from "./pages/timesheet";
import { useAuthStore } from "./store/auth";

function Protected() {
  const token = useAuthStore((s) => s.token);
  return token ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="outlets" element={<OutletsPage />} />
        <Route path="timesheet" element={<TimesheetPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
