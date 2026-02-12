import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/attendance/scan': ['./public/models/**/*'],
  },
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-libsql',
    '@libsql/client',
    '@napi-rs/canvas',
    '@vladmandic/face-api',
    '@tensorflow/tfjs',
    '@tensorflow/tfjs-core',
    '@tensorflow/tfjs-backend-cpu',
    '@tensorflow/tfjs-backend-wasm',
  ],
};

export default nextConfig;
