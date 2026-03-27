import express from "express";
import { body, param, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
 import { isWithinGeofence, validateGeofence } from "../utils/geofence.js";

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }

  return true;
}

router.get("/", async (_req, res) => {
  const outlets = await prisma.outlet.findMany({
    include: { shifts: { orderBy: [{ startTime: "asc" }, { name: "asc" }] } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return res.json(outlets);
});

router.post(
  "/",
  [
    body("code").isString().trim().notEmpty().isLength({ max: 24 }),
    body("name").isString().trim().notEmpty().isLength({ max: 80 }),
    body("address").optional({ nullable: true }).isString().isLength({ max: 255 }),
   body("latitude").optional({ nullable: true }).isDecimal(),
   body("longitude").optional({ nullable: true }).isDecimal(),
   body("radius").optional({ nullable: true }).isInt({ min: 10, max: 5000 }),
    body("isActive").optional().isBoolean(),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    const created = await prisma.outlet.create({
      data: {
        code: req.body.code.trim().toUpperCase(),
        name: req.body.name.trim(),
        address: req.body.address?.trim() || null,
         latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
         longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
         radius: req.body.radius ? parseInt(req.body.radius) : 100,
        isActive: req.body.isActive ?? true,
      },
      include: { shifts: true },
    });

    return res.status(201).json(created);
  }
);

router.put(
  "/:id",
  [
    param("id").isString().notEmpty(),
    body("code").optional().isString().trim().notEmpty().isLength({ max: 24 }),
    body("name").optional().isString().trim().notEmpty().isLength({ max: 80 }),
    body("address").optional({ nullable: true }).isString().isLength({ max: 255 }),
   body("latitude").optional({ nullable: true }).isDecimal(),
   body("longitude").optional({ nullable: true }).isDecimal(),
   body("radius").optional({ nullable: true }).isInt({ min: 10, max: 5000 }),
    body("isActive").optional().isBoolean(),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    const payload = {
      ...(req.body.code !== undefined ? { code: req.body.code.trim().toUpperCase() } : {}),
      ...(req.body.name !== undefined ? { name: req.body.name.trim() } : {}),
      ...(req.body.address !== undefined ? { address: req.body.address?.trim() || null } : {}),
       ...(req.body.latitude !== undefined ? { latitude: req.body.latitude ? parseFloat(req.body.latitude) : null } : {}),
       ...(req.body.longitude !== undefined ? { longitude: req.body.longitude ? parseFloat(req.body.longitude) : null } : {}),
       ...(req.body.radius !== undefined ? { radius: req.body.radius ? parseInt(req.body.radius) : 100 } : {}),
      ...(req.body.isActive !== undefined ? { isActive: req.body.isActive } : {}),
    };

    const updated = await prisma.outlet.update({
      where: { id: req.params.id },
      data: payload,
      include: { shifts: { orderBy: [{ startTime: "asc" }, { name: "asc" }] } },
    });

    return res.json(updated);
  }
);

router.delete("/:id", [param("id").isString().notEmpty()], async (req, res) => {
  if (!validate(req, res)) return;

  await prisma.outlet.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

router.get("/:outletId/shifts", [param("outletId").isString().notEmpty()], async (req, res) => {
  if (!validate(req, res)) return;

  const shifts = await prisma.outletShift.findMany({
    where: { outletId: req.params.outletId },
    orderBy: [{ startTime: "asc" }, { name: "asc" }],
  });

  return res.json(shifts);
});

router.post(
  "/:outletId/shifts",
  [
    param("outletId").isString().notEmpty(),
    body("name").isString().trim().notEmpty().isLength({ max: 60 }),
    body("startTime").isString().matches(hhmmRegex),
    body("endTime").isString().matches(hhmmRegex),
    body("isOvernight").optional().isBoolean(),
    body("isActive").optional().isBoolean(),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    const created = await prisma.outletShift.create({
      data: {
        outletId: req.params.outletId,
        name: req.body.name.trim(),
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        isOvernight: req.body.isOvernight ?? false,
        isActive: req.body.isActive ?? true,
      },
    });

    return res.status(201).json(created);
  }
);

router.put(
  "/:outletId/shifts/:shiftId",
  [
    param("outletId").isString().notEmpty(),
    param("shiftId").isString().notEmpty(),
    body("name").optional().isString().trim().notEmpty().isLength({ max: 60 }),
    body("startTime").optional().isString().matches(hhmmRegex),
    body("endTime").optional().isString().matches(hhmmRegex),
    body("isOvernight").optional().isBoolean(),
    body("isActive").optional().isBoolean(),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    const exists = await prisma.outletShift.findFirst({
      where: { id: req.params.shiftId, outletId: req.params.outletId },
      select: { id: true },
    });

    if (!exists) {
      return res.status(404).json({ message: "Shift not found" });
    }

    const payload = {
      ...(req.body.name !== undefined ? { name: req.body.name.trim() } : {}),
      ...(req.body.startTime !== undefined ? { startTime: req.body.startTime } : {}),
      ...(req.body.endTime !== undefined ? { endTime: req.body.endTime } : {}),
      ...(req.body.isOvernight !== undefined ? { isOvernight: req.body.isOvernight } : {}),
      ...(req.body.isActive !== undefined ? { isActive: req.body.isActive } : {}),
    };

    const updated = await prisma.outletShift.update({
      where: { id: req.params.shiftId },
      data: payload,
    });

    return res.json(updated);
  }
);

router.delete(
  "/:outletId/shifts/:shiftId",
  [param("outletId").isString().notEmpty(), param("shiftId").isString().notEmpty()],
  async (req, res) => {
    if (!validate(req, res)) return;

    const exists = await prisma.outletShift.findFirst({
      where: { id: req.params.shiftId, outletId: req.params.outletId },
      select: { id: true },
    });

    if (!exists) {
      return res.status(404).json({ message: "Shift not found" });
    }

    await prisma.outletShift.delete({ where: { id: req.params.shiftId } });
    return res.status(204).send();
  }
);

   // Get geofence details for outlet
   router.get("/:outletId/geofence", [param("outletId").isString().notEmpty()], async (req, res) => {
     if (!validate(req, res)) return;

     const outlet = await prisma.outlet.findUnique({
       where: { id: req.params.outletId },
       select: { id: true, latitude: true, longitude: true, radius: true },
     });

     if (!outlet) {
       return res.status(404).json({ message: "Outlet not found" });
     }

     return res.json({
       outletId: outlet.id,
       latitude: outlet.latitude,
       longitude: outlet.longitude,
       radius: outlet.radius,
       isConfigured: outlet.latitude !== null && outlet.longitude !== null,
     });
   });

   // Check if coordinates are within outlet geofence
   router.post(
     "/:outletId/geofence/check",
     [
       param("outletId").isString().notEmpty(),
       body("latitude").isDecimal(),
       body("longitude").isDecimal(),
     ],
     async (req, res) => {
       if (!validate(req, res)) return;

       const outlet = await prisma.outlet.findUnique({
         where: { id: req.params.outletId },
         select: { id: true, latitude: true, longitude: true, radius: true },
       });

       if (!outlet) {
         return res.status(404).json({ message: "Outlet not found" });
       }

       if (!outlet.latitude || !outlet.longitude) {
         return res.status(400).json({ message: "Geofence not configured for this outlet" });
       }

       const result = isWithinGeofence(
         req.body.latitude,
         req.body.longitude,
         outlet.latitude,
         outlet.longitude,
         outlet.radius
       );

       return res.json({
         outletId: outlet.id,
         userLatitude: req.body.latitude,
         userLongitude: req.body.longitude,
         ...result,
       });
     }
   );

export default router;
