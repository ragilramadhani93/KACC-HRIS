import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

// OpenAI client - initialized lazily in handler
let openai: OpenAI | null = null;

function getOpenAI() {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
}

// Haversine formula to calculate distance between two GPS coordinates in meters
function getDistanceInMeters(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Find outlet that employee is within radius of
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
            break; // Found a match, no need to continue
        }
    }

    return { match: matchedOutlet, nearest: nearestOutlet };
}

export async function POST(request: Request) {
    try {
        const { image, latitude, longitude, locationName } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        // 1. Fetch all employees to use as candidates
        const employees = await prisma.employee.findMany();

        if (employees.length === 0) {
            return NextResponse.json({ error: 'No employees found in database' }, { status: 404 });
        }

        // 1.5 Geofence validation - check if location is within any outlet
        let matchedOutletId: string | null = null;
        let outletName: string | null = null;

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
            outletName = match.name;
        }

        // 2. Construct Prompt for GPT-4o
        // We send the "Target" (scanned) image and "Candidate" images.
        type ContentItem =
            | { type: 'text'; text: string }
            | { type: 'image_url'; image_url: { url: string } };

        const content: ContentItem[] = [
            {
                type: "text",
                text: "You are a Face Recognition system. I will provide a target face image and a list of candidate faces with their IDs. Identify which candidate matches the target face. Return the ID of the matched candidate in a JSON object: { \"match\": true, \"employeeId\": \"...\" }. If no match is found with high confidence, return { \"match\": false }."
            },
            {
                type: "text",
                text: "TARGET FACE:"
            },
            {
                type: "image_url",
                image_url: { url: image }
            }
        ];

        employees.forEach(emp => {
            if (emp.photoUrl) {
                content.push({
                    type: "text",
                    text: `CANDIDATE ID: ${emp.id}`
                });
                content.push({
                    type: "image_url",
                    image_url: { url: emp.photoUrl }
                });
            }
        });

        // 3. Call OpenAI API
        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: content as any,
                },
            ],
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        console.log("Recognition Result:", result);

        if (result.match && result.employeeId) {
            const employeeId = result.employeeId;

            // 4. Handle Clock In/Out logic
            // Find the most recent attendance for this employee
            const lastAttendance = await prisma.attendance.findFirst({
                where: { employeeId },
                orderBy: { createdAt: 'desc' },
            });

            const now = new Date();
            let action = 'CLOCK_IN';
            let message = 'Welcome!';

            // If last attendance exists and has NO clockOutTime, then we CLOCK OUT
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
                // Check for lateness (Example: Work starts at 09:00)
                // Simple logic: If time > 09:15, assume Late.
                // For dynamic shifts, would need Employee settings.
                const workStartTime = new Date();
                workStartTime.setHours(9, 0, 0, 0); // 9:00 AM

                let status = 'ON_TIME';
                let lateDuration = 0;

                // Only count late if it's the same day and after 9:15
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

            // Fetch employee name for feedback
            const employee = employees.find(e => e.id === employeeId);

            return NextResponse.json({
                success: true,
                action,
                employeeName: employee?.name,
                timestamp: now.toISOString(),
                message
            });

        } else {
            return NextResponse.json({ success: false, message: 'Face not recognized' }, { status: 401 });
        }

    } catch (error) {
        console.error("Scan Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
