const { TextEncoder, TextDecoder } = require('text-encoding');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const tf = require('@tensorflow/tfjs');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const { Canvas, Image, ImageData, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

faceapi.env.monkeyPatch({
    Canvas: Canvas,
    Image: Image,
    ImageData: ImageData,
});

async function testFaceAPI() {
    try {
        await tf.setBackend('cpu');
        await tf.ready();
        console.log(`Using TensorFlow backend: ${tf.getBackend()}`);

        const MODEL_URL = path.join(__dirname, '../public/models');
        console.log(`Loading models from ${MODEL_URL}...`);

        try {
            const files = fs.readdirSync(MODEL_URL);
            console.log('Files in model directory:', files);
        } catch (e) {
            console.error('Error listing model directory:', e);
        }

        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL),
        ]);
        console.log('✅ Models loaded.');

        const canvas = new Canvas(200, 200);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 200, 200);

        console.log('Running detection on blank canvas (expect no face)...');
        const detection = await faceapi.detectSingleFace(canvas)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            console.log('✅ Pipeline works (No face detected as expected on blank canvas).');
        } else {
            console.log('❓ Ghost detected?!');
        }

        console.log('Test Complete.');

    } catch (error) {
        console.error('❌ Error during face-api test:', error);
    }
}

testFaceAPI();
