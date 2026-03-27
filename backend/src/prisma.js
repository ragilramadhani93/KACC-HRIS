import dotenv from "dotenv";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

dotenv.config();

const runtimeDatabaseUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const prismaDatasourceUrl =
	process.env.PRISMA_DATABASE_URL ||
	(runtimeDatabaseUrl?.startsWith("libsql://") ? "file:./dev.db" : runtimeDatabaseUrl || "file:./dev.db");

process.env.PRISMA_DATABASE_URL = prismaDatasourceUrl;

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

	if (prismaDatasourceUrl) {
		return new PrismaClient({ datasourceUrl: prismaDatasourceUrl });
	}

	return new PrismaClient();
}

export const prisma = createPrismaClient();
