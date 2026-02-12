import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface AttendanceRecord {
    id: string;
    employee: {
        name: string;
        userCode: string; // Updated from email to userCode
        photoUrl: string | null;
    };
    clockInTime: Date;
    status: string;
    lateDuration: number | null;
}

interface RecentAttendanceProps {
    data: AttendanceRecord[];
}

export function RecentAttendance({ data }: RecentAttendanceProps) {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                    Latest {data.length} check-ins today.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {data.map((item) => (
                        <div key={item.id} className="flex items-center">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={item.employee.photoUrl || ""} className="object-cover" />
                                <AvatarFallback>{item.employee.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">{item.employee.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {item.employee.userCode}
                                </p>
                            </div>
                            <div className="ml-auto font-medium text-sm">
                                {new Date(item.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {item.status === 'LATE' && (
                                    <span className="ml-2 text-xs text-red-500 font-normal">
                                        (+{item.lateDuration}m)
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-4">
                            No attendance records for today yet.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
