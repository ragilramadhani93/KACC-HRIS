import express from "express";
import dayjs from "dayjs";
import { body, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { computeWorkedHours } from "../utils/time.js";
import { uploadBase64ImageToR2 } from "../utils/r2.js";

const router = express.Router();

router.use(requireAuth);

router.post(
  "/clock-in",
  [
    body("photo_base64").isString().notEmpty(),
    body("latitude").optional().isFloat(),
    body("longitude").optional().isFloat(),
    body("address").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { photo_base64, latitude, longitude, address } = req.body;

    const openEntry = await prisma.timeEntry.findFirst({
      where: { userId: req.user.id, clockOut: null },
      orderBy: { clockIn: "desc" },
    });

    if (openEntry) {
      return res.status(409).json({ message: "User already clocked in" });
    }

    const fileName = `${req.user.id}-${Date.now()}.jpg`;
    const selfiePath = await uploadBase64ImageToR2(photo_base64, fileName);

    const entry = await prisma.timeEntry.create({
      data: {
        userId: req.user.id,
        clockIn: new Date(),
        selfieUrl: selfiePath,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        address: address ?? null,
        ipAddress: req.ip,
        status: "PRESENT",
      },
    });

    return res.status(201).json(entry);
  }
);

router.post("/clock-out", async (req, res) => {
  const { latitude, longitude, address } = req.body;

  const entry = await prisma.timeEntry.findFirst({
    where: { userId: req.user.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  });

  if (!entry) {
    return res.status(404).json({ message: "No active clock-in found" });
  }

  const clockOut = new Date();
  const totalHours = computeWorkedHours(entry.clockIn, clockOut, entry.breakStart, entry.breakEnd);

  const updated = await prisma.timeEntry.update({
    where: { id: entry.id },
    data: {
      clockOut,
      totalHours,
      latitude: latitude ?? entry.latitude,
      longitude: longitude ?? entry.longitude,
      address: address ?? entry.address,
      status: "PENDING",
    },
  });

  return res.json(updated);
});

router.post("/break-start", async (req, res) => {
  const entry = await prisma.timeEntry.findFirst({
    where: { userId: req.user.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  });

  if (!entry) {
    return res.status(404).json({ message: "No active clock-in found" });
  }

  if (entry.breakStart && !entry.breakEnd) {
    return res.status(409).json({ message: "Break already started" });
  }

  const updated = await prisma.timeEntry.update({
    where: { id: entry.id },
    data: { breakStart: new Date(), breakEnd: null },
  });

  return res.json(updated);
});

router.post("/break-end", async (req, res) => {
  const entry = await prisma.timeEntry.findFirst({
    where: { userId: req.user.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  });

  if (!entry || !entry.breakStart) {
    return res.status(404).json({ message: "No active break found" });
  }

  const updated = await prisma.timeEntry.update({
    where: { id: entry.id },
    data: { breakEnd: new Date() },
  });

  return res.json(updated);
});

router.get("/status/:userId", async (req, res) => {
  const { userId } = req.params;

  if (req.user.role !== "admin" && req.user.id !== userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const activeEntry = await prisma.timeEntry.findFirst({
    where: { userId, clockOut: null },
    orderBy: { clockIn: "desc" },
  });

  return res.json({
    isClockedIn: Boolean(activeEntry),
    entry: activeEntry,
    serverTime: dayjs().toISOString(),
  });
});

export default router;
