# API Key Management & Secrets SOP

## Overview
This document outlines the standard operating procedure for managing sensitive API keys and secrets within the Content Alchemy Command system. 

**Security Principle:** API Keys (like OpenAI, Stripe, Admin SDKs) must **NEVER** be committed to the code repository. They must be injected into the environment securely.

---

## 1. Local Development (Emulators)

When running locally (`npm run dev:all`), the Firebase Emulators need access to secrets.

### Method A: `.runtimeconfig.json` (Preferred for Emulators)
The Cloud Functions Emulator reads from a file named `.runtimeconfig.json` in the `functions/` directory.

**File Location:** `functions/.runtimeconfig.json`
**Format:**
```json
{
  "openai": {
    "key": "sk-your-actual-secret-key-here"
  }
}
```

**Setup Command:**
You can generate this file automatically from your current project configuration (if you are logged in to a project that has them set):
```bash
firebase functions:config:get > functions/.runtimeconfig.json
```
*Note: This file is `.gitignore`d and should NOT be committed.*

---

## 2. Production Deployment (Live Channels)

When deploying to a live environment (e.g., `cac-gord-prod` or `cac-prod-laurie`), the secrets must be stored in the **Google Cloud Secret Manager** or **Firebase Environment Configuration**.

We currently use **Firebase Environment Configuration** (`functions.config()`).

### Step-by-Step: Setting a Key for Production

**1. Identify the Target Project:**
First, switch to the project you are deploying to (or specify it in the command).
```bash
firebase use cac-gord-prod
# OR
firebase use cac-prod-laurie
```

**2. Set the Key:**
Run the following command to securely store the key in the cloud environment.
```bash
firebase functions:config:set openai.key="sk-your-actual-secret-key-here"
```

**3. Verify the Key:**
To see what keys are currently set:
```bash
firebase functions:config:get
```

**4. Redeploy Functions:**
If you change a key, you must redeploy the functions for the change to take effect.
```bash
firebase deploy --only functions
```

---

## 3. Supported Keys & Services

### OpenAI (Hashtag Generation)
*   **Config Path:** `openai.key`
*   **Usage:** Used by `generateHashtags` Cloud Function to access GPT models.
*   **Rotation Policy:** Rotate if exposed or upon client handover.

### (Future) Stripe / Payment Keys
*   **Config Path:** `stripe.secret`, `stripe.publishable`
*   **Usage:** Subscription management.

---

## 4. troubleshooting

**Issue: "API Key is missing" error in Logs**
*   **Cause:** The function was deployed, but `functions:config:set` was not run for that specific project.
*   **Fix:** Run the set command (Section 2) and redeploy.

**Issue: "Error: internal" during Local Dev**
*   **Cause:** The `.runtimeconfig.json` file is missing or empty in the `functions/` folder.
*   **Fix:** Create the file manually with the JSON structure shown in Section 1.
