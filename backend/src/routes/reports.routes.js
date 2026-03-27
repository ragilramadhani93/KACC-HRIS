import express from "express";
import dayjs from "dayjs";
import PDFDocument from "pdfkit";
import { stringify } from "csv-stringify/sync";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { toDateRange } from "../utils/time.js";

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/summary", async (req, res) => {
  const { startDate, endDate, userId } = req.query;

  const where = {};
  if (startDate && endDate) {
    const { start, end } = toDateRange(startDate, endDate);
    where.clockIn = { gte: start, lte: end };
  }
  if (userId) {
    where.userId = userId;
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: { user: true },
    orderBy: { clockIn: "desc" },
  });

  const grouped = new Map();

  for (const entry of entries) {
    const key = entry.userId;
    const existing = grouped.get(key) || {
      userId: entry.userId,
      name: entry.user.name,
      hourlyRate: Number(entry.user.hourlyRate || 0),
      totalHours: 0,
      grossPay: 0,
      entries: 0,
    };

    const hours = Number(entry.totalHours || 0);
    existing.totalHours += hours;
    existing.entries += 1;
    existing.grossPay = Number((existing.totalHours * existing.hourlyRate).toFixed(2));

    grouped.set(key, existing);
  }

  return res.json(Array.from(grouped.values()));
});

router.get("/export", async (req, res) => {
  const { format = "csv", startDate, endDate } = req.query;
  const where = {};

  if (startDate && endDate) {
    const { start, end } = toDateRange(startDate, endDate);
    where.clockIn = { gte: start, lte: end };
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: { user: true },
    orderBy: { clockIn: "desc" },
  });

  const records = entries.map((entry) => ({
    date: dayjs(entry.clockIn).format("YYYY-MM-DD"),
    name: entry.user.name,
    clockIn: dayjs(entry.clockIn).format("HH:mm"),
    clockOut: entry.clockOut ? dayjs(entry.clockOut).format("HH:mm") : "",
    totalHours: Number(entry.totalHours || 0),
    status: entry.status,
    notes: entry.notes || "",
  }));

  if (format === "pdf") {
    const doc = new PDFDocument({ margin: 32, size: "A4" });
    const fileName = `timesheet-${dayjs().format("YYYYMMDD-HHmm")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    doc.pipe(res);
    doc.fontSize(16).text("Timesheet Report", { underline: true });
    doc.moveDown();

    records.forEach((row) => {
      doc
        .fontSize(10)
        .text(`${row.date} | ${row.name} | In: ${row.clockIn} | Out: ${row.clockOut} | Hours: ${row.totalHours} | ${row.status}`);
    });

    doc.end();
    return;
  }

  const csv = stringify(records, { header: true });
  const fileName = `timesheet-${dayjs().format("YYYYMMDD-HHmm")}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  return res.send(csv);
});

export default router;
