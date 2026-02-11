import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const prismaClientSingleton = () => {
    // Use Turso in production, local SQLite in development
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
        // Prisma v7: PrismaLibSQL accepts config directly (not a Client instance)
        const adapter = new PrismaLibSql({
            url: `${process.env.TURSO_DATABASE_URL}`,
            authToken: `${process.env.TURSO_AUTH_TOKEN}`,
        });
        return new PrismaClient({ adapter });
    } else {
        // Fallback for local development without Turso (will error if trying to use)
        console.warn('Turso credentials not found. Database operations will fail.');
        return new PrismaClient();
    }
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
