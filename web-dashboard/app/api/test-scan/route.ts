import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Check OpenAI key
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
        }

        // Get employees
        const employees = await prisma.employee.findMany();

        const employeeSummary = employees.map(e => ({
            id: e.id,
            name: e.name,
            hasPhoto: !!e.photoUrl,
            photoLength: e.photoUrl?.length || 0,
            photoPrefix: e.photoUrl?.substring(0, 50) || 'none',
        }));

        // Try a simple OpenAI call to verify the API key works
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        let openaiStatus = 'untested';
        let openaiError = '';

        try {
            const test = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: 'Reply with just: OK' }],
                max_tokens: 5,
            });
            openaiStatus = test.choices[0]?.message?.content || 'empty response';
        } catch (err: any) {
            openaiStatus = 'FAILED';
            openaiError = err.message || 'Unknown error';
        }

        return NextResponse.json({
            status: 'OK',
            employees: employeeSummary,
            employeeCount: employees.length,
            openai: {
                status: openaiStatus,
                error: openaiError,
                keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 8) + '...',
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
