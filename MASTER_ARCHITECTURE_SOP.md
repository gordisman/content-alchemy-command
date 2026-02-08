# Master Architecture & Standard Operating Procedures (SOP)

**Introduction**
This document serves as the "Flight Manual" for the Content Alchemy Command application. It details the architecture, workflows, and specific commands required to operate the Development and Production environments legally and safely.

---

## 1. System Architecture - The Big Picture

### The Concepts
To understand the system, you must separate **The Code** from **The Data**.

#### A. The Factory - Your Code
- What it is: The folder `i:\Antigravity Apps\Content-Alchemy-Command-Dev`
- What it contains: The logic, the designs, the buttons, the "Brain" of the app.
- Quantity: You have exactly ONE factory.
- Reality: When you edit a file here, you are changing the blueprint for every future version of the app.

#### B. The Keys - The Environments
- What they are: Small configuration files that act as keys.
- Role: They tell the Factory which database to talk to.
- Key 1 - Dev Mode
    - Command: `npm run env:dev`
    - Action: Opens the door to the Development Database.
- Key 2 - Prod Mode (Gord)
    - Command: `npm run env:prod`
    - Action: Opens the door to the Gord Prod Database.

#### C. The Destinations
- Localhost
    - Description: Your private looking glass. You see whatever the current Key opens.
- Hosting - Web
    - Description: A public looking glass. It sees the Production Database.
    - URL: `https://cac-prod-gord.web.app`
- GitHub - The Vault
    - Description: A secure vault where we store copies of the Factory blueprints.

---

## 2. Standard Operating Procedures (SOP)

### Workflow A - The Builder Cycle (Development)
*Use this loop when creating new features, fixing bugs, or experimenting.*

1.  **Open Terminal**
    - Action: Open VS Code.
    - Check: Ensure terminal is visible.

2.  **Insert Dev Key**
    - Command: `npm run env:dev`
    - Response: "Removed .env.local..."

3.  **Start Engine**
    - Command: `npm run dev`
    - Response: "Local: http://localhost:5173"

4.  **Work**
    - Action: Edit code files.
    - Action: Check browser.
    - Note: The data you see is Trash/Test data. Feel free to delete or mangle it.

5.  **Stop**
    - Action: Click inside the Terminal pane.
    - Keypress: `Ctrl + C`
    - Keypress: `Y` and `Enter`

### Workflow B - The Owner Cycle (Production Management)
*Use this loop when writing real content, checking final aesthetics, or demonstrating locally.*

1.  **Open Terminal**
    - Action: Open VS Code.

2.  **Insert Prod Key**
    - Command: `npm run env:prod`
    - Response: "Copied .env.prod to .env.local"

3.  **Start Engine**
    - Command: `npm run dev`
    - Response: "Local: localhost"

4.  **Work**
    - Action: Write posts.
    - Action: Organize pillars.
    - Note: This is REAL data. If you delete a post here, it is gone forever.

5.  **Stop**
    - Action: Click inside the Terminal pane.
    - Keypress: `Ctrl + C`
    - Keypress: `Y` and `Enter`

### Workflow C - The Promoter Cycle (Deployment)
*Use this loop when you want to publish your latest code changes to the internet.*

1.  **Prerequisites**
    - Tested in Dev (Cycle A).
    - Verified in Prod (Cycle B).

2.  **Build and Deploy**
    - Command: `npm run env:prod; npm run build; firebase deploy`
    - Note: This ensures you are using the Prod Database and optimized code.
    - Response: "Deploy complete! Hosting URL..."

3.  **Verify**
    - Action: Visit `https://cac-prod-gord.web.app`
    - Check: Ensure features work and data matches what you expect.

### Workflow D - The Savor Cycle (GitHub Backup)
*Use this loop frequently. Recommended: End of every work session.*

1.  **Stage Changes**
    - Command: `git add .`

2.  **Commit**
    - Command: `git commit -m "Describe your changes here"`

3.  **Push**
    - Command: `git push`

### Workflow E - The Expander Cycle (New Client Setup)
*Use this when onboarding a new client.*

1.  **Firebase Console**
    - Action: Create New Project (e.g. `cac-prod-coke`)
    - Critical: Upgrade to Blaze Plan (Set Budget or Skip)
    - Enable: Authentication (Google)
    - Enable: Firestore (Production Mode)
    - Enable: Storage (Get Started)

2.  **Local Setup**
    - Action: Create `.env.coke` (Copy keys from Settings)
    - Action: Create script `env:coke` in `package.json`

3.  **Configure Email Secrets (Critical)**
    *   *Required for sending invites and alerts.*
    *   **Step A: Get Password**
        *   Go to Client's Google Account -> Security -> 2-Step Verification -> App Passwords.
        *   Create new app: "Content Alchemy".
        *   Copy the 16-character code.
    *   **Step B: Set Secret**
        *   Command: `firebase functions:secrets:set GMAIL_APP_PASSWORD`
        *   Action: Paste the code when prompted.
    *   **Step C: Deploy Functions**
        *   Command: `firebase deploy --only functions`
        *   Note: This "reboots" the backend with the new password.

4.  **Initialize System**
    - Command: `npm run env:coke`
    - Command: `firebase use content-alchemy-command-dev` (Or your new project ID)
    - Command: `firebase deploy --only firestore:rules,storage,functions`
    - Note: This prevents "Permission Denied" errors by sending your security rules to the cloud.
    - Command: `npm run dev`
    - Action: Click "Initialize System" button on login.

---

## 3. Command Reference Cheat Sheet

- Switch to Dev
    - Command: `npm run env:dev`
    - Note: Safe mode. Messy data.
- Switch to Prod
    - Command: `npm run env:prod`
    - Note: Live mode. Real data.
- Start Server
    - Command: `npm run dev`
    - Note: Launches the website locally.
- Stop Server
    - Command: `Ctrl + C`
    - Note: Must stop before switching!
- Status Check
    - Command: `git status`
    - Note: See what files changed.
- Save Checkpoint
    - Command: `git commit -m "msg"`
    - Note: Save your code history.
- Deploy App
    - Command: `firebase deploy`
    - Note: Send code to the internet.

---

## 4. Troubleshooting

- Issue: Global Settings Not Found
    - Cause: You connected to a new/empty database.
    - Fix: Click the blue Initialize System button on the error screen.

- Issue: Missing Permissions
    - Cause: Database Rules are locked or you aren't logged in as Admin.
    - Fix: Ensure your email is in `.env.prod` under `VITE_ADMIN_EMAILS`.

- Issue: Port 5173 already in use
    - Cause: You didn't stop the previous server.
    - Fix: Kill the old terminal or just use the new Port (5174).

---

## 5. Roadmap & Future Work
Strategic ideas and feature requests that are pending implementation can be found in [FUTURE_CONSIDERATIONS.md](file:///i:/Antigravity%20Apps/Content-Alchemy-Command-Dev/FUTURE_CONSIDERATIONS.md).

