/**
 * Test Face API integration locally
 * Run with: node scripts/test-face-api.js
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Mock browser globals for face-api.js
if (typeof global.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}
// Polyfill for canvas
const canvas = require('@napi-rs/canvas');
const { Canvas, Image, ImageData } = canvas;

// Setup face-api
const tf = require('@tensorflow/tfjs');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');

faceapi.env.monkeyPatch({
    Canvas: Canvas,
    Image: Image,
    ImageData: ImageData,
});

async function main() {
    console.log('1. Initialization...');
    await tf.setBackend('cpu');
    await tf.ready();
    console.log(`- Backend: ${tf.getBackend()}`);

    const modelPath = path.join(process.cwd(), 'public/models');
    console.log(`- Model Path: ${modelPath}`);

    if (!fs.existsSync(modelPath)) {
        throw new Error(`Model path does not exist: ${modelPath}`);
    }

    console.log('2. Loading models...');
    const startLoad = Date.now();
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    console.log(`- Models loaded in ${Date.now() - startLoad}ms`);

    console.log('3. Creating dummy image...');
    // Create a 500x500 black canvas (no face) just to test detection pipeline
    const c = canvas.createCanvas(500, 500);
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 500, 500);

    // We expect no face, but we want to ensure no crash
    console.log('4. Detecting face...');
    const startDetect = Date.now();
    const result = await faceapi.detectSingleFace(c)
        .withFaceLandmarks()
        .withFaceDescriptor();

    console.log(`- Detection took ${Date.now() - startDetect}ms`);

    if (result) {
        console.log('✓ Face detected (unexpected for black image, but pipeline works)');
    } else {
        console.log('✓ No face detected (expected), but pipeline ran successfully');
    }
}

main().catch(e => {
    console.error('ERROR:', e);
});
