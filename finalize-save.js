import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = __dirname;
const targetPath = path.join(projectRoot, '.firebase', 'emulators');

// 1. Find the latest firebase-export-* directory
const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
const exportDirs = entries
    .filter(e => e.isDirectory() && e.name.startsWith('firebase-export-'))
    .map(e => ({
        name: e.name,
        time: fs.statSync(path.join(projectRoot, e.name)).mtimeMs
    }))
    .sort((a, b) => b.time - a.time);

if (exportDirs.length === 0) {
    if (fs.existsSync(targetPath)) {
        console.log('ℹ️ No new export folders found. Using existing .firebase/emulators.');
        process.exit(0);
    }
    console.error('❌ No recent export folders found and no existing emulators folder!');
    process.exit(1);
}

const latestDir = exportDirs[0].name;
const sourcePath = path.join(projectRoot, latestDir);

console.log(`🔍 Found latest export: ${latestDir}`);

try {
    // 2. Prepare target
    if (!fs.existsSync(path.join(projectRoot, '.firebase'))) {
        fs.mkdirSync(path.join(projectRoot, '.firebase'));
    }

    // 3. Move/Rename (Forceful for Windows)
    // If target exists, we rename it to 'emulators_old' first to avoid lock conflicts
    if (fs.existsSync(targetPath)) {
        const oldPath = targetPath + '_old_' + Date.now();
        fs.renameSync(targetPath, oldPath);
        console.log(`📦 Moved old data to backup: ${path.basename(oldPath)}`);
    }

    fs.renameSync(sourcePath, targetPath);
    console.log(`✅ Data successfully promoted to: .firebase/emulators`);

    // 4. Cleanup other ghost folders to keep workspace clean
    exportDirs.slice(1).forEach(dir => {
        try {
            fs.rmSync(path.join(projectRoot, dir.name), { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }
    });

} catch (error) {
    if (error.code === 'EPERM' || error.code === 'EBUSY') {
        console.error(`❌ Failed to finalize export: Files are locked. Please stop the application (Ctrl+C) before running this command.`);
    } else {
        console.error(`❌ Failed to finalize export: ${error.message}`);
    }
    process.exit(1);
}
