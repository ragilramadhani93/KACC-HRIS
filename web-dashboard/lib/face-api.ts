// Polyfill TextEncoder/TextDecoder for face-api.js WASM bundle in Node.js
if (typeof globalThis.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('text-encoding');
    (globalThis as any).TextEncoder = TextEncoder;
    (globalThis as any).TextDecoder = TextDecoder;
}

import * as tf from '@tensorflow/tfjs';
import * as faceapi from '@vladmandic/face-api/dist/face-api.node-wasm.js';
import { Canvas, Image, ImageData, loadImage } from '@napi-rs/canvas';
import path from 'path';

// Monkey Patch for Node.js environment
faceapi.env.monkeyPatch({
    Canvas: Canvas as any,
    Image: Image as any,
    ImageData: ImageData as any,
});

// Cached model loading state
let modelsLoaded = false;

/**
 * Load face-api.js models from disk. Cached after first call.
 */
export async function loadModels() {
    if (modelsLoaded) return;

    await tf.setBackend('cpu');
    await tf.ready();
    console.log(`TensorFlow backend: ${tf.getBackend()}`);

    const MODEL_URL = path.join(process.cwd(), 'public/models');
    console.log("Loading FaceAPI models from:", MODEL_URL);

    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log("FaceAPI models loaded successfully");
}

/**
 * Convert a base64 image string to a Buffer.
 */
export function bufferFromBase64(base64: string): Buffer {
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        return Buffer.from(matches[2], 'base64');
    }
    return Buffer.from(base64, 'base64');
}

/**
 * Compute a 128-dimensional face descriptor from a base64 image.
 * Returns null if no face is detected.
 */
export async function computeDescriptor(base64: string): Promise<number[] | null> {
    const startLoad = Date.now();
    await loadModels();
    console.log(`Model check/load took ${Date.now() - startLoad}ms`);

    const buffer = bufferFromBase64(base64);

    // Resize image if too large (to speed up detection)
    const originalImage = await loadImage(buffer);
    const MAX_WIDTH = 640;

    let processImage: any = originalImage;

    if (originalImage.width > MAX_WIDTH) {
        const scale = MAX_WIDTH / originalImage.width;
        const newWidth = MAX_WIDTH;
        const newHeight = originalImage.height * scale;

        const c = new Canvas(newWidth, newHeight);
        const ctx = c.getContext('2d');
        ctx.drawImage(originalImage, 0, 0, newWidth, newHeight);
        processImage = c;
        console.log(`Image resized from ${originalImage.width}x${originalImage.height} to ${newWidth}x${newHeight}`);
    }

    const startDetect = Date.now();
    const detection = await faceapi.detectSingleFace(processImage as any)
        .withFaceLandmarks()
        .withFaceDescriptor();
    console.log(`Face detection took ${Date.now() - startDetect}ms`);

    if (!detection) return null;

    // Convert Float32Array to plain number array for JSON serialization
    return Array.from(detection.descriptor);
}

/**
 * Compute euclidean distance between two face descriptors.
 */
export function euclideanDistance(a: number[], b: number[]): number {
    return faceapi.euclideanDistance(
        new Float32Array(a),
        new Float32Array(b)
    );
}

// Re-export for direct usage
export { faceapi, loadImage };
