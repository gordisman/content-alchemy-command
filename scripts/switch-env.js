import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const mode = process.argv[2]; // 'dev' or 'prod'

const ENV_prod_src = path.join(rootDir, '.env.prod');
const ENV_local_dest = path.join(rootDir, '.env.local');

console.log(`\n🔄 Switching Environment to: [ ${mode?.toUpperCase() || 'UNKNOWN'} ]`);

if (mode === 'dev') {
    // DEV MODE: We want to REMOVE .env.local so it falls back to .env
    // BUT first, let's verify if we need to backup the current one? 
    // For simplicity, we assume .env.prod is the source of truth for Prod.

    if (fs.existsSync(ENV_local_dest)) {
        fs.unlinkSync(ENV_local_dest);
        console.log("✅ Removed .env.local (Now using defaulting to .env for DEV)");
    } else {
        console.log("ℹ️  Already in DEV mode (no .env.local found)");
    }

} else if (mode === 'prod') {
    // PROD MODE: We want to COPY .env.prod -> .env.local
    if (!fs.existsSync(ENV_prod_src)) {
        console.error("❌ Error: .env.prod file not found! data: Cannot enable Prod mode.");
        console.error("   (Please ensure you have saved your Prod keys to .env.prod first)");
        process.exit(1);
    }

    fs.copyFileSync(ENV_prod_src, ENV_local_dest);
    console.log("✅ Copied .env.prod -> .env.local");
    console.log("🚀 Environment is now PROD (Content-Alchemy-Command-Prod)");

} else {
    console.error("❌ Usage: node switch-env.js [dev|prod]");
}
console.log("\n(You may need to restart your terminal/server for changes to take effect)\n");
