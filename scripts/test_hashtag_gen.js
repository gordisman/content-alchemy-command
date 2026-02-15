
import { initializeApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";

// 1. Config (Matches your .env)
const firebaseConfig = {
    projectId: "content-alchemy-command-dev",
    apiKey: "dummy-key-for-emulator"
};

// 2. Init App
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const auth = getAuth(app);

// 3. Connect to Emulator
console.log("🔌 Connecting to Emulator...");
connectFunctionsEmulator(functions, "127.0.0.1", 5001);
connectAuthEmulator(auth, "http://127.0.0.1:9099");

async function testHashtagGen() {
    try {
        // 4. Auth (Required)
        console.log("🔑 Authenticating...");
        await signInAnonymously(auth);
        console.log("✅ Authenticated as:", auth.currentUser.uid);

        // 5. Call Function
        console.log("🚀 Calling generateHashtags...");
        const generateHashtags = httpsCallable(functions, 'generateHashtags');

        const result = await generateHashtags({
            title: "Test Post regarding AI Coding",
            content: "We are building an amazing AI coding assistant that helps developers work faster.",
            platform: "twitter"
        });

        console.log("🎉 SUCCESS! Result:");
        console.log(result.data);

    } catch (error) {
        console.error("❌ FAILED:");
        console.error(error);
    }

    // Keep process alive briefly to flush logs
    setTimeout(() => process.exit(0), 1000);
}

testHashtagGen();
