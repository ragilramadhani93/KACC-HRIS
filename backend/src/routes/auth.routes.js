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
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      
      // Step 1: Find user
      const user = await prisma.user.findFirst({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true, role: true, isActive: true, passwordHash: true, name: true },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Step 2: Compare password
      const ok = await bcrypt.compare(password, user.passwordHash);

      if (!ok) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Step 3: Sign token
      const token = signToken(user);

      // Step 4: Return result
      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name || "",
          email: user.email || "",
          role: user.role || "employee",
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(503).json({ message: "Authentication service unavailable", detail: String(error?.message || error) });
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
