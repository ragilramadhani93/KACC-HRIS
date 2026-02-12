import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadModels, computeDescriptor, euclideanDistance, bufferFromBase64, faceapi, loadImage } from '@/lib/face-api';

// Haversine formula
function getDistanceInMeters(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

type OutletMatch = { id: string; name: string; distance: number } | null;

async function findNearestOutlet(
    latitude: number,
    longitude: number
): Promise<{ match: OutletMatch; nearest: OutletMatch }> {
    const outlets = await prisma.outlet.findMany({ where: { isActive: true } });

    let matchedOutlet: OutletMatch = null;
    let nearestOutlet: OutletMatch = null;
    let nearestDistance = Infinity;

    for (const outlet of outlets) {
        const distance = getDistanceInMeters(
            latitude, longitude,
            outlet.latitude, outlet.longitude
        );

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestOutlet = { id: outlet.id, name: outlet.name, distance: Math.round(distance) };
        }

        if (distance <= outlet.radius) {
            matchedOutlet = { id: outlet.id, name: outlet.name, distance: Math.round(distance) };
            break;
        }
    }

    return { match: matchedOutlet, nearest: nearestOutlet };
}

export async function POST(request: Request) {
    try {
        await loadModels();

        const { image, latitude, longitude, locationName } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        // 1. Geofence Check
        let matchedOutletId: string | null = null;
        if (latitude !== undefined && longitude !== undefined) {
            const { match, nearest } = await findNearestOutlet(latitude, longitude);
            if (!match) {
                const nearestInfo = nearest
                    ? `Outlet terdekat: ${nearest.name} (${nearest.distance}m)`
                    : 'Tidak ada outlet aktif';
                return NextResponse.json({
                    success: false,
                    error: 'OUTSIDE_GEOFENCE',
                    message: `Anda berada di luar jangkauan outlet. ${nearestInfo}`,
                }, { status: 403 });
            }
            matchedOutletId = match.id;
        }

        // 2. Detect face in scanned image
        const targetDescriptorArray = await computeDescriptor(image);

        if (!targetDescriptorArray) {
            return NextResponse.json({
                success: false,
                message: 'No face detected in the photo. Please try again.',
                confidence: 0
            }, { status: 400 });
        }

        // 3. Compare against CACHED descriptors (fast path!)
        const employees = await prisma.employee.findMany({
            where: {
                faceDescriptor: { not: null },
            },
            select: {
                id: true,
                name: true,
                faceDescriptor: true,
            }
        });

        let bestMatch = {
            employeeId: null as string | null,
            distance: Infinity,
            name: ""
        };

        const MATCH_THRESHOLD = 0.55;

        console.log(`Comparing against ${employees.length} employees (cached descriptors)...`);
        const compareStart = Date.now();

        for (const emp of employees) {
            if (!emp.faceDescriptor) continue;

            try {
                const empDescriptor: number[] = JSON.parse(emp.faceDescriptor);
                const distance = euclideanDistance(targetDescriptorArray, empDescriptor);

                if (distance < bestMatch.distance) {
                    bestMatch = {
                        employeeId: emp.id,
                        distance: distance,
                        name: emp.name
                    };
                }
            } catch (err) {
                console.error(`Error comparing descriptor for ${emp.name}:`, err);
            }
        }

        const compareTime = Date.now() - compareStart;
        console.log(`Descriptor comparison took ${compareTime}ms for ${employees.length} employees`);

        // 4. Determine Result
        if (bestMatch.distance < MATCH_THRESHOLD && bestMatch.employeeId) {
            const employeeId = bestMatch.employeeId;
            const confidence = 1 - bestMatch.distance;

            // Handle Clock In/Out logic
            const lastAttendance = await prisma.attendance.findFirst({
                where: { employeeId },
                orderBy: { createdAt: 'desc' },
            });

            const now = new Date();
            let action = 'CLOCK_IN';
            let message = 'Welcome!';

            if (lastAttendance && !lastAttendance.clockOutTime) {
                action = 'CLOCK_OUT';
                message = 'Goodbye!';

                const startTime = new Date(lastAttendance.clockInTime);
                const durationMs = now.getTime() - startTime.getTime();
                const durationMinutes = Math.floor(durationMs / 60000);

                await prisma.attendance.update({
                    where: { id: lastAttendance.id },
                    data: {
                        clockOutTime: now,
                        workDuration: durationMinutes,
                    },
                });
            } else {
                // CLOCK IN
                const workStartTime = new Date();
                workStartTime.setHours(9, 0, 0, 0);

                let status = 'ON_TIME';
                let lateDuration = 0;

                if (now.getDate() === workStartTime.getDate() && now > workStartTime) {
                    const diffMs = now.getTime() - workStartTime.getTime();
                    const diffMinutes = Math.floor(diffMs / 60000);
                    if (diffMinutes > 15) {
                        status = 'LATE';
                        lateDuration = diffMinutes;
                    }
                }

                await prisma.attendance.create({
                    data: {
                        employeeId,
                        clockInTime: now,
                        photoUrl: image,
                        status,
                        lateDuration,
                        latitude: latitude ?? null,
                        longitude: longitude ?? null,
                        locationName: locationName ?? null,
                        outletId: matchedOutletId,
                    },
                });
            }

            return NextResponse.json({
                success: true,
                action,
                employeeName: bestMatch.name,
                timestamp: now.toISOString(),
                message,
                confidence: parseFloat(confidence.toFixed(2)),
            });

        } else {
            return NextResponse.json({
                success: false,
                message: 'Face not recognized',
                confidence: bestMatch.distance === Infinity ? 0 : parseFloat((1 - bestMatch.distance).toFixed(2)),
                reason: `Best match distance ${bestMatch.distance.toFixed(2)} (Threshold: ${MATCH_THRESHOLD})`
            }, { status: 401 });
        }

    } catch (error: any) {
        console.error("Scan Error:", error);
        return NextResponse.json({
            error: 'Internal Server Error',
            detail: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
