import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const mode = process.argv[2]; // 'dev', 'prod', 'laurie', etc.

const ENV_local_dest = path.join(rootDir, '.env.local');

if (mode === 'status') {
    console.log(`\n🔍 Checking Environment Status...`);
    if (!fs.existsSync(ENV_local_dest)) {
        console.log(`📍 CURRENT WORLD: [ DEV / SANDBOX ]`);
        console.log(`(No .env.local found - using default local emulators)`);
    } else {
        const content = fs.readFileSync(ENV_local_dest, 'utf8');
        if (content.includes('cac-prod-laurie')) {
            console.log(`📍 CURRENT WORLD: [ LAURIE (Production) ]`);
        } else if (content.includes('cac-prod-gord')) {
            console.log(`📍 CURRENT WORLD: [ GORD (Production) ]`);
        } else {
            console.log(`📍 CURRENT WORLD: [ CUSTOM (.env.local exists) ]`);
        }
    }
    console.log("");
    process.exit(0);
}

console.log(`\n🔄 Switching Environment to: [ ${mode?.toUpperCase() || 'UNKNOWN'} ]`);

if (mode === 'dev') {
    // DEV MODE: Remove .env.local to fall back to .env
    if (fs.existsSync(ENV_local_dest)) {
        fs.unlinkSync(ENV_local_dest);
        console.log("✅ Removed .env.local (Now using defaulting to .env for DEV)");
    } else {
        console.log("ℹ️  Already in DEV mode (no .env.local found)");
    }
} else {
    // CUSTOM MODE: Look for .env.[mode]
    const envSource = path.join(rootDir, `.env.${mode}`);

    if (!fs.existsSync(envSource)) {
        console.error(`❌ Error: .env.${mode} file not found!`);
        console.error(`   (Please ensure you have created i:/Antigravity Apps/Content-Alchemy-Command-Dev/.env.${mode} first)`);
        process.exit(1);
    }

    fs.copyFileSync(envSource, ENV_local_dest);
    console.log(`✅ Copied .env.${mode} -> .env.local`);
    console.log(`🚀 Environment is now ${mode.toUpperCase()}`);
}

console.log("\n💡 WORKFLOW TIP:");
console.log("- If DEPLOYING: Just run 'npm run build' now (No restart needed).");
console.log("- If DEVELOPING LOCALLY: Restart your 'npm run dev' command to see the change.\n");

