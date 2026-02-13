import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const debugInfo = {
            cwd: process.cwd(),
            __dirname: __dirname,
            publicExists: fs.existsSync(path.join(process.cwd(), 'public')),
            publicModelsExists: fs.existsSync(path.join(process.cwd(), 'public/models')),
            filesInModels: [] as string[],
            env: process.env.NODE_ENV
        };

        const modelsPath = path.join(process.cwd(), 'public/models');
        if (fs.existsSync(modelsPath)) {
            debugInfo.filesInModels = fs.readdirSync(modelsPath);
        }

        return NextResponse.json(debugInfo);
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
