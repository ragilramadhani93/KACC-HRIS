import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Employee {
    id: string;
    name: string;
    userCode: string;
    department: string | null;
    photoUrl: string | null;
}

interface AbsentListProps {
    date: Date;
    employees: Employee[];
}

export function AbsentList({ date, employees }: AbsentListProps) {
    // Group by department
    const grouped = employees.reduce((acc, emp) => {
        const dept = emp.department || "Other";
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(emp);
        return acc;
    }, {} as Record<string, Employee[]>);

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Absent Employees</CardTitle>
                <CardDescription>
                    {employees.length} employees haven't clocked in yet.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {Object.entries(grouped).map(([dept, emps]) => (
                        <div key={dept}>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                                {dept} ({emps.length})
                            </h4>
                            <div className="space-y-3">
                                {emps.map((emp) => (
                                    <div key={emp.id} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={emp.photoUrl || ""} className="object-cover" />
                                                <AvatarFallback>{emp.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="ml-3 space-y-0.5">
                                                <p className="text-sm font-medium leading-none">{emp.name}</p>
                                                <p className="text-xs text-muted-foreground">{emp.userCode}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">Absent</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {employees.length === 0 && (
                        <div className="text-center text-sm text-green-600 py-4">
                            🎉 All employees present!
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
