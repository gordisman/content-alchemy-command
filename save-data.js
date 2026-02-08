import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const emulatorsPath = path.join(__dirname, '.firebase', 'emulators');

// Ensure directory exists
if (!fs.existsSync(emulatorsPath)) {
    console.log(`Creating directory: ${emulatorsPath}`);
    fs.mkdirSync(emulatorsPath, { recursive: true });
}

console.log('Exporting emulator data...');
console.log(`Target: ${emulatorsPath}`);

// Run the export command explicitly
exec(`firebase emulators:export "${emulatorsPath}" --force`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Stderr: ${stderr}`);
    }
    console.log(`Stdout: ${stdout}`);
    console.log('✅ Data exported successfully!');
});
