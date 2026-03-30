import express from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { createClient } from "@libsql/client";
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

let libsqlClient = null;

function getLibsqlClient() {
  if (libsqlClient) {
    return libsqlClient;
  }

  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !url.startsWith("libsql://")) {
    return null;
  }

  libsqlClient = createClient({
    url,
    authToken,
  });

  return libsqlClient;
}

async function findUserByEmail(email) {
  const normalizedEmail = String(email).trim().toLowerCase();

  const client = getLibsqlClient();
  if (!client) {
    return null;
  }

  const result = await withTimeout(
    client.execute({
      sql: 'SELECT id, name, email, role, is_active as isActive, password_hash as passwordHash FROM users WHERE lower(email) = ? LIMIT 1',
      args: [normalizedEmail],
    }),
    5000,
    "LibSQL login query timed out"
  );

  const row = result?.rows?.[0];
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    name: row.name ? String(row.name) : "",
    email: row.email ? String(row.email) : normalizedEmail,
    role: row.role ? String(row.role) : "employee",
    isActive: row.isActive === true || row.isActive === 1 || row.isActive === "1",
    passwordHash: row.passwordHash ? String(row.passwordHash) : "",
  };
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
