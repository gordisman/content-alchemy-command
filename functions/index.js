const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { OpenAI } = require("openai");

// V2 Imports
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

/**
 * SHARED LOGIC - DAILY ACTION ALERT
 */
async function runAlertLogic(source = "scheduled") {
    console.log(`Job started: Action Alert (${source})`);
    const settingsSnap = await db.doc('settings/global').get();
    const settings = settingsSnap.data() || {};
    const timezone = settings.alert_timezone || "America/Toronto";
    const now = new Date();
    const todayCommon = now.toLocaleDateString("en-CA", { timeZone: timezone });

    if (source === "scheduled") {
        const configuredTime = settings.alert_time || "09:00";
        if (settings.last_alert_sent_at === todayCommon) return { success: true };
        const nowTimeStr = now.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone });
        if (nowTimeStr < configuredTime) return { success: true };
    }

    let recipients = (settings.alert_recipients || "").split(',').map(e => e.trim()).filter(e => e);
    const postsSnap = await db.collection('posts').where('status', '==', 'scheduled').get();
    const todayScheduledPosts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(post => {
        if (!post.publish_date) return false;
        const pDateObj = post.publish_date.toDate ? post.publish_date.toDate() : new Date(post.publish_date);
        return pDateObj.toLocaleDateString("en-CA", { timeZone: timezone }) === todayCommon;
    });

    if (todayScheduledPosts.length === 0 && source !== 'manual') return { success: true };

    const gmailEmail = process.env.GMAIL_EMAIL;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    if (!gmailEmail || !gmailPassword) return { success: false };

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailEmail, pass: gmailPassword },
    });

    await transporter.sendMail({
        from: `"Content Alchemy Bot" <${gmailEmail}>`,
        to: recipients.join(','),
        subject: `🚨 Daily Action Alert: ${todayScheduledPosts.length} Posts`,
        html: `<h2>Daily Action Alert</h2><p>You have ${todayScheduledPosts.length} posts scheduled for today.</p>`,
    });

    if (source === 'scheduled') await db.doc('settings/global').update({ last_alert_sent_at: todayCommon });
    return { success: true };
}

/**
 * EXPORTS
 */

// 1. Daily Action Alert (V2 Scheduler)
exports.dailyActionAlert = onSchedule({
    schedule: "5 * * * *",
    timeZone: "America/Toronto",
    secrets: ["GMAIL_APP_PASSWORD"]
}, async (event) => {
    await runAlertLogic("scheduled");
});

// 2. Generate Hashtags (V1 Callable)
exports.generateHashtags = functions.region("us-central1").https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Log in required.");
    const apiKey = functions.config().openai?.key;
    if (!apiKey) throw new functions.https.HttpsError("failed-precondition", "API Key missing.");

    const openai = new OpenAI({ apiKey });
    const { title, content, platform } = data;
    const prompt = `Generate hashtags for ${platform}. Title: ${title}. Content: ${content}. Output tags only.`;

    try {
        const res = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return { hashtags: res.choices[0].message.content.trim() };
    } catch (err) {
        throw new functions.https.HttpsError("internal", err.message);
    }
});

// 3. Manage Storage Retention (V2 Scheduler)
exports.manageStorageRetention = onSchedule({
    schedule: "every day 03:00",
    timeZone: "America/Toronto",
    memory: "512MiB"
}, async (event) => {
    console.log("Storage Retention Job Started");
    const settingsSnap = await db.doc('settings/global').get();
    const settings = settingsSnap.data();
    const controls = settings?.storage_controls || {};
    if (!controls.retention_active) return;

    const retentionDays = controls.retention_days || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffString = cutoffDate.toISOString().split('T')[0];

    const snapshot = await db.collection('posts')
        .where('media.type', '==', 'video')
        .where('media.source', '==', 'firebase')
        .where('media.is_purged', '!=', true)
        .get();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let shouldPurge = false;
        if (data.publish_date && data.publish_date < cutoffString) shouldPurge = true;

        if (shouldPurge && data.media?.url) {
            try {
                const decodedUrl = decodeURIComponent(data.media.url);
                const pathMatch = decodedUrl.match(/\/o\/(.*?)\?/);
                if (pathMatch && pathMatch[1]) {
                    const filePath = pathMatch[1];
                    const file = storage.bucket().file(filePath);
                    const [exists] = await file.exists();
                    if (exists) await file.delete();
                    await doc.ref.update({ 'media.is_purged': true, 'media.url': '' });
                }
            } catch (err) { console.error(`Purge failed for ${doc.id}`, err); }
        }
    }
});
