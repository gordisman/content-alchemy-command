const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// --- SHARED LOGIC ---
async function runAlertLogic(source = "scheduled") {
    console.log(`Job started: Action Alert (${source})`);

    // --- 1. CONFIGURATION ---
    const settingsSnap = await db.doc('settings/global').get();
    const settings = settingsSnap.data() || {};

    const timezone = settings.alert_timezone || "America/Toronto";
    const now = new Date();
    const todayCommon = now.toLocaleDateString("en-CA", { timeZone: timezone }); // "YYYY-MM-DD"

    // --- DYNAMIC TIME CHECK (Only for scheduled runs) ---
    if (source === "scheduled") {
        const configuredTime = settings.alert_time || "09:00"; // e.g. "07:45"
        const lastSent = settings.last_alert_sent_at;

        // A. Prevent double-sending
        if (lastSent === todayCommon) {
            console.log(`Alert already sent today (${todayCommon}). Skipping.`);
            return { success: true, message: "Already sent today." };
        }

        // B. Check if it's time yet
        // Since the scheduler runs at :05 past the hour (e.g., 08:05),
        // any target time of :00 will now correctly pass this check.
        const nowTimeStr = now.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone });

        if (nowTimeStr < configuredTime) {
            console.log(`Current time ${nowTimeStr} is earlier than configured ${configuredTime}. Skipping.`);
            return { success: true, message: "Too early." };
        }
    }

    // Settings: Recipients
    let recipients = [];
    if (settings.alert_recipients) {
        recipients = settings.alert_recipients.split(',').map(e => e.trim()).filter(e => e);
    }
    // ... [rest of the function remains the same]

    // Fallback: If no recipients, try Admin
    if (recipients.length === 0) {
        console.log("No recipients configured. Checking for admins...");
        const adminSnap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
        if (!adminSnap.empty) {
            recipients.push(adminSnap.docs[0].data().email);
        } else {
            console.log("No admins found either. Aborting.");
            return { success: false, message: "No recipients found." };
        }
    }

    // --- 2. FETCH SCHEDULED POSTS ---

    const postsSnap = await db.collection('posts')
        .where('status', '==', 'scheduled')
        .get();

    const allScheduled = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const todayScheduledPosts = allScheduled.filter(post => {
        if (!post.publish_date) return false;
        let pDateObj;
        try {
            pDateObj = post.publish_date.toDate ? post.publish_date.toDate() : new Date(post.publish_date);
        } catch (e) { return false; }
        const pDateString = pDateObj.toLocaleDateString("en-CA", { timeZone: timezone });
        return pDateString === todayCommon;
    });

    console.log(`Found ${todayScheduledPosts.length} posts for today (${todayCommon}).`);

    if (todayScheduledPosts.length === 0 && source !== 'manual') {
        console.log("No posts for today. Skipping email.");
        return { success: true, message: "No posts for today.", count: 0 };
    }

    // Sort by time
    todayScheduledPosts.sort((a, b) => {
        const dateA = a.publish_date.toDate ? a.publish_date.toDate() : new Date(a.publish_date);
        const dateB = b.publish_date.toDate ? b.publish_date.toDate() : new Date(b.publish_date);
        return dateA - dateB;
    });

    // --- 3. FETCH IDEAS ---
    const ideasSnap = await db.collection('ideas').get();
    const allIdeas = ideasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // --- 4. GENERATE HTML ---
    const platformLabels = {
        instagram: 'Instagram',
        youtube: 'YouTube',
        fb_page: 'Facebook Profile',
        fb_group: 'Facebook Group',
        linkedin: 'LinkedIn',
        x: 'X (Twitter)',
        tiktok: 'TikTok',
        email: 'Email',
        substack: 'Substack',
        community: 'Community'
    };

    let emailBody = `
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #8B5CF6;">Daily Action Alert (${source === 'manual' ? 'TEST' : 'Automatic'})</h2>
        ${todayScheduledPosts.length > 0
            ? `<p>You have <strong>${todayScheduledPosts.length}</strong> scheduled post${todayScheduledPosts.length > 1 ? 's' : ''} for today (${todayCommon}):</p>`
            : `<p>No posts scheduled for today (${todayCommon}). (Test Run)</p>`
        }
    `;

    todayScheduledPosts.forEach(post => {
        let timeStr = "N/A";
        const pDateObj = post.publish_date.toDate ? post.publish_date.toDate() : new Date(post.publish_date);
        timeStr = pDateObj.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone });

        const platform = platformLabels[post.platform] || post.platform;

        const parentIdea = allIdeas.find(i => i.id === post.idea_id);

        let postIdDisplay = 'N/A';
        // Direct Entry Logic
        if (post.is_direct_entry || (!post.idea_id && post.direct_entry_sequence)) {
            if (post.direct_entry_sequence !== null && post.direct_entry_sequence !== undefined) {
                postIdDisplay = `#POST-D${String(post.direct_entry_sequence).padStart(3, '0')}`;
            } else {
                postIdDisplay = `#POST-D-PENDING`;
            }
        }
        // Idea-Linked Logic
        else if (parentIdea) {
            // Note: DB field might be 'sequence' or 'post_sequence' depending on legacy. 
            // Client formatter checks 'post.sequence'. We check both to be safe.
            const seq = post.sequence !== undefined ? post.sequence : post.post_sequence;

            if (seq !== null && seq !== undefined) {
                postIdDisplay = `#POST-${parentIdea.idea_number}-${seq}`;
            } else {
                postIdDisplay = `#POST-${parentIdea.idea_number}-PENDING`;
            }
        } else {
            // Fallback if idea missing but linked
            postIdDisplay = `#POST-?-?`;
        }

        emailBody += `
        <div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 8px; background-color: #f9f9f9;">
            <p style="margin: 5px 0;"><strong>🔢 ID:</strong> <code style="background: #e0e0e0; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${postIdDisplay}</code> <a href="${settings.app_url || ''}/studio?focus=${post.id}" target="_blank" style="font-size: 11px; color: #8B5CF6; text-decoration: none; margin-left: 10px; font-weight: bold;">VIEW IN STUDIO &rarr;</a></p>
            <p style="margin: 5px 0;"><strong>📅 Schedule:</strong> ${timeStr}</p>
            <p style="margin: 5px 0;"><strong>📱 Platform:</strong> ${platform}</p>
            <p style="margin: 5px 0;"><strong>📝 Title:</strong> ${post.post_title || 'Untitled Post'}</p>
            ${post.action_notes ? `
            <div style="margin-top: 10px; padding: 10px; background-color: #fff; border-left: 4px solid #8B5CF6;">
                <p style="margin: 0;"><strong>⚡ Action Required:</strong></p>
                <p style="margin: 5px 0 0 0; white-space: pre-wrap;">${post.action_notes}</p>
            </div>` : ''}
        </div>
        `;
    });

    emailBody += `
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">Sent by Content Alchemy Command (Firebase Cloud Functions)</p>
        </body>
        </html>
    `;

    // --- 5. SEND EMAIL ---
    const gmailEmail = process.env.GMAIL_EMAIL;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailEmail || !gmailPassword) {
        console.error("Missing Gmail Credentials.");
        return { success: false, message: "Server Config Error: Missing Credentials" };
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailEmail, pass: gmailPassword },
    });

    const mailOptions = {
        from: `"Content Alchemy Bot" <${gmailEmail}>`,
        to: recipients.join(','),
        subject: `🚨 Daily Action Alert: ${todayScheduledPosts.length} Posts for Today`,
        html: emailBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);

    // Update Last Sent only for automatic
    if (source === 'scheduled') {
        await db.doc('settings/global').update({ last_alert_sent_at: todayCommon });
    }

    return { success: true, count: todayScheduledPosts.length, message: "Email Sent" };
}

/**
 * DAILY ACTION ALERT - SCHEDULED
 */
exports.dailyActionAlert = onSchedule({
    schedule: "5 * * * *",
    timeZone: "America/Toronto",
    secrets: ["GMAIL_APP_PASSWORD"]
}, async (event) => {
    await runAlertLogic("scheduled");
});

/**
 * SEND TEST ALERT - CALLABLE (Manual Trigger)
 */
exports.sendTestAlert = onCall({
    secrets: ["GMAIL_APP_PASSWORD"]
}, async (request) => {
    // Auth Check? We can assume internal for now or check request.auth
    return await runAlertLogic("manual");
});

exports.manageStorageRetention = require("./manageStorageRetention").manageStorageRetention;

