import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/outlets/[id] - Get single outlet
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        const outlet = await prisma.outlet.findUnique({
            where: { id },
        });

        if (!outlet) {
            return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
        }

        return NextResponse.json(outlet);
    } catch (error) {
        console.error('GET Outlet Error:', error);
        return NextResponse.json({ error: 'Failed to fetch outlet' }, { status: 500 });
    }
}

// PUT /api/outlets/[id] - Update outlet
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, address, latitude, longitude, radius, isActive } = body;

        const existing = await prisma.outlet.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
        }

        const outlet = await prisma.outlet.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(address !== undefined && { address }),
                ...(latitude !== undefined && { latitude }),
                ...(longitude !== undefined && { longitude }),
                ...(radius !== undefined && { radius }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        return NextResponse.json(outlet);
    } catch (error) {
        console.error('PUT Outlet Error:', error);
        return NextResponse.json({ error: 'Failed to update outlet' }, { status: 500 });
    }
}

// DELETE /api/outlets/[id] - Delete outlet
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        const existing = await prisma.outlet.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
        }

        // Remove outlet reference from attendances
        await prisma.attendance.updateMany({
            where: { outletId: id },
            data: { outletId: null },
        });

        await prisma.outlet.delete({ where: { id } });

        return NextResponse.json({ success: true, message: 'Outlet deleted successfully' });
    } catch (error) {
        console.error('DELETE Outlet Error:', error);
        return NextResponse.json({ error: 'Failed to delete outlet' }, { status: 500 });
    }
}
