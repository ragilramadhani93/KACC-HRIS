import { prisma } from "@/lib/prisma";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge"; // Badge for status? I need to install it or use span

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
    const attendances = await prisma.attendance.findMany({
        include: {
            employee: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return (
        <div className="p-8 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Attendance Log</h2>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Time In</TableHead>
                            <TableHead>Time Out</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Duration</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attendances.map((record) => (
                            <TableRow key={record.id}>
                                <TableCell className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={record.employee.photoUrl || ""} className="object-cover" />
                                        <AvatarFallback>{record.employee.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium">{record.employee.name}</div>
                                        <div className="text-xs text-muted-foreground">{record.employee.userCode}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {new Date(record.clockInTime).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    {record.clockOutTime ? new Date(record.clockOutTime).toLocaleString() : "-"}
                                </TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.status === 'LATE'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        }`}>
                                        {record.status}
                                        {record.lateDuration > 0 && ` (${record.lateDuration}m)`}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {record.clockOutTime ? `${record.workDuration} min` : "Working..."}
                                </TableCell>
                            </TableRow>
                        ))}
                        {attendances.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    No attendance records found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
