import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeDescriptor } from '@/lib/face-api';

export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(employees);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userCode, name, department, photoUrl } = body;

        // Compute face descriptor if photo is provided
        let faceDescriptor: string | null = null;
        if (photoUrl) {
            try {
                const descriptor = await computeDescriptor(photoUrl);
                if (descriptor) {
                    faceDescriptor = JSON.stringify(descriptor);
                    console.log(`Face descriptor computed for ${name} (${descriptor.length} dimensions)`);
                } else {
                    console.warn(`No face detected in photo for ${name}`);
                }
            } catch (err) {
                console.error(`Failed to compute descriptor for ${name}:`, err);
                // Continue without descriptor — can be backfilled later
            }
        }

        const employee = await prisma.employee.create({
            data: {
                userCode,
                name,
                department,
                photoUrl,
                faceDescriptor,
            },
        });

        return NextResponse.json(employee);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
    }
}
