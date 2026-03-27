import express from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { signToken } from "../utils/jwt.js";

const router = express.Router();

router.post(
  "/login",
  [body("email").isEmail(), body("password").isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { department: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        hourlyRate: user.hourlyRate,
        avatarUrl: user.avatarUrl,
      },
    });
  }
);

router.get("/me", requireAuth, async (req, res) => {
  const user = req.user;
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    position: user.position,
    hourlyRate: user.hourlyRate,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
  });
});

export default router;
