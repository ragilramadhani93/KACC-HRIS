import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TextDecoder, TextEncoder } from "util";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-cpu";
import * as faceapi from "@vladmandic/face-api/dist/face-api.node-wasm.js";
import { Canvas, Image, ImageData, loadImage } from "@napi-rs/canvas";

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}

if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder;
}

faceapi.env.monkeyPatch({
  Canvas,
  Image,
  ImageData,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_URL_REGEX = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

let modelsLoaded = false;
let modelsDirCache = null;

function looksLikeRawBase64(value) {
  return value.length >= 128 && value.length % 4 === 0 && /^[A-Za-z0-9+/=\r\n]+$/.test(value);
}

function resolveModelsDir() {
  if (modelsDirCache) {
    return modelsDirCache;
  }

  const candidates = [
    process.env.FACE_MODELS_DIR,
    path.resolve(process.cwd(), "public/models"),
    path.resolve(process.cwd(), "../web-dashboard/public/models"),
    path.resolve(__dirname, "../../../web-dashboard/public/models"),
  ].filter(Boolean);

  const found = candidates.find((candidate) => fs.existsSync(candidate));

  if (!found) {
    throw new Error("Face recognition models not found. Set FACE_MODELS_DIR or provide public/models.");
  }

  modelsDirCache = found;
  return found;
}

export async function loadFaceModels() {
  if (modelsLoaded) {
    return;
  }

  await tf.setBackend("cpu");
  await tf.ready();

  const modelsDir = resolveModelsDir();

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsDir),
    faceapi.nets.faceLandmark68Net.loadFromDisk(modelsDir),
    faceapi.nets.faceRecognitionNet.loadFromDisk(modelsDir),
  ]);

  modelsLoaded = true;
}

async function imageBufferFromSource(source) {
  if (typeof source !== "string" || !source.trim()) {
    throw new Error("Image source is required");
  }

  const trimmed = source.trim();
  const dataUrlMatch = trimmed.match(DATA_URL_REGEX);
  if (dataUrlMatch) {
    return Buffer.from(dataUrlMatch[2], "base64");
  }

  if (looksLikeRawBase64(trimmed)) {
    return Buffer.from(trimmed, "base64");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const response = await fetch(trimmed);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (fs.existsSync(trimmed)) {
    return fs.promises.readFile(trimmed);
  }

  throw new Error("Unsupported image source. Expected base64, URL, or local file path.");
}

export async function computeDescriptorFromImage(source) {
  await loadFaceModels();

  const buffer = await imageBufferFromSource(source);
  const originalImage = await loadImage(buffer);
  const maxWidth = 640;

  let processedImage = originalImage;

  if (originalImage.width > maxWidth) {
    const scale = maxWidth / originalImage.width;
    const resizedWidth = Math.round(maxWidth);
    const resizedHeight = Math.round(originalImage.height * scale);
    const canvas = new Canvas(resizedWidth, resizedHeight);
    const context = canvas.getContext("2d");
    context.drawImage(originalImage, 0, 0, resizedWidth, resizedHeight);
    processedImage = canvas;
  }

  const detection = await faceapi.detectSingleFace(processedImage).withFaceLandmarks().withFaceDescriptor();

  if (!detection) {
    return null;
  }

  return Array.from(detection.descriptor);
}

export function serializeDescriptor(descriptor) {
  return JSON.stringify(descriptor);
}

export function parseDescriptor(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function euclideanDistance(a, b) {
  return faceapi.euclideanDistance(new Float32Array(a), new Float32Array(b));
}