import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // https://<account_id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const MIME_EXTENSION_MAP = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

function ensureR2Config() {
  const required = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing R2 configuration: ${missing.join(", ")}`);
  }
}

function parseBase64Image(base64) {
  if (!base64 || typeof base64 !== "string") {
    return null;
  }

  const trimmed = base64.trim();
  if (!trimmed) {
    return null;
  }

  const dataUrlMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      contentType: dataUrlMatch[1].toLowerCase(),
      buffer: Buffer.from(dataUrlMatch[2], "base64"),
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  const looksLikeRawBase64 =
    trimmed.length >= 128 && trimmed.length % 4 === 0 && /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed);

  if (!looksLikeRawBase64) {
    return null;
  }

  return {
    contentType: "image/jpeg",
    buffer: Buffer.from(trimmed, "base64"),
  };
}

function buildPublicUrl(key) {
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  return publicBase ? `${publicBase}/${key}` : key;
}

function ensureFileName(fileName, contentType) {
  if (fileName.includes(".")) {
    return fileName;
  }

  const extension = MIME_EXTENSION_MAP[contentType] ?? "jpg";
  return `${fileName}.${extension}`;
}

export function shouldUploadToR2(value) {
  return Boolean(parseBase64Image(value));
}

export async function uploadImageToR2(base64, { folder = "uploads", fileName } = {}) {
  if (typeof base64 === "undefined") {
    return undefined;
  }

  if (base64 === null) {
    return null;
  }

  const parsed = parseBase64Image(base64);
  if (!parsed) {
    return base64 ?? null;
  }

  ensureR2Config();

  const safeFileName = ensureFileName(fileName ?? `${Date.now()}`, parsed.contentType);
  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${safeFileName}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: parsed.buffer,
      ContentType: parsed.contentType,
    })
  );

  return buildPublicUrl(key);
}

/**
 * Upload a base64-encoded image to Cloudflare R2.
 * Returns the public URL of the uploaded object.
 */
export async function uploadBase64ImageToR2(base64, fileName) {
  return uploadImageToR2(base64, { folder: "selfies", fileName });
}
