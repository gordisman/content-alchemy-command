# 🎮 Content Alchemy: Scenario Workflow Bible

### 📍 The "Where Am I?" Command
Run this at any time to see which world you are currently in:
`npm run env`

---

## Scenario 1: "The Morning Startup" (Local Development)
**Goal:** Wake up the system and start building/experimenting safely.
1.  **Switch to Safety:** `npm run env:dev`
2.  **Start the Engine:** `npm run dev:all`
3.  **Verify:** Open `http://localhost:5173`. 
    *   *If the screen is green/blue and says "Emulators Running," you are in the Sandbox.*

---

## Scenario 2: "The Pilot Test" (Update YOUR Live Site)
**Goal:** You finished a feature locally and now want to "Test Flight" it on your real production site.
1.  **Switch Environment:** `npm run env:gord`
2.  **Prepare the Files:** `npm run build`
3.  **Push to Production:** `firebase deploy`
    *   *Note: This pushes Code (Hosting), Rules (Database Security), and Robots (Functions).*
4.  **Verify:** Open `https://cac-prod-gord.web.app`. 
    *   *Check your new feature. If it works here, it's ready for clients.*

---

## Scenario 3: "The Fleet Rollout" (Update Laurie / Clients)
**Goal:** Your site (Gord Prod) is perfect. Now you want to "Promote" those same changes to Laurie.
1.  **Switch Environment:** `npm run env:laurie`
2.  **Prepare the Files:** `npm run build` 
    *   *(Crucial: You MUST run build again after switching env to "stamp" her keys onto the files).*
3.  **Push to Laurie:** `firebase deploy`
4.  **Verify:** Open `https://cac-prod-laurie.web.app`.
    *   *Laurie now has the latest version of your vision.*

---

## Scenario 4: "The Status Check" (Am I Lost?)
**Goal:** You've been working for 3 hours and aren't sure which "World" you are in.
1.  **Check Terminal:** Run `firebase projects:list`
    *   *Look for the (current) mark next to the project name.*
2.  **Check Environment:** Look at the file `.env.local` in your root folder.
    *   *If VITE_FIREBASE_PROJECT_ID is "cac-prod-laurie", you are inhabitng her world.*
3.  **Check Emulators:** If your terminal shows a big table of ports (8080, 8081, etc.), your local Sandbox is running.

---

## 🛠️ Pro-Tip: Changing the "Furniture" (Database Defaults)
If you change the **Pillars** or **Lanes** in the code and want them to show up as defaults for new clients:
1.  Update the code in `src/config/initialSystemDefaults.js`.
2.  Deploy to the client (Scenario 3).
3.  **In the browser (Client URL):** Go to Settings and click **"Initialize System Defaults"**. 
    *   *This "re-stamps" the database with your new code changes.*

---
*Keep this Bible open. It is your ultimate path to a stress-free fleet.*
