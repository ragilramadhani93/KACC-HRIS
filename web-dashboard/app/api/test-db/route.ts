import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log("Testing database connection...");

        // Check environment variables first
        const envCheck = {
            hasUrl: !!process.env.TURSO_DATABASE_URL,
            urlPrefix: process.env.TURSO_DATABASE_URL?.split("://")[0],
            hasToken: !!process.env.TURSO_AUTH_TOKEN,
        };

        // Try simple query
        const outletCount = await prisma.outlet.count();

        return NextResponse.json({
            status: "SUCCESS",
            message: "Database connection successful",
            data: {
                outletCount
            },
            env: envCheck
        });
    } catch (error: any) {
        console.error("Database Connection Failed:", error);
        return NextResponse.json({
            status: "ERROR",
            message: error.message || "Unknown error",
            name: error.name,
            // stack: error.stack, // Optional: might expose code paths
            env: {
                hasUrl: !!process.env.TURSO_DATABASE_URL,
                hasToken: !!process.env.TURSO_AUTH_TOKEN
            }
        }, { status: 500 });
    }
}
