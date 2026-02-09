import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/employees/[id] - Get single employee
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        const employee = await prisma.employee.findUnique({
            where: { id },
            include: {
                attendances: {
                    orderBy: { createdAt: 'desc' },
                    take: 10, // Last 10 attendance records
                },
            },
        });

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        return NextResponse.json(employee);
    } catch (error) {
        console.error('GET Employee Error:', error);
        return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
    }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { userCode, name, department, photoUrl } = body;

        // Check if employee exists
        const existing = await prisma.employee.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Check for userCode conflict if updating userCode
        if (userCode && userCode !== existing.userCode) {
            const conflict = await prisma.employee.findUnique({ where: { userCode } });
            if (conflict) {
                return NextResponse.json({ error: 'User code already exists' }, { status: 409 });
            }
        }

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                ...(userCode !== undefined && { userCode }),
                ...(name !== undefined && { name }),
                ...(department !== undefined && { department }),
                ...(photoUrl !== undefined && { photoUrl }),
            },
        });

        return NextResponse.json(employee);
    } catch (error) {
        console.error('PUT Employee Error:', error);
        return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
    }
}

// DELETE /api/employees/[id] - Delete employee
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Check if employee exists
        const existing = await prisma.employee.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Delete related attendance records first (cascade)
        await prisma.attendance.deleteMany({ where: { employeeId: id } });

        // Delete employee
        await prisma.employee.delete({ where: { id } });

        return NextResponse.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('DELETE Employee Error:', error);
        return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
    }
}
