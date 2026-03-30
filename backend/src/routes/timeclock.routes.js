import express from "express";
import dayjs from "dayjs";
import { body, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  computeDescriptorFromImage,
  euclideanDistance,
  parseDescriptor,
  serializeDescriptor,
} from "../utils/face-recognition.js";
import { isWithinGeofence } from "../utils/geofence.js";
import { computeWorkedHours } from "../utils/time.js";
import { uploadBase64ImageToR2 } from "../utils/r2.js";

const router = express.Router();

const FACE_MATCH_THRESHOLD = 0.55;

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }

  return true;
}

async function getUserActiveEntry(userId) {
  return prisma.timeEntry.findFirst({
    where: { userId, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
}

async function ensureUserDescriptor(user) {
  const cached = parseDescriptor(user.faceDescriptor);
  if (cached) {
    return cached;
  }

  if (!user.avatarUrl) {
    return null;
  }

  try {
    const descriptor = await computeDescriptorFromImage(user.avatarUrl);
    if (!descriptor) {
      return null;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { faceDescriptor: serializeDescriptor(descriptor) },
    });

    return descriptor;
  } catch (error) {
    console.error(`Failed to backfill descriptor for ${user.name}`, error);
    return null;
  }
}

function buildGeofencePayload(outlet, distance) {
  if (!outlet || outlet.latitude === null || outlet.longitude === null) {
    return null;
  }

  return {
    outletId: outlet.id,
    outletName: outlet.name,
    radius: outlet.radius,
    distance,
  };
}

async function createClockInEntry(user, { photoBase64, latitude, longitude, address, ipAddress }) {
  const selfieUrl = await uploadBase64ImageToR2(photoBase64, `${user.id}-${Date.now()}.jpg`);

  return prisma.timeEntry.create({
    data: {
      userId: user.id,
      clockIn: new Date(),
      selfieUrl,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      address: address ?? null,
      ipAddress,
      status: "PRESENT",
    },
  });
}

async function clockOutEntry(entry, { latitude, longitude, address }) {
  const clockOut = new Date();
  const totalHours = computeWorkedHours(entry.clockIn, clockOut, entry.breakStart, entry.breakEnd);

  return prisma.timeEntry.update({
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
}

router.post(
  "/face-scan",
  [
    body("photo_base64").isString().notEmpty(),
    body("latitude").optional({ nullable: true }).isFloat(),
    body("longitude").optional({ nullable: true }).isFloat(),
    body("address").optional({ nullable: true }).isString(),
  ],
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const { photo_base64: photoBase64, latitude, longitude, address } = req.body;
    const targetDescriptor = await computeDescriptorFromImage(photoBase64);

    if (!targetDescriptor) {
      return res.status(400).json({
        success: false,
        message: "No face detected in the photo. Please try again.",
      });
    }

    const users = await prisma.user.findMany({
      where: {
        role: "employee",
        isActive: true,
        OR: [{ faceDescriptor: { not: null } }, { avatarUrl: { not: null } }],
      },
      select: {
        id: true,
        name: true,
        position: true,
        avatarUrl: true,
        faceDescriptor: true,
        outlet: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            radius: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    let bestMatch = null;

    for (const user of users) {
      const descriptor = await ensureUserDescriptor(user);
      if (!descriptor) {
        continue;
      }

      const distance = euclideanDistance(targetDescriptor, descriptor);
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { user, distance };
      }
    }

    if (!bestMatch || bestMatch.distance >= FACE_MATCH_THRESHOLD) {
      return res.status(401).json({
        success: false,
        message: "Face not recognized",
        confidence: bestMatch ? Number((1 - bestMatch.distance).toFixed(2)) : 0,
      });
    }

    let geofence = null;
    if (
      bestMatch.user.outlet &&
      bestMatch.user.outlet.latitude !== null &&
      bestMatch.user.outlet.longitude !== null &&
      latitude !== undefined &&
      longitude !== undefined
    ) {
      const geofenceCheck = isWithinGeofence(
        latitude,
        longitude,
        bestMatch.user.outlet.latitude,
        bestMatch.user.outlet.longitude,
        bestMatch.user.outlet.radius
      );

      geofence = buildGeofencePayload(bestMatch.user.outlet, geofenceCheck.distance);

      if (!geofenceCheck.isWithinGeofence) {
        return res.status(403).json({
          success: false,
          message: "Employee recognized, but outside assigned outlet geofence.",
          employee: {
            id: bestMatch.user.id,
            name: bestMatch.user.name,
            position: bestMatch.user.position,
            avatarUrl: bestMatch.user.avatarUrl,
          },
          confidence: Number((1 - bestMatch.distance).toFixed(2)),
          geofence,
        });
      }
    }

    const activeEntry = await getUserActiveEntry(bestMatch.user.id);
    const action = activeEntry ? "CLOCK_OUT" : "CLOCK_IN";
    const entry = activeEntry
      ? await clockOutEntry(activeEntry, { latitude, longitude, address })
      : await createClockInEntry(bestMatch.user, {
          photoBase64,
          latitude,
          longitude,
          address,
          ipAddress: req.ip,
        });

    return res.json({
      success: true,
      action,
      message: action === "CLOCK_IN" ? "Clock in recorded" : "Clock out recorded",
      employee: {
        id: bestMatch.user.id,
        name: bestMatch.user.name,
        position: bestMatch.user.position,
        avatarUrl: bestMatch.user.avatarUrl,
      },
      confidence: Number((1 - bestMatch.distance).toFixed(2)),
      geofence,
      entry,
      serverTime: dayjs().toISOString(),
    });
  }
);

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
    if (!validate(req, res)) {
      return;
    }

    const { photo_base64, latitude, longitude, address } = req.body;

    const openEntry = await getUserActiveEntry(req.user.id);

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

  const entry = await getUserActiveEntry(req.user.id);

  if (!entry) {
    return res.status(404).json({ message: "No active clock-in found" });
  }

  const updated = await clockOutEntry(entry, { latitude, longitude, address });

  return res.json(updated);
});

router.post("/break-start", async (req, res) => {
  const entry = await getUserActiveEntry(req.user.id);

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
  const entry = await getUserActiveEntry(req.user.id);

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

  const activeEntry = await getUserActiveEntry(userId);

  return res.json({
    isClockedIn: Boolean(activeEntry),
    entry: activeEntry,
    serverTime: dayjs().toISOString(),
  });
});

export default router;
