import express from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { body, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { uploadImageToR2 } from "../utils/r2.js";

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

async function uploadEmployeePhotos({ avatarUrl, ktpPhotoUrl }, employeeKey) {
  const [uploadedAvatarUrl, uploadedKtpPhotoUrl] = await Promise.all([
    uploadImageToR2(avatarUrl, {
      folder: "employees/avatars",
      fileName: `${employeeKey}-avatar`,
    }),
    uploadImageToR2(ktpPhotoUrl, {
      folder: "employees/ktp",
      fileName: `${employeeKey}-ktp`,
    }),
  ]);

  return {
    avatarUrl: uploadedAvatarUrl ?? null,
    ktpPhotoUrl: uploadedKtpPhotoUrl ?? null,
  };
}

router.get("/", async (req, res) => {
  const { q, departmentId } = req.query;

  const users = await prisma.user.findMany({
    where: {
      role: "employee",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(departmentId ? { departmentId } : {}),
    },
    include: { department: true, outlet: true },
    orderBy: { name: "asc" },
  });

  return res.json(users);
});

router.post(
  "/",
  [body("name").isString(), body("email").isEmail(), body("password").isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      password,
      departmentId,
      position,
      hourlyRate,
      avatarUrl,
      address,
      phoneNumber,
      bank,
      accountNumber,
      emergencyContact,
      ktpPhotoUrl,
      outletId,
      isActive = true,
    } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);
    const photoFields = await uploadEmployeePhotos(
      { avatarUrl, ktpPhotoUrl },
      `employee-${Date.now()}-${randomUUID()}`
    );

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "employee",
        departmentId: departmentId ?? null,
        position: position ?? null,
        hourlyRate: hourlyRate ?? null,
        avatarUrl: photoFields.avatarUrl,
        address: address ?? null,
        phoneNumber: phoneNumber ?? null,
        bank: bank ?? null,
        accountNumber: accountNumber ?? null,
        emergencyContact: emergencyContact ?? null,
        ktpPhotoUrl: photoFields.ktpPhotoUrl,
        outletId: outletId ?? null,
        isActive,
      },
      include: { department: true, outlet: true },
    });

    return res.status(201).json(user);
  }
);

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;
  const photoFields = await uploadEmployeePhotos(
    { avatarUrl: payload.avatarUrl, ktpPhotoUrl: payload.ktpPhotoUrl },
    `employee-${id}-${Date.now()}`
  );

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: payload.name,
      email: payload.email,
      departmentId: payload.departmentId ?? null,
      position: payload.position ?? null,
      hourlyRate: payload.hourlyRate ?? null,
      avatarUrl: photoFields.avatarUrl,
      address: payload.address ?? null,
      phoneNumber: payload.phoneNumber ?? null,
      bank: payload.bank ?? null,
      accountNumber: payload.accountNumber ?? null,
      emergencyContact: payload.emergencyContact ?? null,
      ktpPhotoUrl: photoFields.ktpPhotoUrl,
      outletId: payload.outletId ?? null,
      isActive: payload.isActive,
      ...(passwordHash ? { passwordHash } : {}),
    },
    include: { department: true, outlet: true },
  });

  return res.json(updated);
});

router.put("/:id/fcm-token", async (req, res) => {
  const { id } = req.params;

  const updated = await prisma.user.update({
    where: { id },
    data: { fcmToken: req.body.fcmToken ?? null },
  });

  return res.json(updated);
});

export default router;
