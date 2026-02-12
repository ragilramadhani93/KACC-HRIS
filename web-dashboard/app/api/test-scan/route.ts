import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { loadModels } from '@/lib/face-api';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
    const status: any = {
        database: 'untested',
        faceApi: 'untested',
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
        }

        return NextResponse.json(status);
    } catch (error: any) {
        return NextResponse.json({ ...status, error: error.message }, { status: 500 });
    }
}
