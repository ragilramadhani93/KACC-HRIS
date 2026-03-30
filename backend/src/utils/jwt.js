import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
let JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Sanitize expiresIn: remove quotes and trim
JWT_EXPIRES_IN = String(JWT_EXPIRES_IN).trim().replace(/^["']|["']$/g, "");
if (!JWT_EXPIRES_IN || JWT_EXPIRES_IN === "undefined") {
  JWT_EXPIRES_IN = "7d";
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
