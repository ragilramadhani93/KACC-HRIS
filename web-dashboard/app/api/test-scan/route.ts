import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Check Gemini key
        const hasGeminiKey = !!process.env.GEMINI_API_KEY;
        const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
        const geminiKeyPrefix = process.env.GEMINI_API_KEY?.substring(0, 10) || 'not set';

        // Get employees
        const employees = await prisma.employee.findMany();
        const employeeSummary = employees.map(e => ({
            id: e.id,
            name: e.name,
            hasPhoto: !!e.photoUrl,
            photoLength: e.photoUrl?.length || 0,
        }));

        // Test Gemini API
        let geminiStatus = 'untested';
        let geminiError = '';

        if (hasGeminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent('Reply with just: OK');
                geminiStatus = result.response.text().trim();
            } catch (err: any) {
                geminiStatus = 'FAILED';
                geminiError = err.message || 'Unknown error';
            }
        } else {
            geminiStatus = 'NO_API_KEY';
        }

        return NextResponse.json({
            status: 'OK',
            employees: employeeSummary,
            employeeCount: employees.length,
            gemini: {
                hasKey: hasGeminiKey,
                keyPrefix: geminiKeyPrefix,
                status: geminiStatus,
                error: geminiError,
            },
            openai: {
                hasKey: hasOpenAIKey,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
