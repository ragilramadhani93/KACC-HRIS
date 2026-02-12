/**
 * Migration script: Backfill face descriptors for existing employees.
 * Run with: node scripts/migrate-descriptors.js
 * 
 * Uses tf.node.decodeImage to bypass @napi-rs/canvas compatibility issues.
 */

// Polyfill TextEncoder/TextDecoder
if (typeof globalThis.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('text-encoding');
    globalThis.TextEncoder = TextEncoder;
    globalThis.TextDecoder = TextDecoder;
}

const tf = require('@tensorflow/tfjs');
// Use the node-gpu or node-cpu version for tf.node.decodeImage
let tfnode;
try {
    tfnode = require('@tensorflow/tfjs-node');
} catch (e) {
    // tfjs-node not installed, we'll use canvas approach instead
    tfnode = null;
}

const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const { Canvas, Image, ImageData, createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');
const sharp_available = false; // Don't require sharp

// Load env
require('dotenv').config();

// Setup Prisma with Turso adapter
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

let prisma;
if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const adapter = new PrismaLibSql({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    prisma = new PrismaClient({ adapter });
    console.log('Connected to Turso database');
} else {
    prisma = new PrismaClient();
    console.log('Connected to local database');
}

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

async function loadModels() {
    await tf.setBackend('cpu');
    await tf.ready();

    const MODEL_URL = path.join(__dirname, '..', 'public', 'models');
    console.log('Loading models from:', MODEL_URL);

    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL),
    ]);

    console.log('Models loaded!\n');
}

function bufferFromBase64(base64) {
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        return Buffer.from(matches[2], 'base64');
    }
    return Buffer.from(base64, 'base64');
}

async function processEmployee(emp) {
    if (!emp.photoUrl || emp.photoUrl.length < 100) {
        return { status: 'skip', reason: 'no valid photo' };
    }

    const buffer = bufferFromBase64(emp.photoUrl);

    if (buffer.length < 100) {
        return { status: 'skip', reason: 'photo data too small' };
    }

    // Load image and manually create ImageData to avoid @napi-rs/canvas getImageData issues
    const img = await loadImage(buffer);
    const w = img.width;
    const h = img.height;

    // Create canvas and draw image
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    // Get raw pixel data manually
    const imageData = ctx.getImageData(0, 0, w, h);

    // Create a tensor from the raw pixel data
    const inputTensor = tf.tensor3d(
        new Uint8Array(imageData.data),
        [h, w, 4] // RGBA
    ).slice([0, 0, 0], [h, w, 3]); // Strip alpha -> RGB

    // Use faceapi with the tensor
    const detection = await faceapi.detectSingleFace(inputTensor)
        .withFaceLandmarks()
        .withFaceDescriptor();

    inputTensor.dispose();

    if (!detection) {
        return { status: 'noface', reason: 'no face detected' };
    }

    const descriptor = Array.from(detection.descriptor);
    await prisma.employee.update({
        where: { id: emp.id },
        data: { faceDescriptor: JSON.stringify(descriptor) },
    });

    return { status: 'ok', dims: descriptor.length };
}

async function main() {
    await loadModels();

    const employees = await prisma.employee.findMany({
        where: {
            photoUrl: { not: "" },
            faceDescriptor: null,
        },
    });

    console.log(`Found ${employees.length} employees to process.\n`);

    if (employees.length === 0) {
        console.log('No employees need migration. All done!');
        await prisma.$disconnect();
        return;
    }

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const emp of employees) {
        process.stdout.write(`Processing: ${emp.name} (${emp.userCode})... `);
        try {
            const result = await processEmployee(emp);
            if (result.status === 'ok') {
                console.log(`OK (${result.dims} dims)`);
                success++;
            } else if (result.status === 'skip') {
                console.log(`SKIP - ${result.reason}`);
                skipped++;
            } else {
                console.log(`NO FACE - ${result.reason}`);
                failed++;
            }
        } catch (err) {
            console.log(`ERROR - ${err.message || err}`);
            failed++;
        }
    }

    console.log(`\n--- Migration Complete ---`);
    console.log(`Success: ${success}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed:  ${failed}`);
    console.log(`Total:   ${employees.length}`);

    await prisma.$disconnect();
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
