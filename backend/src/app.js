import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

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

app.use("/api/auth", authRoutes);
app.use("/api/timeclock", timeclockRoutes);
app.use("/api/timesheet", timesheetRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/outlets", outletsRoutes);
app.use("/api/reports", reportsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
