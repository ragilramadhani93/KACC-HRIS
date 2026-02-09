import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/outlets - List all outlets
export async function GET() {
    try {
        const outlets = await prisma.outlet.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(outlets);
    } catch (error) {
        console.error('GET Outlets Error:', error);
        return NextResponse.json({ error: 'Failed to fetch outlets' }, { status: 500 });
    }
}

// POST /api/outlets - Create new outlet
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, address, latitude, longitude, radius, isActive } = body;

        if (!name || latitude === undefined || longitude === undefined) {
            return NextResponse.json(
                { error: 'Name, latitude, and longitude are required' },
                { status: 400 }
            );
        }

        const outlet = await prisma.outlet.create({
            data: {
                name,
                address: address ?? null,
                latitude,
                longitude,
                radius: radius ?? 100,
                isActive: isActive ?? true,
            },
        });

        return NextResponse.json(outlet);
    } catch (error) {
        console.error('POST Outlet Error:', error);
        return NextResponse.json({ error: 'Failed to create outlet' }, { status: 500 });
    }
}
