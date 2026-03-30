import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { prisma } from "./prisma.js";
import authRoutes from "./routes/auth.routes.js";
import employeesRoutes from "./routes/employees.routes.js";
import outletsRoutes from "./routes/outlets.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import timeclockRoutes from "./routes/timeclock.routes.js";
import timesheetRoutes from "./routes/timesheet.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/health/version", (req, res) => {
	res.json({
		status: "ok",
		version: "login-fix-20260330-1",
	});
});

app.get("/health/usercheck", async (req, res) => {
	try {
		const user = await prisma.user.findFirst({
			where: { email: "admin@company.com" },
			select: { id: true, email: true, role: true, isActive: true, passwordHash: true },
		});
		return res.json({ found: !!user, hasHash: !!(user?.passwordHash), isActive: user?.isActive });
	} catch (error) {
		return res.status(500).json({ error: error?.message || String(error) });
	}
});

app.get("/health/bcrypttest", async (req, res) => {
	try {
		const { default: bcrypt } = await import("bcryptjs");
		const user = await prisma.user.findFirst({
			where: { email: "admin@company.com" },
			select: { passwordHash: true },
		});
		if (!user?.passwordHash) {
			return res.json({ error: "No hash found" });
		}
		const match = await bcrypt.compare("Admin123!", user.passwordHash);
		return res.json({ hashPresent: true, passwordMatch: match });
	} catch (error) {
		return res.status(500).json({ error: error?.message || String(error) });
	}
});

app.get("/health/tokentest", async (req, res) => {
	try {
		const { signToken } = await import("./utils/jwt.js");
		const token = signToken({ id: "test-id", role: "admin", email: "admin@company.com" });
		return res.json({ token: token.substring(0, 30) + "...", length: token.length });
	} catch (error) {
		return res.status(500).json({ error: error?.message || String(error) });
	}
});

app.get("/health/db", async (req, res) => {
	const env = {
		hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
		hasTursoAuthToken: Boolean(process.env.TURSO_AUTH_TOKEN),
		hasJwtSecret: Boolean(process.env.JWT_SECRET),
	};

	try {
		const countPromise = prisma.user.count();
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error("Database check timed out after 10 seconds")), 10000);
		});

		const userCount = await Promise.race([countPromise, timeoutPromise]);
		return res.json({ status: "ok", db: "connected", userCount, env });
	} catch (error) {
		return res.status(500).json({
			status: "error",
			db: "unreachable",
			env,
			message: error instanceof Error ? error.message : "Unknown database error",
		});
	}
});

app.use("/api/auth", authRoutes);
app.use("/api/timeclock", timeclockRoutes);
app.use("/api/timesheet", timesheetRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/outlets", outletsRoutes);
app.use("/api/reports", reportsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
