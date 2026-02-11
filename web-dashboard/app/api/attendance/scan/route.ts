import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini client - initialized lazily
let genAI: GoogleGenerativeAI | null = null;

function getGemini() {
    if (!genAI) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
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
            break;
        }
    }

    return { match: matchedOutlet, nearest: nearestOutlet };
}

// Extract raw base64 data from data URL
function extractBase64(dataUrl: string): { mimeType: string; data: string } {
    const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
    if (match) {
        return { mimeType: match[1], data: match[2] };
    }
    // If not a data URL, assume it's raw base64 JPEG
    return { mimeType: 'image/jpeg', data: dataUrl };
}

export async function POST(request: Request) {
    try {
        const { image, latitude, longitude, locationName } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        // 1. Fetch all employees
        const employees = await prisma.employee.findMany();

        if (employees.length === 0) {
            return NextResponse.json({ error: 'No employees found in database' }, { status: 404 });
        }

        // 1.5 Geofence validation
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

        // 2. Build Gemini content with images
        const model = getGemini().getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        // Extract target image base64
        const targetImage = extractBase64(image);

        // Build parts array for Gemini
        const parts: any[] = [
            {
                text: `You are a Face Recognition system. I will provide a target face image and ${employees.filter(e => e.photoUrl).length} candidate face(s) with their IDs. 

Your job is to identify which candidate matches the target face. Compare facial features like face shape, eyes, nose, mouth, eyebrows, and overall appearance. Even if the lighting, angle, or image quality differs, try your best to match.

Return a JSON object:
- If match found (at least 40% confidence): { "match": true, "employeeId": "...", "confidence": 0.85, "reason": "..." }
- If no match: { "match": false, "confidence": 0, "reason": "..." }

Be lenient - if the person looks similar, consider it a match.

TARGET FACE (photo taken from mobile camera):`
            },
            {
                inlineData: {
                    mimeType: targetImage.mimeType,
                    data: targetImage.data,
                }
            },
        ];

        // Add candidate employees
        employees.forEach(emp => {
            if (emp.photoUrl) {
                const empImage = extractBase64(emp.photoUrl);
                parts.push({
                    text: `CANDIDATE ID: ${emp.id} (Name: ${emp.name})`
                });
                parts.push({
                    inlineData: {
                        mimeType: empImage.mimeType,
                        data: empImage.data,
                    }
                });
            }
        });

        // 3. Call Gemini API
        console.log("Calling Gemini API for face recognition...");
        const response = await model.generateContent(parts);
        const responseText = response.response.text();
        console.log("Gemini Response:", responseText);

        const result = JSON.parse(responseText);

        if (result.match && result.employeeId) {
            const employeeId = result.employeeId;

            // 4. Handle Clock In/Out logic
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
                // CLOCK IN - Check for lateness
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

            const employee = employees.find(e => e.id === employeeId);

            return NextResponse.json({
                success: true,
                action,
                employeeName: employee?.name,
                timestamp: now.toISOString(),
                message,
                confidence: result.confidence,
            });

        } else {
            return NextResponse.json({
                success: false,
                message: 'Face not recognized',
                confidence: result.confidence || 0,
                reason: result.reason || 'No match found'
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
