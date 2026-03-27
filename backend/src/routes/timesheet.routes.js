import express from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { computeWorkedHours, toDateRange } from "../utils/time.js";

const router = express.Router();
const REVIEWABLE_STATUSES = ["APPROVED", "REJECTED", "SICK_LEAVE", "PERSONAL_LEAVE"];
const LEAVE_STATUSES = ["SICK_LEAVE", "PERSONAL_LEAVE"];

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

router.post(
  "/leave-request",
  [
    body("leaveType").isIn(LEAVE_STATUSES),
    body("date").isISO8601(),
    body("notes").optional().isString(),
    body("userId").optional().isString(),
  ],
  async (req, res) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ errors: validationErrors.array() });
    }

    const { leaveType, date, notes, userId } = req.body;

    const targetUserId = req.user.role === "admin" && userId ? userId : req.user.id;

    if (req.user.role !== "admin" && userId && userId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await prisma.timeEntry.findFirst({
      where: {
        userId: targetUserId,
        clockIn: { gte: dayStart, lte: dayEnd },
      },
    });

    if (existing) {
      return res.status(409).json({ message: "Entry for this date already exists" });
    }

    const created = await prisma.timeEntry.create({
      data: {
        userId: targetUserId,
        clockIn: dayStart,
        clockOut: dayStart,
        totalHours: 0,
        status: leaveType,
        notes: notes ?? null,
      },
    });

    return res.status(201).json(created);
  }
);

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
  [body("status").isIn(REVIEWABLE_STATUSES), body("notes").optional().isString()],
  async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        status,
        notes: notes ?? null,
      },
    });

    return res.json(updated);
  }
);

export default router;
