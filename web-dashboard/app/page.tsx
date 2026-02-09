import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic"; // Ensure fresh data

export default async function DashboardPage() {
  const employeesCount = await prisma.employee.count();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendancesToday = await prisma.attendance.findMany({
    where: {
      clockInTime: {
        gte: today,
      },
    },
  });

  const presentCount = attendancesToday.length; // Unique employees if they can check in multiple times? 
  // Assuming 1 check-in per day for simplicity or filtering unique employeeIds
  const uniquePresent = new Set(attendancesToday.map(a => a.employeeId)).size;

  const lateCount = attendancesToday.filter(a => a.status === 'LATE').length;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeesCount}</div>
            <p className="text-xs text-muted-foreground">
              Registered in the system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Present Today
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniquePresent}</div>
            <p className="text-xs text-muted-foreground">
              Checked in today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Late Arrivals
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{lateCount}</div>
            <p className="text-xs text-muted-foreground">
              Arrived after 9:15 AM
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
