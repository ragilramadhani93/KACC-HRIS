// Example: Using Geofence in Check-in Flow
// File: web-dashboard/app/api/attendance/check-in/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Example implementation showing how to integrate geofence check
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, outletId, latitude, longitude } = body;

        // 1. Get outlet with geofence data
        const outlet = await prisma.outlet.findUnique({
            where: { id: outletId },
            select: { 
                id: true,
                name: true,
                latitude: true, 
                longitude: true, 
                radius: true 
            },
        });

        if (!outlet) {
            return NextResponse.json(
                { error: 'Outlet not found' },
                { status: 404 }
            );
        }

        // 2. Check if geofence is configured
        if (!outlet.latitude || !outlet.longitude) {
            return NextResponse.json(
                { error: 'Geofence not configured for this outlet' },
                { status: 400 }
            );
        }

        // 3. Calculate distance using Haversine formula
        const distance = calculateDistance(
            latitude,
            longitude,
            parseFloat(outlet.latitude.toString()),
            parseFloat(outlet.longitude.toString())
        );

        // 4. Check if within geofence
        const isWithinGeofence = distance <= outlet.radius;

        if (!isWithinGeofence) {
            return NextResponse.json(
                {
                    error: 'Outside geofence',
                    distance: Math.round(distance),
                    message: `You are ${Math.round(distance - outlet.radius)}m outside the geofence`
                },
                { status: 400 }
            );
        }

        // 5. If within geofence, proceed with check-in
        const attendance = await prisma.attendance.create({
            data: {
                userId,
                outletId,
                checkInTime: new Date(),
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                status: 'CHECKED_IN',
                distanceFromGeofence: Math.round(distance),
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Check-in successful',
                attendance,
                distanceFromCenter: Math.round(distance),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Check-in Error:', error);
        return NextResponse.json(
            { error: 'Check-in failed' },
            { status: 500 }
        );
    }
}

// Haversine formula for distance calculation
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}
