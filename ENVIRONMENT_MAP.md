# 🧠 Content Alchemy Command: Architecture Mind Map

- **PURPOSE**
    - Explain the "Why" and the "Where" of the system design
    - Clarify the relationship between Code, Variables, and Projects

- **THE 3-WAY CONNECTION (Components)**
    - **1. THE CODE (The Car)**
        - **Frontend (FE):** User Interface, Buttons, Screens (Vite + React)
        - **Backend (BE):** Automated logic, Alerts, Daily Emails (Firebase Cloud Functions)
    - **2. THE ENV VARIABLES (The GPS)**
        - **Location:** File named `.env.local`
        - **Keycard:** Tells the Code where to "drive" (which database)
        - **Examples:** 
            - `VITE_FIREBASE_PROJECT_ID=cac-prod-gord`
            - `VITE_FIREBASE_API_KEY=AIzaSy...`
    - **3. THE PROJECT/DATA (The House)**
        - **Storage:** Firestore Database (Collections of Posts, Ideas, Settings)
        - **Real House:** `cac-prod-gord` (Your live business data)
        - **Fake House:** `content-alchemy-command-dev` (The Playground ghost data)

- **THE THREE TIERS (Environment Mapping)**
    - **🟢 TIER 1: DEV (The Playground)**
        - **Code:** Running from `i:\Antigravity Apps\...` on your PC
        - **GPS Keys:** Set to `content-alchemy-command-dev`
        - **House/Data:** Fake Local Emulator DB (Ghost Data)
        - **Access URL:** `http://localhost:5173`
        - **Hardware:** Runs offline on your physical computer
    - **🟡 TIER 2: STAGING (Local Production)**
        - **Code:** Running from `i:\Antigravity Apps\...` on your PC
        - **GPS Keys:** Set to **`cac-prod-gord`** (Live Keys)
        - **House/Data:** **REAL Database** in Google Cloud
        - **Access URL:** `http://localhost:5173`
        - **Hardware:** Runs on your PC but requires Internet (Online)
    - **🔴 TIER 3: PROD (The Live Site)**
        - **Code:** Static files deployed to the internet
        - **GPS Keys:** Hardcoded to **`cac-prod-gord`**
        - **House/Data:** **REAL Database** in Google Cloud
        - **Access URL:** `https://cac-prod-gord.web.app`
        - **Hardware:** Runs on Google's global server network

- **FRONTEND vs. BACKEND (The Split)**
    - **🖥️ FRONTEND (The Steering Wheel)**
        - **What:** The visual React application you interact with
        - **Source:** Code in the `src/` folder
        - **Commands:** `npm run dev` (viewing) / `npm run build` (publishing)
    - **☁️ BACKEND (The Engine)**
        - **What:** Cloud Functions running background scripts
        - **Source:** Code in the `functions/` folder
        - **Execution:** Always running in the cloud (even if your PC is off)
        - **Logic:** "Every hour, check for Action Alerts and send emails"

- **SAFETY ZONES (Risk Levels)**
    - **🟢 GREEN (Dev):** Zero risk. Deleting data only affects fake "ghost" posts.
    - **🟡 YELLOW (Staging):** High risk. Deleting data removes **REAL** posts from your business.
    - **🔴 RED (Prod):** High risk. A code bug here breaks the app for every visitor instantly.

- **RESOURCES**
    - [MASTER_WORKFLOW_SOP.md](MASTER_WORKFLOW_SOP.md) (Step-by-step commands)
    - [CLIENT_PROVISIONING_SOP.md](CLIENT_PROVISIONING_SOP.md) (Setting up new clients)
