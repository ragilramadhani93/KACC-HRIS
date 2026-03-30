import express from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { signToken } from "../utils/jwt.js";

const router = express.Router();

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

async function findUserByEmail(email) {
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await withTimeout(
    prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    }),
    8000,
    "Login query timed out"
  );

  return user ?? null;
}

router.post(
  "/login",
  [body("email").isEmail(), body("password").isLength({ min: 6 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await findUserByEmail(email);

      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const ok = await withTimeout(
        bcrypt.compare(password, user.passwordHash),
        5000,
        "Password verification timed out"
      );

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
          department: null,
          position: null,
          hourlyRate: null,
          avatarUrl: null,
        },
      });
    } catch (error) {
      console.error("Login failed", error);
      return res.status(503).json({ message: "Authentication service unavailable" });
    }
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
