
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// Initialize Admin SDK
// In the emulator, we don't need a service account if the environment variables are set.
// We'll set them explicitly here to be sure.
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

try {
    admin.initializeApp({
        projectId: 'content-alchemy-command-dev'
    });
} catch (e) {
    if (!admin.apps.length) {
        console.error("Failed to initialize admin:", e);
        process.exit(1);
    }
}

const db = admin.firestore();

async function fixPermissions() {
    console.log("🔍 Scanning for users to promote to Admin...");

    // 1. Get all users from Firestore 'users' collection
    try {
        const usersSnap = await db.collection('users').get();

        if (usersSnap.empty) {
            console.log("⚠️ No users found in 'users' collection.");
            console.log("👉 Please go to http://localhost:5173, sign in/up, and THEN run this script.");
            return;
        }

        const batch = db.batch();
        let count = 0;

        usersSnap.forEach(doc => {
            const userData = doc.data();
            // Promote everyone to admin in dev environment for simplicity
            if (userData.role !== 'admin') {
                console.log(`⚡ Promoting user ${doc.id} (${userData.email || 'No Email'}) to Admin`);
                batch.update(doc.ref, { role: 'admin' });
                count++;
            } else {
                console.log(`✅ User ${doc.id} (${userData.email}) is already Admin.`);
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`🎉 Successfully promoted ${count} user(s) to Admin.`);
            console.log("✅ You should now be able to Save Posts!");
        } else {
            console.log("👍 All users are already admins.");
        }
    } catch (error) {
        console.error("Error promoting users:", error);
    }
}

fixPermissions();
