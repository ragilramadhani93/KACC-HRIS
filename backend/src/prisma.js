import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

dotenv.config();

export function createPrismaClient() {
	const databaseUrl = process.env.DATABASE_URL;
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
