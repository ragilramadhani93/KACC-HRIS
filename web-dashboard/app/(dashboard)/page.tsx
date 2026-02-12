import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, AlertTriangle, UserMinus } from "lucide-react";
import { AttendanceChart } from "@/components/attendance-chart";
import { RecentAttendance } from "@/components/recent-attendance";
import { AbsentList } from "@/components/absent-list";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Fetch Key Stats
    const employeesCount = await prisma.employee.count();

    const attendancesToday = await prisma.attendance.findMany({
        where: { clockInTime: { gte: today } },
        include: { employee: true },
        orderBy: { clockInTime: 'desc' }
    });

    // Calculate stats
    const presentEmployeeIds = new Set(attendancesToday.map(a => a.employeeId));
    const uniquePresent = presentEmployeeIds.size;
    const lateCount = attendancesToday.filter(a => a.status === 'LATE').length;
    const absentCount = Math.max(0, employeesCount - uniquePresent);

    // 2. Fetch Weekly Attendance Data for Chart
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // Get raw records for last 7 days to process in JS (simpler than complex groupBy date logic in SQLite/Prisma)
    const lastWeekAttendances = await prisma.attendance.findMany({
        where: {
            clockInTime: { gte: sevenDaysAgo }
        },
        select: {
            clockInTime: true,
            employeeId: true
        }
    });

    // Initialize map for last 7 days
    const chartDataMap = new Map<string, Set<string>>(); // DateStr -> Set of EmployeeIDs
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Create last 7 days keys
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayName = dayNames[d.getDay()];
        chartDataMap.set(dayName, new Set());
    }

    // Populate actual data
    lastWeekAttendances.forEach(record => {
        const d = new Date(record.clockInTime);
        const dayName = dayNames[d.getDay()];
        if (chartDataMap.has(dayName)) {
            chartDataMap.get(dayName)?.add(record.employeeId);
        }
    });

    // Convert to array format for Recharts
    const chartData = Array.from(chartDataMap.entries()).map(([name, employees]) => ({
        name,
        total: employees.size
    }));

    // 3. Identify Absent Employees for Absent List
    // Get all active employees to cross-check
    const allEmployees = await prisma.employee.findMany({
        orderBy: { name: 'asc' }
    });

    const absentEmployees = allEmployees.filter(e => !presentEmployeeIds.has(e.id));

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            {/* Top Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{employeesCount}</div>
                        <p className="text-xs text-muted-foreground">Registered in system</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{uniquePresent}</div>
                        <p className="text-xs text-muted-foreground">Checked in today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
                        <p className="text-xs text-muted-foreground">Arrived after 9:15 AM</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Absent</CardTitle>
                        <UserMinus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{absentCount}</div>
                        <p className="text-xs text-muted-foreground">Not checked in yet</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">

                {/* Left Column (Chart + Recent) */}
                <div className="col-span-4 space-y-4">
                    <AttendanceChart data={chartData} />

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                        <RecentAttendance data={attendancesToday.slice(0, 5)} />
                    </div>
                </div>

                {/* Right Column (Absent List) */}
                <div className="col-span-3">
                    <AbsentList date={today} employees={absentEmployees} />
                </div>

            </div>
        </div>
    );
}
