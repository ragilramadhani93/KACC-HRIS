import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/attendance - List all attendance records with filtering
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Query parameters for filtering
        const employeeId = searchParams.get('employeeId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const status = searchParams.get('status');
        const summary = searchParams.get('summary');

        // Build where clause
        const where: {
            employeeId?: string;
            status?: string;
            clockInTime?: { gte?: Date; lte?: Date };
        } = {};

        if (employeeId) {
            where.employeeId = employeeId;
        }

        if (status) {
            where.status = status;
        }

        if (startDate || endDate) {
            where.clockInTime = {};
            if (startDate) {
                where.clockInTime.gte = new Date(startDate);
            }
            if (endDate) {
                // Include the entire end date
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.clockInTime.lte = end;
            }
        }

        // If summary requested, return aggregated data
        if (summary === 'true') {
            const [totalRecords, lateCount, onTimeCount, todayRecords] = await Promise.all([
                prisma.attendance.count({ where }),
                prisma.attendance.count({ where: { ...where, status: 'LATE' } }),
                prisma.attendance.count({ where: { ...where, status: 'ON_TIME' } }),
                prisma.attendance.count({
                    where: {
                        ...where,
                        clockInTime: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        },
                    },
                }),
            ]);

            return NextResponse.json({
                totalRecords,
                lateCount,
                onTimeCount,
                todayRecords,
                latePercentage: totalRecords > 0 ? ((lateCount / totalRecords) * 100).toFixed(1) : 0,
            });
        }

        // Fetch attendance records with employee data
        const attendances = await prisma.attendance.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        userCode: true,
                        name: true,
                        department: true,
                    },
                },
            },
            orderBy: { clockInTime: 'desc' },
            take: 100, // Limit to prevent large responses
        });

        return NextResponse.json(attendances);
    } catch (error) {
        console.error('GET Attendance Error:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
    }
}
