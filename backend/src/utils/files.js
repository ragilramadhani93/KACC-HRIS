import fs from "fs";
import path from "path";

export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function saveBase64Image(base64, uploadDir, fileName) {
  if (!base64) return null;

  const clean = base64.includes(",") ? base64.split(",")[1] : base64;
  const buffer = Buffer.from(clean, "base64");

  ensureDir(uploadDir);
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, buffer);

  return filePath;
}
