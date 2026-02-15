import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const firebaseDir = path.join(projectRoot, '.firebase');
const currentEmulators = path.join(firebaseDir, 'emulators');

// The specific backup identified as the one created immediately before the current session
// Timestamp 1770997337428 corresponds to 2026-02-13 10:42:17
const targetBackupName = 'emulators_old_1770997337428';
const specificBackup = path.join(firebaseDir, targetBackupName);

console.log('🔄 Starting Data Recovery...');
console.log(`📍 Targeting Backup: ${targetBackupName}`);

if (!fs.existsSync(specificBackup)) {
    console.error(`❌ Critical Error: Backup folder ${targetBackupName} not found!`);
    process.exit(1);
}

// Verify metadata exists in backup to ensure it's valid
if (!fs.existsSync(path.join(specificBackup, 'firebase-export-metadata.json'))) {
    console.error(`❌ Critical Error: Backup folder ${targetBackupName} is missing metadata file!`);
    process.exit(1);
}

try {
    // 1. Move current (broken) emulators folder out of the way
    if (fs.existsSync(currentEmulators)) {
        const corruptDir = path.join(firebaseDir, `emulators_corrupt_${Date.now()}`);
        fs.renameSync(currentEmulators, corruptDir);
        console.log(`📦 Moved broken state to: ${path.basename(corruptDir)}`);
    }

    // 2. Restore the backup by renaming it to 'emulators'
    fs.renameSync(specificBackup, currentEmulators);

    console.log(`✅ SUCCESS: Restored valid data from ${targetBackupName}`);
    console.log(`🚀 Your data is back. Please run 'npm run dev:all' now.`);

} catch (error) {
    console.error(`❌ Restoration failed:`, error);
    if (error.code === 'EPERM' || error.code === 'EBUSY') {
        console.error('⚠️  Files are locked. MAKE SURE YOU STOP THE SERVER (Ctrl+C) first!');
    }
    process.exit(1);
}
