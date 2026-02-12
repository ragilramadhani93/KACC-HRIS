import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { loadModels, computeDescriptor } from '@/lib/face-api';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
    const status: any = {
        database: 'untested',
        faceApi: 'untested',
        computeTest: 'untested',
        env: process.env.NODE_ENV,
        cwd: process.cwd(),
    };

    try {
        // 1. Check Database
        const employees = await prisma.employee.count();
        status.database = `OK (${employees} employees)`;

        // 2. Check FaceAPI Models
        const modelPath = path.join(process.cwd(), 'public/models');
        status.modelPath = modelPath;

        try {
            // Check if directory exists
            if (fs.existsSync(modelPath)) {
                const files = fs.readdirSync(modelPath);
                status.modelFiles = files;
            } else {
                status.modelFiles = 'DIRECTORY_NOT_FOUND';
            }

            const start = Date.now();
            await loadModels();
            status.faceApi = `OK (Loaded in ${Date.now() - start}ms)`;
        } catch (err: any) {
            status.faceApi = `FAILED: ${err.message}`;
            return NextResponse.json(status);
        }

        // 3. Test Compute Descriptor (using first employee with photo)
        const emp = await prisma.employee.findFirst({
            where: { photoUrl: { not: '' } },
            select: { id: true, name: true, photoUrl: true }
        });

        if (emp && emp.photoUrl) {
            try {
                const startCompute = Date.now();
                // We're re-using the computeDescriptor logic which uses face-api + canvas internally
                const descriptor = await computeDescriptor(emp.photoUrl);

                if (descriptor) {
                    status.computeTest = `OK (Descriptor length: ${descriptor.length}, Time: ${Date.now() - startCompute}ms)`;
                } else {
                    status.computeTest = `OK (No face detected in test photo for ${emp.name}, but function ran)`;
                }
            } catch (err: any) {
                status.computeTest = `FAILED: ${err.message}`;
                console.error('Compute Test Failed:', err);
            }
        } else {
            status.computeTest = 'SKIPPED (No employee with photo found)';
        }

        return NextResponse.json(status);
    } catch (error: any) {
        return NextResponse.json({ ...status, error: error.message }, { status: 500 });
    }
}
