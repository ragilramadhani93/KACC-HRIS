import dotenv from "dotenv";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

dotenv.config();

const runtimeDatabaseUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;

if (runtimeDatabaseUrl?.startsWith("libsql://")) {
	process.env.DATABASE_URL = "file:./prisma/dev.db";
}

const { PrismaClient } = await import("@prisma/client");

export function createPrismaClient() {
	const databaseUrl = runtimeDatabaseUrl;
	const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

	// Use the LibSQL adapter when the URL points to Turso/libsql.
	if (databaseUrl?.startsWith("libsql://")) {
		const client = createClient({
			url: databaseUrl,
			authToken: tursoAuthToken,
		});
		const adapter = new PrismaLibSQL(client);
		return new PrismaClient({ adapter });
	}

	if (databaseUrl) {
		return new PrismaClient({ datasourceUrl: databaseUrl });
	}

	return new PrismaClient();
}

export const prisma = createPrismaClient();
