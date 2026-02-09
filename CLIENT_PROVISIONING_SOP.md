# 🏗️ Client Provisioning SOP (Master Edition)

## 🎯 Purpose
To deploy a fresh, empty version of **Content Alchemy Command** for a new client instance.

---

## 💼 Business Strategy & Ownership
Before starting technically, decide on your ownership model:

### 1. The "Landlord" Model (Recommended)
*   **Who owns the Google Account?** You (Gord).
*   **Workflow:** You create the child project in your own Firebase account. You pay the bills (and bill the client).
*   **Client Involvement:** ZERO. You just give them a login to the final app.

### 2. The "Sub-Contractor" Model
*   **Who owns the Google Account?** The Client.
*   **Workflow:** The client creates a Google Cloud project and adds your email as an **Owner/Editor**.
*   **Client Involvement:** They must set up their own credit card for the "Blaze Plan."

---

## 📋 Preparation Checklist (Firebase Console)
Before you run any commands in Antigravity, you must set up the "Cloud Infrastructure" manually in your browser.
1.  **Create a New Project:** Go to [console.firebase.google.com](https://console.firebase.google.com) and create `cac-prod-[clientname]`.
2.  **Enable Paid Billing (Blaze):** Cloud Functions require the Blaze plan (there is a free tier, but a card must be on file).
3.  **Authentication:** Enable **Email/Password** in the "Build > Authentication" tab.
4.  **Database:** Create the **Firestore Database** (choose a location close to the client's home base).

---

## 📍 Location Check (Where am I?)
Before running any workflow, you must be in the **Root Directory** of your project on your computer.
*   **Path:** `i:\Antigravity Apps\Content-Alchemy-Command-Dev`
*   **In Antigravity:** You are already here. I (the AI) always operate inside this folder.
*   **Quick Verification:** In the terminal, run `ls` and confirm that `package.json` and `firebase.json` exist.

---

## 🚀 The Provisioning Workflow (Step-by-Step)

### Step 1: Register the New Project Locally
**Goal:** Tell your computer (and the Firebase tools) that this new client project exists in the cloud so they can talk to each other.

1.  **Where:** In the **Antigravity Terminal** or your VS Code terminal.
2.  **Command:** 
    ```powershell
    firebase use --add
    ```
3.  **Action:** A list of your Google Firebase projects will appear.
    *   Use your arrow keys to select the new client project (e.g., `cac-prod-client-abc`).
    *   **Alias:** When prompted for an alias, type the client's name (e.g., `client-abc`). This is the "nickname" you will use to switch to their neighborhood later.

### Step 2: Create the Client Secret Keycard (.env)
**Goal:** Create a unique configuration file so the code knows which "house" it is living in.

1.  **Action - Copy:** Copy your existing `.env.prod` file.
2.  **Action - Rename:** Rename the copy to `.env.[client-alias]` (Example: `.env.client-abc`).
3.  **Action - Fill:** Open this new file and replace the values with the **Project Settings** from the client's Firebase Console:
    *   Go to [Firebase Console](https://console.firebase.google.com/) -> Project Settings (Gear Icon) -> General.
    *   Scroll down to "Your Apps" to find the **API Key**, **Project ID**, and **App ID**.
    *   **CRITICAL:** Update the `VITE_ADMIN_EMAILS` to the client's email so they can access the settings.

### Step 3: Deploy the Infrastructure
**Goal:** "Push" the actual website and backend logic into the client's empty cloud project.

1.  **Command - Switch Neighborhood:** 
    ```powershell
    firebase use [client-alias]
    ```
2.  **Command - Build Site:** (This compiles the code for production)
    ```powershell
    npm run build
    ```
3.  **Command - Deploy:** (This pushes the code to the live URL)
    ```powershell
    firebase deploy
    ```

### Step 4: Initialize the Client Database
**Goal:** Your new project is currently an "empty house." You need to move the furniture in (System Defaults and Pillars).

1.  **Open:** Go to the **Hosting URL** provided at the end of the `firebase deploy` command.
2.  **Log In:** Use an email address you listed in the `VITE_ADMIN_EMAILS` section of their `.env` file.
3.  **Navigate:** Go to **Studio** -> **Settings**.
4.  **Initialize:** Because the database is empty, the app will automatically show a big **"Initialize System Defaults"** button. 
    *   **Action:** Click that button. The app will now "Seed" the database with all the standard Action Alert logic, pillar structures, and system defaults.
    *   **Auto-Capture:** During this process, the system will automatically detect the current URL (e.g., `https://cac-prod-client-abc.web.app`) and save it as the **Production App URL**. This is required for the "View in Studio" links in the daily alert emails to work correctly.

---

## 🛠️ Post-Provisioning Verification
1.  **Check Alerts:** Go to **Settings > Action Alerts & Guidance**.
2.  **Verify URL:** Ensure the **Production App URL** matches the live hosting URL.
3.  **Test Link:** Click **"Send Test Alert (Preview)"** and verify that the "VIEW IN STUDIO" link in the email opens the live app correctly.

---

## 🔄 Switching Contexts (Which hat are you wearing?)

Whenever you want to work on a specific client vs. your own project, follow this pattern:

| To work on... | Command in Terminal |
| :--- | :--- |
| **Your Project (Gord)** | `firebase use default ; npm run env:prod` |
| **Client ABC** | `firebase use client-abc ; [Swap .env.local content]` |

*Note: Antigravity can handle the "Keycard Swapping" for you if you just say: "Hey AG, switch me over to Client ABC's environment."*
