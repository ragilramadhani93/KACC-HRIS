const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY not found in .env");
        return;
    }

    console.log(`🔑 API Key found: ${apiKey.substring(0, 8)}...`);
    console.log("📡 Connecting to Gemini API (model: gemini-2.0-flash)...");

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = "Hello! Are you working? Reply with 'Yes, I am working!' if you receive this.";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("\n✅ Success! Response from Gemini:");
        console.log("---------------------------------------------------");
        console.log(text);
        console.log("---------------------------------------------------");
    } catch (error) {
        console.error("\n❌ Error testing Gemini API:");
        if (error.message.includes("404")) {
            console.error("Error 404: Model not found. Check if 'gemini-2.0-flash' is available for your API key or region.");
        } else if (error.message.includes("403")) {
            console.error("Error 403: Permission denied (API Key invalid or quota exceeded).");
        } else {
            console.error(error.message);
        }
    }
}

testGemini();
