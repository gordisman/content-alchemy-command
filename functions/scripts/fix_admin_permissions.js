
const admin = require('firebase-admin');

// 1. Point to Emulator
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// 2. Initialize App (No creds needed for emulator usually)
// If it complains, we can add projectId.
admin.initializeApp({
    projectId: 'content-alchemy-command-dev'
});

const db = admin.firestore();

async function fixPermissions() {
    console.log("🔍 Scanning for users to promote to Admin...");

    try {
        const usersSnap = await db.collection('users').get();

        if (usersSnap.empty) {
            console.log("⚠️ No users found in 'users' collection.");
            console.log("👉 Please perform a sign-in on the frontend first!");
            return;
        }

        const batch = db.batch();
        let count = 0;

        usersSnap.forEach(doc => {
            const userData = doc.data();
            if (userData.role !== 'admin') {
                console.log(`⚡ Promoting user ${doc.id} (${userData.email || 'No Email'}) to Admin`);
                batch.update(doc.ref, { role: 'admin' });
                count++;
            } else {
                console.log(`✅ User ${doc.id} is already Admin.`);
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`🎉 Successfully promoted ${count} user(s).`);
        } else {
            console.log("👍 All users are already admins.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

fixPermissions();
