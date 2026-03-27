import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // https://<account_id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a base64-encoded image to Cloudflare R2.
 * Returns the public URL of the uploaded object.
 */
export async function uploadBase64ImageToR2(base64, fileName) {
  if (!base64) return null;

  const clean = base64.includes(",") ? base64.split(",")[1] : base64;
  const buffer = Buffer.from(clean, "base64");

  const bucket = process.env.R2_BUCKET_NAME;
  const key = `selfies/${fileName}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  // Return the public URL via R2 custom domain or public bucket URL
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  return publicBase ? `${publicBase}/${key}` : key;
}
