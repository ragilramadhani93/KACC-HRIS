import dotenv from "dotenv";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

dotenv.config();

function normalizeEnvValue(value) {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	return trimmed.replace(/^['"]|['"]$/g, "");
}

const runtimeDatabaseUrl = normalizeEnvValue(process.env.TURSO_DATABASE_URL) || normalizeEnvValue(process.env.DATABASE_URL);
const prismaDatasourceUrl =
	normalizeEnvValue(process.env.PRISMA_DATABASE_URL) ||
	(runtimeDatabaseUrl?.startsWith("libsql://") ? "file:./dev.db" : runtimeDatabaseUrl || "file:./dev.db");

process.env.PRISMA_DATABASE_URL = prismaDatasourceUrl;

const { PrismaClient } = await import("@prisma/client");

export function createPrismaClient() {
	const databaseUrl = runtimeDatabaseUrl;
	const tursoAuthToken = normalizeEnvValue(process.env.TURSO_AUTH_TOKEN);

	// Use the LibSQL adapter when the URL points to Turso/libsql.
	if (databaseUrl?.startsWith("libsql://")) {
		if (!tursoAuthToken) {
			throw new Error("Missing TURSO_AUTH_TOKEN for libsql connection");
		}

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
