# Data Recovery Procedure 🚑

**Objective:**  
To restore the Content Alchemy Command system to a known good state after a fresh installation, data corruption, or catastrophic failure.

## 1. Prerequisites
*   A recent backup file (`content_alchemy_backup_YYYY-MM-DD.json`) created via the **Export Data** feature in Settings.
*   A fresh installation of the application running locally (`npm install` && `npm run dev:all`).
*   Admin access to the application (or ability to bootstrap admin via code/console).

## 2. Recovery Steps

### Step 1: Start the Application
Ensure your fresh installation is running and accessible at `http://localhost:5173`.
```bash
npm run dev:all
```

### Step 2: Access Settings
1.  Log in to the application.
2.  Navigate to the **Settings** page (Gear icon in top right).

### Step 3: Locate Danger Zone
Scroll to the bottom of the Settings page to find the **Danger Zone** section.

### Step 4: Import Data
1.  Click the **Import Data** button.
2.  Select your backup `.json` file from your computer.
3.  **Confirm the Warning:** The system will alert you that this action will merge/overwrite existing data.
    *   *Note: If IDs match, existing data will be overwritten. If IDs are new, data will be added.*
4.  Wait for the "System Restored" success message.

### Step 5: Verify Restoration
1.  The page will automatically reload after a successful import.
2.  Check the **Studio** to verify your recent posts and ideas are present.
3.  Check **Settings** to verify your Pillars and Configuration are correct.

## 3. Creating Backups (Prevention)
To avoid data loss, get in the habit of creating regular backups:
1.  Go to **Settings > Danger Zone**.
2.  Click **Export Data**.
3.  Save the `.json` file to a secure location (cloud storage, external drive).

> **Pro Tip:** Create a backup before any major update or "Wipe Content" operation.
