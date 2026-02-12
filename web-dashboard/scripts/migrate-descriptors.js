/**
 * Migration script: Backfill face descriptors for existing employees.
 * 
 * Run with: node scripts/migrate-descriptors.js
 * 
 * This script:
 * 1. Finds all employees with a photoUrl but no faceDescriptor
 * 2. Computes the face descriptor from the stored photo
 * 3. Saves it to the database
 */

// Polyfill TextEncoder/TextDecoder
if (typeof globalThis.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('text-encoding');
    globalThis.TextEncoder = TextEncoder;
    globalThis.TextDecoder = TextDecoder;
}

const tf = require('@tensorflow/tfjs');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const { Canvas, Image, ImageData, loadImage } = require('@napi-rs/canvas');
const path = require('path');

// Load env + prisma
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    console.log('Models loaded!');
}

function bufferFromBase64(base64) {
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        return Buffer.from(matches[2], 'base64');
    }
    return Buffer.from(base64, 'base64');
}

async function main() {
    await loadModels();

    // Find employees with photos but no descriptor
    const employees = await prisma.employee.findMany({
        where: {
            photoUrl: { not: "" },
            faceDescriptor: null,
        },
    });

    console.log(`Found ${employees.length} employees to process.\n`);

    let success = 0;
    let failed = 0;

    for (const emp of employees) {
        try {
            console.log(`Processing: ${emp.name} (${emp.userCode})...`);

            const buffer = bufferFromBase64(emp.photoUrl);
            const img = await loadImage(buffer);

            const detection = await faceapi.detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                const descriptor = Array.from(detection.descriptor);
                await prisma.employee.update({
                    where: { id: emp.id },
                    data: { faceDescriptor: JSON.stringify(descriptor) },
                });
                console.log(`  ✓ Descriptor saved (${descriptor.length} dimensions)`);
                success++;
            } else {
                console.log(`  ✗ No face detected`);
                failed++;
            }
        } catch (err) {
            console.error(`  ✗ Error: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n--- Migration Complete ---`);
    console.log(`Success: ${success}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${employees.length}`);

    await prisma.$disconnect();
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
