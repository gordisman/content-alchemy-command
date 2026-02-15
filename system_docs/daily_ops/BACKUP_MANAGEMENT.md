`# Backup & Recovery Management Protocol

## 🎯 Purpose
This document outlines the standard operating procedures for managing system data integrity using the **Export/Import** tools in the **Settings > Danger Zone**.

## 🛠️ The Tools (What You Have)

### 1. **Export Data (Snapshot)**
- **What it does:** Downloads a single `.json` file containing ALL your **Posts, Ideas, Settings, and Pillars**.
- **What it captures:** The exact state of your text data at that moment.
- **What it misses:** The physical media files (images/videos) stored in the cloud (though the *links* to them are saved).
- **Location:** Settings Page > Danger Zone > Backup & Recovery.

### 2. **Import Data (Merge/restore)**
- **What it does:** Reads a `.json` backup file and uploads the data back into the system.
- **Behavior:** This is a **MERGE** operation.
    - **Existing IDs:** Overwritten with the backup data (updates old records).
    - **New IDs:** Added to the system.
    - **Missing IDs:** Records in the system that exceed the backup are **NOT deleted**.

### 3. **Wipe Content (Clean Slate)**
- **What it does:** Permanently deletes ALL Posts and Ideas. Resets Post ID counters to 0.
- **Use Case:** Required before an import if you want a **perfect 1:1 restore** (removing "junk" data created after the backup).

4. **Surgical Post Export (Single Item)**
- **What it does:** Downloads a single Post as a micro-JSON file.
- **Location:** Editor Footer > Download Icon (Cloud with Arrow).
- **Use Case:** "Save State" for a specific heavy-duty newsletter/article before major edits.

---

## 🏗️ Advanced Workflow: Client Debugging & Sandbox
*The "Golden Standard" for debugging: Reproduction with Production Data.*

### 🛠️ The "It Works On My Machine" Killer
1.  **Export Client Data:** Go to the client's production environment -> Settings -> Export Data.
2.  **Import to Dev/Local:** Open your local `localhost` environment (pointed to a dev database).
3.  **Import the JSON:** Load the client's snapshot.
4.  **Result:** You now have their **exact** data state (weird inputs, massive text blocks, edge cases) to test fixes against without risking their live production data.

### 🧪 Migration Dry-Runs
- Before running a destructive script (e.g., "Rename 'Pillars' to 'Themes'"), export the live data to dev.
- Run your migration script on `localhost`.
- Verify the data integrity.
- **Only then** run it on Production.

## 📅 When to Backup (Scenarios)

You should create a manual Export in the following situations:

### 🚨 Critical Scenarios (MUST DO)
1.  **Before a "Wipe Content" or "System Reset":**
    - **Why:** These actions are irreversible. If you realize you needed one specific post later, it's gone forever without a backup.
2.  **Before Major Configuration Changes:**
    - **Example:** Changing your *Content Pillars* or *Strategy Matrix* significantly.
    - **Why:** If the new strategy ruins your analytics or workflow, you can restore the old settings file.
3.  **Before Bulk Operations:**
    - **Example:** Using a script to "Auto-Schedule 50 Posts" or "Delete Old Drafts."
    - **Why:** Scripts can have bugs. A backup lets you "undo" a batch error.

### 🗓️ Routine Maintenance (SHOULD DO)
1.  **Weekly Snapshot:**
    - **Process:** Every Friday afternoon.
    - **Naming:** `cac_backup_YYYY-MM-DD_weekly.json`
    - **Storage:** Save to a secure folder (e.g., Google Drive / SharePoint) under `Config Management`.
2.  **After a "Heavy" Content Creation Session:**
    - **Example:** You just spent 4 hours creating 20 high-quality draft ideas.
    - **Why:** Protects your time investment against accidental deletion or browser sync issues.

---

## 🔄 The Recovery Process (How-To)

### Scenario A: "Oops, I messed up one post."
1.  **Don't Wipe.**
2.  Go to **Settings > Import Data**.
3.  Select your most recent backup.
4.  Confirm **"OVERWRITE"**.
5.  **Result:** The specific post you deleted/ruined will be restored/fixed. Other work you did *since* the backup is safe (because it's a merge).

### Scenario B: "The system is full of junk/tests. I want to roll back to Monday."
1.  **Go to Settings > Wipe Content.**
    - Confirm with **"DELETE"**.
    - *Result: System is empty of posts.*
2.  **Go to Settings > Import Data.**
1.  Select Monday's backup file.
2.  Confirm **"OVERWRITE"**.
3.  **Result:** The system is an exact clone of Monday's state.

---

## ⚠️ Limitations & Notes
*   **Media Files:** If you delete a video from the *Storage Bucket* directly, restoring the JSON backup will **NOT** bring the video back. The post will exist, but the video link will be broken.
*   **User Accounts:** This backup includes User roles/permissions but does **not** manage authentication (passwords/login). That is handled by Google Auth safely.
