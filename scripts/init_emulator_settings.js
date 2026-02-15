
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    projectId: "content-alchemy-command-dev",
    apiKey: "dummy"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

connectFirestoreEmulator(db, '127.0.0.1', 8080);

async function initSettings() {
    console.log("🛠️ Checking settings/global...");
    const ref = doc(db, 'settings', 'global');

    try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
            console.log("✅ settings/global already exists:", snap.data());
        } else {
            console.log("⚠️ Missing settings/global. Creating it...");
            await setDoc(ref, {
                direct_entry_post_counter: 1000,
                system_initialized: true
            });
            console.log("🎉 Created settings/global!");
        }
    } catch (e) {
        console.error("❌ Error:", e);
    }

    process.exit(0);
}

initSettings();
