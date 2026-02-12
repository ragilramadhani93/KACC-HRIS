import { prisma } from "@/lib/prisma";
import { EmployeeClient } from "./components/employee-client";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
    const employees = await prisma.employee.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="p-8 space-y-4">
            <EmployeeClient initialEmployees={employees} />
        </div>
    );
}
