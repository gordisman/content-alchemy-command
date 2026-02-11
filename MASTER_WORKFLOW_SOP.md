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

## 🌙 The "Goodnight" Shutdown Routine
Before you turn off your PC for the night, follow these 3 steps to ensure a perfect start tomorrow:

### 1. Final Cloud Sync
If you've made changes today, push them to GitHub. This is your "Off-site Backup."
*   **Command:** `git add .`, `git commit -m "daily wrap up"`, `git push origin main`

### 2. Stop the Local Engine
Go to your terminal where `dev:all` is running and press:
*   **Keyboard:** `Ctrl + C`
*   *(If asked "Terminate batch job?", type `y` and Enter).*
*   **If it's stubborn:** Press `Ctrl + C` rapidly 3-4 times. 
*   **The "Kill Switch":** If it still won't stop, click the **Trash Can icon** in the top-right of the terminal panel to force-close everything.
*   **Why:** This closes the ports (5173, 8080, etc.) so they aren't "stuck" when you reboot tomorrow.

### 3. Close & Sleep
Now you can safely close VS Code and shut down your computer. Your code is safe on your disk and on GitHub!

---

### 🚢 Fleet Management: Deploying to Multiple Clients

Once you have multiple clients (like **Laurie**), you have two strategies for updates.

#### Strategy A: The "Fleet Release" (Automatic) - CURRENT SETUP
In this mode, pushing to GitHub updates EVERYONE at once. 
*   **Pros:** Very fast, zero extra work.
*   **Cons:** If there's a bug, it hits everyone at the same time.
*   **Commands:** `git push` (Updates Gord & Laurie simultaneously).

#### Strategy B: The "Staged Release" (Manual Promotion) - RECOMMENDED
This is what we will use to give you the control you asked for. You update yourself first, then "promote" to the client.
1.  **Update Gord:** Push your code. Only Gord's site updates.
2.  **Test:** verify everything is perfect on your live site.
3.  **Promote to Laurie:** Either manually trigger the Laurie deployment or "enable" her in the code list.

#### 🛠️ Client-Specific Local Commands
I have added these shortcuts to your project so you can "inhabit" Laurie's world locally:
*   `npm run env:laurie`: Swaps your local keys to point to Laurie's production database.
*   `npm run env:gord`: Swaps back to your production database.
*   `npm run env:dev`: Swaps back to the local fake/test database.

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


