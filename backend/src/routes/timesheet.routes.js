import express from "express";
import { body } from "express-validator";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { computeWorkedHours, toDateRange } from "../utils/time.js";

const router = express.Router();

router.use(requireAuth);

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;

  if (req.user.role !== "admin" && req.user.id !== userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const where = { userId };
  if (startDate && endDate) {
    const { start, end } = toDateRange(startDate, endDate);
    where.clockIn = { gte: start, lte: end };
  }

  const rows = await prisma.timeEntry.findMany({
    where,
    orderBy: { clockIn: "desc" },
  });

  return res.json(rows);
});

router.put("/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const payload = req.body;

  const current = await prisma.timeEntry.findUnique({ where: { id } });
  if (!current) {
    return res.status(404).json({ message: "Entry not found" });
  }

  const clockIn = payload.clockIn ? new Date(payload.clockIn) : current.clockIn;
  const clockOut = payload.clockOut ? new Date(payload.clockOut) : current.clockOut;
  const breakStart = payload.breakStart ? new Date(payload.breakStart) : current.breakStart;
  const breakEnd = payload.breakEnd ? new Date(payload.breakEnd) : current.breakEnd;

  const totalHours = computeWorkedHours(clockIn, clockOut, breakStart, breakEnd);

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: {
      clockIn,
      clockOut,
      breakStart,
      breakEnd,
      totalHours,
      notes: payload.notes ?? current.notes,
      status: payload.status ?? current.status,
    },
  });

  return res.json(updated);
});

router.put(
  "/:id/approve",
  requireRole("admin"),
  [body("status").isIn(["APPROVED", "REJECTED"]), body("notes").optional().isString()],
  async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        status: status === "APPROVED" ? "APPROVED" : "REJECTED",
        notes: notes ?? null,
      },
    });

    return res.json(updated);
  }
);

export default router;
