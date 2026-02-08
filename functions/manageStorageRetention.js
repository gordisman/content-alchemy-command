const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

exports.manageStorageRetention = onSchedule({
    schedule: "every day 03:00", // Run at 3 AM
    timeZone: "America/Toronto",
    memory: "512MiB"
}, async (event) => {
    console.log("Job started: Storage Retention Check");

    try {
        // 1. Get Settings
        const settingsSnap = await db.doc('settings/global').get();
        if (!settingsSnap.exists) {
            console.log('Settings not found');
            return;
        }
        const settings = settingsSnap.data();
        const controls = settings.storage_controls || {};

        if (!controls.retention_active) {
            console.log('Storage retention is disabled in settings.');
            return;
        }

        const retentionDays = controls.retention_days || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const cutoffString = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

        console.log(`Running retention for videos older than ${retentionDays} days (Older than: ${cutoffString})`);

        // 2. Query Candidates
        // Querying for video type + firebase source + not purged
        // We fetch ALL candidates and filter by date in memory to avoid complex index requirements for now
        const postsRef = db.collection('posts');
        const snapshot = await postsRef
            .where('media.type', '==', 'video')
            .where('media.source', '==', 'firebase')
            .where('media.is_purged', '!=', true)
            .get();

        if (snapshot.empty) {
            console.log('No active video posts found to check.');
            return;
        }

        console.log(`Found ${snapshot.size} video candidates. Checking dates...`);

        const updates = [];
        let purgedCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            let shouldPurge = false;

            // Date Check Logic
            // Priority 1: Publish Date (YYYY-MM-DD string)
            if (data.publish_date && typeof data.publish_date === 'string') {
                if (data.publish_date < cutoffString) shouldPurge = true;
            }
            // Priority 2: Created At (Timestamp)
            else if (data.createdAt) {
                const createdDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                if (createdDate < cutoffDate) shouldPurge = true;
            }

            if (shouldPurge && data.media && data.media.url) {
                const fileUrl = data.media.url;

                try {
                    // Extract path from URL (assuming standard Firebase Storage URL)
                    // URL Format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?alt=media...
                    const decodedUrl = decodeURIComponent(fileUrl);
                    // Extract match after /o/ and before ?
                    const pathMatch = decodedUrl.match(/\/o\/(.*?)\?/);

                    if (pathMatch && pathMatch[1]) {
                        const filePath = pathMatch[1];
                        console.log(`Purging file: ${filePath} for post ${doc.id}`);

                        // Delete from Storage
                        const bucket = storage.bucket();
                        const file = bucket.file(filePath);

                        // Check availability then delete
                        const [exists] = await file.exists();
                        if (exists) {
                            await file.delete();
                        } else {
                            console.log(`File ${filePath} returned 404, marking purged anyway.`);
                        }

                        // Update Post
                        updates.push(doc.ref.update({
                            'media.is_purged': true,
                            'media.purged_at': admin.firestore.FieldValue.serverTimestamp(),
                            'media.original_url': fileUrl,
                            'media.url': '', // Clear active URL
                            'media.alt_text': data.media.alt_text || 'Video Purged for Storage' // Keep descriptive
                        }));
                        purgedCount++;
                    } else {
                        console.log(`Could not parse path from URL: ${fileUrl}`);
                    }
                } catch (err) {
                    console.error(`Failed to purge ${doc.id}:`, err);
                }
            }
        }

        if (updates.length > 0) {
            await Promise.all(updates);
        }

        console.log(`Purge complete. Removed ${purgedCount} videos.`);

    } catch (error) {
        console.error('Retention script error:', error);
    }
});
