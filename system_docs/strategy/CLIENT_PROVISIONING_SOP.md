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
### 3. Configure Authentication
*   Go to **Authentication** > **Sign-in method**.
*   Click **Add new provider**.
*   **Email/Password:** Enable this (Primary for clients with professional emails).
*   **Google:** Enable this (Primary for Admin/Gord and clients with Gmail).
    *   *Note: Set the "Public-facing name" to "Content Alchemy Command".*
4.  **Database:** Create the **Firestore Database** in Production Mode.
5.  **Storage:** Go to Build > Storage, click **Get Started**, choose **Production Mode**, and click Done. (Rules will fail if you skip this!)
6.  **Web App:** Register a new Web App (Name: `[Name] Prod Web`) and save the config.

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
## 🚀 Phase 3: The First Launch
- [ ] **Build:** `npm run build`
- [ ] **Deploy All:** `firebase deploy` (This handles Code, Rules, and Robots in one go)
- [ ] **Login:** Gord logs in via Google URL
### Step 4: Initialize the Client Database
**Goal:** Your new project is currently an "empty house." You need to move the furniture in (System Defaults and Pillars).

1.  **Open:** Go to the **Hosting URL** provided at the end of the `firebase deploy` command.
2.  **Log In:** Use your Google Admin account (`gord.isman@gmail.com`).
3.  **Initialize:** Click the **"Initialize System Defaults"** button.

### Step 5: Interior Decorating (In-App Setup)
**Goal:** Tailor the experience and verify the communication robot works.

1.  **Navigate:** Go to **Studio** -> **Settings**.
2.  **Recipients:** In the "Action Alerts" section, add the client's email.
3.  **Verify URL:** Ensure the "Production App URL" matches the live site URL (this ensures links in emails work!).
4.  **Timezone:** Set the client's local timezone.
5.  **THE TEST:** Click **"Send Test Alert (Preview)"**. 
    *   *Verify that you (and the client) receive the email.*
    *   *If this fails, verify the `GMAIL_APP_PASSWORD` secret was set correctly.*
6.  **Hand-off:** Send the `[NAME]_ONBOARDING.md` guide to the client.

---

## 🛠️ Post-Provisioning Verification
1.  **Check Alerts:** Go to **Settings > Action Alerts & Guidance**.
2.  **Verify URL:** Ensure the **Production App URL** matches the live hosting URL.
3.  **Test Link:** Click **"Send Test Alert (Preview)"** and verify that the "VIEW IN STUDIO" link in the email opens the live app correctly.

---

## 🚀 How to Log In
Depending on your email type, choose the best method:

### Option A: Professional Email (Recommended)
1.  **Sign Up:** Click the **"Sign Up"** link at the bottom of the login box.
2.  **Credentials:** Use your professional email (`laurie@alexanderart.com`) and create a secure password.
3.  **Verification:** Check your inbox for a verification email and click the link to activate your account.

### Option B: Gmail Account
1.  **One-Click:** Simply click the **"Sign in with Google"** button.
2.  **Authorize:** Select your Google account and you will be logged in instantly.

---

## 🔄 Switching Contexts (Which hat are you wearing?)

Whenever you want to work on a specific client vs. your own project, follow this pattern:

| To work on... | Command in Terminal |
| :--- | :--- |
| **Your Project (Gord)** | `firebase use default ; npm run env:prod` |
| **Client ABC** | `firebase use client-abc ; [Swap .env.local content]` |

*Note: Antigravity can handle the "Keycard Swapping" for you if you just say: "Hey AG, switch me over to Client ABC's environment."*
