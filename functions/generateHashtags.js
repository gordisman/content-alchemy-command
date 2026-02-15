const { onCall, HttpsError } = require("firebase-functions/v2/https");
const functions = require("firebase-functions"); // For config()
const { OpenAI } = require("openai");

exports.generateHashtags = onCall(async (request) => {
    // 1. Setup & Auth
    const data = request.data;
    const auth = request.auth;

    console.log("🚀 GENERATE HASHTAGS FUNCTION HIT!");
    console.log("Data:", data);

    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be logged in to generate hashtags."
        );
    }

    // 2. Initialize OpenAI
    // Note: functions.config() is legacy but compatible. 
    // Ideally migrate to params/secrets later.
    const apiKey = functions.config().openai?.key;
    if (!apiKey) {
        throw new HttpsError(
            "failed-precondition",
            "OpenAI API Key is missing in configuration."
        );
    }

    const openai = new OpenAI({ apiKey });

    // 3. Extract Inputs
    const { title, content, pillarName, platform } = data;

    if (!title && !content) {
        throw new HttpsError(
            "invalid-argument",
            "Post must have a Title or Content to generate tags."
        );
    }

    // 4. Construct Prompt
    let platformRules = "";
    if (platform === "instagram") {
        platformRules = "Generate exactly 30 hashtags. Mix popular (1M+ posts), niche, and specific tags.";
    } else if (platform === "linkedin") {
        platformRules = "Generate exactly 3-5 highly relevant, professional hashtags. No spammy tags.";
    } else if (platform === "twitter" || platform === "x") {
        platformRules = "Generate 2-3 short, impactful hashtags suitable for limited character count.";
    } else if (platform === "facebook") {
        platformRules = "Generate 3-5 broad, community-focused hashtags.";
    } else {
        platformRules = "Generate 5-10 relevant hashtags.";
    }

    const prompt = `
        You are a social media expert. Generate hashtags for a post with the following details:
        
        Platform: ${platform || "General"}
        Content Pillar: ${pillarName || "General"}
        Title: "${title || ""}"
        Content: "${content || ""}"

        Rules:
        ${platformRules}
        
        Output only the hashtags, separated by spaces. Do not include numbering or introductory text.
    `;

    try {
        // 5. Call OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful social media assistant." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
        });

        const hashtags = completion.choices[0].message.content.trim();

        return { hashtags };

    } catch (error) {
        console.error("OpenAI Error:", error);
        throw new HttpsError(
            "internal",
            "Failed to generate hashtags from OpenAI.",
            error.message
        );
    }
});
