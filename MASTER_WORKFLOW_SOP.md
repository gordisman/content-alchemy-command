# 🗺️ Master Workflow & Environment Guide

This guide explains EXACTLY how to move from "Idea" to "Live" using Antigravity and your three development environments.

---

## 🏗️ The Three Tiers of Development

Think of these like three different versions of your office.

### 1. The Playground (Tier 1: Local Dev + Fake DB)
*   **What it is:** A completely isolated sandbox. Nothing you do here can break your real business data.
*   **The Database:** **Firebase Emulators.** This is a "ghost" database that lives only in your computer's memory.
*   **The URL:** `http://localhost:5173`
*   **Command to get here:**
    ```powershell
    npm run env:dev ; npm run dev
    ```
*   **Why use it?** When we are building brand new features or doing "destructive" testing (like deleting posts to see if the UI works). 

### 2. The Staging Area (Tier 2: Local Dev + REAL DB)
*   **What it is:** This is the "Truth Check." You are running the code from your computer, but it is reaching out across the internet to touch your **REAL** posts.
*   **The Database:** **LIVE Production DB** (`cac-prod-gord`).
*   **The URL:** `http://localhost:5173`
*   **Command to get here:**
    ```powershell
    npm run env:prod ; npm run dev
    ```
*   **Why use it?** This is where you verify that the new features work with your actual data before you let the public see it. 
*   **The `.env` Mystery explained:** Vite (the engine) always looks for a file named `.env.local`. When you run this command, Antigravity takes your "Production Secret Keys" (from `.env.prod`) and pastes them into `.env.local`. This "tricks" your computer into talking to the real database.

### 3. The Live App (Tier 3: Live Hosting + REAL DB)
*   **What it is:** The actual public URL that you and your users use.
*   **The Database:** **LIVE Production DB** (`cac-prod-gord`).
*   **The URL:** `https://cac-prod-gord.web.app`
*   **Command to get here:**
    ```powershell
    npm run build ; firebase deploy --only hosting
    ```
*   **Why use it?** This is the final step. Once you've tested in Tier 2 and seen that it works, you "Publish" it here.

---

## 🔄 The Daily Workflow Cycle

Follow these steps every time we work together on a new feature:

### Step 1: Initialize the Session
Always tell Antigravity which "Neighborhood" you want to work in.
*   **Prompt:** "I want to work in the Playground today. Run the dev environment."
*   **Action:** Antigravity will run `npm run env:dev ; npm run dev`.

### Step 2: Build & Break (Playground)
We write code. You open `http://localhost:5173`. 
*   **Note:** You might see old or "weird" data here. Don't panic! It's just the fake emulator data. Use this to check if buttons click and screens load.

### Step 3: The Reality Check (Staging)
Once the feature looks good, we need to see it with your **REAL** posts.
*   **Prompt:** "Ready to test with real data. Switch me to Local Production."
*   **Action:** Antigravity runs `npm run env:prod ; npm run dev`.
*   **Verification:** You refresh `http://localhost:5173`. Now you should see your real LinkedIn and Facebook posts. Use this to make sure the "Overdue" markers and "09:00" times look right with your real content.

### Step 4: The Push (Deploy)
Everything looks perfect in Staging. Time to ship.
*   **Prompt:** "Deploy the frontend to live."
*   **Action:** Antigravity runs `npm run build ; firebase deploy --only hosting`.
*   **Final Step:** You refresh `https://cac-prod-gord.web.app`.

---

## 🛠️ Command Summary Table

| Goal | Command | URL to visit | Database |
| :--- | :--- | :--- | :--- |
| **Reset to Fake Data** | `npm run env:dev ; npm run dev` | `localhost:5173` | Emulators (Fake) |
| **Connect to Real Data** | `npm run env:prod ; npm run dev` | `localhost:5173` | `cac-prod-gord` (Real) |
| **Update Live Site** | `npm run build ; firebase deploy` | `cac-prod-gord.web.app` | `cac-prod-gord` (Real) |

---

## ⚠️ Important Warning on Database Switching
When you are in **Local Production (Tier 2)**, any change you make (editing a post title, changing a date) **IS HAPPENING TO YOUR LIVE BUSINESS DATA.** 

Always be aware of which environment is active by looking at the terminal or checking the data you see on screen.

---

## 🕵️ How to Check Your Current Status
If you are ever unsure where you "are," you can ask Antigravity or run these commands yourself:

### 1. Check the Active Firebase Project
*   **Command:** `firebase use`
*   **Response:** If it says `cac-prod-gord`, you are targeting the Production project.

### 2. Check the Database Target (The "Keycard")
*   **Command:** `Get-Content .env.local | Select-String "PROJECT_ID"`
*   **How to read it:**
    *   If it shows `cac-prod-gord`, your code is talking to the **REAL** database.
    *   If it shows `content-alchemy-command-dev` (or similar), you are in the **Playground**.

### 3. The "Eyeball" Test
*   Look at your **Terminal**. When you run the switch commands, Antigravity prints a giant message:
    *   🔄 `Switching Environment to: [ PROD ]`
    *   🔄 `Switching Environment to: [ DEV ]`
*   Look at the **Data** at `localhost:5173`. If you see your actual LinkedIn posts, you are in **Staging/Prod**. If you see random test data, you are in the **Playground**.

---

## 🔥 Common Firebase Commands Reference
You don't need to memorize these (you can always ask me to run them), but here is what they do:

| Command | Purpose |
| :--- | :--- |
| **`firebase login`** | Use this if Antigravity says you are "Unauthenticated." It opens a browser window to log you in. |
| **`firebase projects:list`** | Shows you all the Firebase projects you have access to. |
| **`firebase use <name>`** | Sets the current "Active" project for the terminal. (e.g., `firebase use cac-prod-gord`). |
| **`firebase deploy --only hosting`** | Uploads your **Frontend** (the website UI) to the live URL. |
| **`firebase deploy --only functions`** | Uploads your **Backend** (the Cloud Functions/Alerts) to the live server. |
| **`firebase deploy`** | Uploads **EVERYTHING** at once (UI + Backend). |
| **`firebase emulators:start`** | Starts the "Playground" database on your computer. |
| **`firebase logout`** | Signs you out of the Firebase CLI. |

---

### 🚢 Deployment Protocol: Gord First, Then Client

We **NEVER** deploy directly to a client environment (like Laurie) without verifying it on your production environment first. This is our strict safety protocol.

#### 1. The "Gord-First" Standard
1.  **Switch to Gord:** `npm run env:gord`
2.  **Build:** `npm run build`
3.  **Target Gord:** `firebase use cac-prod-gord`
4.  **Deploy:** `firebase deploy --only hosting`
5.  **VERIFY:** Open `https://cac-prod-gord.web.app` and test the new feature.

#### 2. The "Green Light" Promotion
Only AFTER you have verified the feature on Gord's site do we proceed to the client.
1.  **Switch to Laurie:** `npm run env:laurie`
2.  **Re-Build:** `npm run build` (Crucial to bake in her specific settings)
3.  **Target Laurie:** `firebase use cac-prod-laurie`
4.  **Deploy:** `firebase deploy --only hosting`

---

## ✅ The Code Promotion Checklist (Wrap-Up)

Before finishing a "Code Promotion" session, we must always complete this checklist to ensure safety and history:

1.  **Status Check:** Run `git status` to see what changed.
2.  **Stage Files:** Run `git add .` to prepare the changes.
3.  **Commit:** Run `git commit -m "feat: description of changes"` to save the history.
4.  **Push:** Run `git push origin main` to back it up to GitHub.
5.  **Data Backup:** Run `npm run save` OR use the Emulator UI (see below) to save your local test data.

---

## 🌙 The "Goodnight" Shutdown Routine
Before you turn off your PC for the night, follow these steps:

### 1. Data Export (Critical)
If `Ctrl + C` or `npm run save` is giving you trouble, use the **Fail-Safe Method**:
1.  Open your browser to the **Emulator UI**: `http://localhost:4000` (or `4001`).
2.  Also check `http://localhost:8080/ui` if the main UI isn't loading.
3.  **Click "Export Data"**: There should be a button in the Emulator UI to export data.
4.  **Verify:** Check that the folder `.firebase/emulators` has recent timestamps.

### 2. Stop the Engine
Go to your terminal where `dev:all` is running and press:
*   **Keyboard:** `Ctrl + C` (multiple times if needed).
*   **The "Kill Switch":** Click the **Trash Can icon** in the terminal panel to force-close. 

### 3. Local Environment Reset (Optional)
If you finished a deployment session, it's good practice to switch back to DEV so you don't accidentally edit PROD next time:
*   **Command:** `npm run env:dev`

---

## 📧 Troubleshooting Daily Alerts
If you or a client receive a daily alert email but the **"VIEW IN STUDIO"** links are broken or point to the wrong place:

1.  **Likely Cause:** The **Production App URL** in the settings is incorrect (perhaps it was initialized on a different domain or localhost).
2.  **The Fix:** 
    *   Go to the **Settings** page on the live site.
    *   Scroll to **Action Alerts & Guidance**.
    *   Update the **Production App URL** to match the current browser address.
    *   Hit **Save Configuration**.
3.  **Verification:** Send a **Test Alert (Preview)** to confirm the link now points to the correct "front door."


