# Hashtag Generation Feature - Implementation & SOP

## 1. Feature Overview
This feature provides AI-powered, platform-optimized hashtag recommendations directly within the Post Editor. It leverages the OpenAI API (GPT-3.5-turbo) to analyze post content and context, generating relevant tags to increase discoverability.

### Workflow:
1.  **Draft:** User writes Title and Body in the Content Tab.
2.  **Generate:** User clicks `✨ Generate Hashtags` in the "Generated Hashtags" field (Content Tab).
3.  **Refine:** AI populates the text area. User can manually edit or click `🔄` to Regenerate.
4.  **Adopt:** User copies (`📋`) the tags and pastes them into the main Body or First Comment field as desired.

---

## 2. Technical Architecture

### A. Backend (Cloud Functions)
*   **Function Name:** `generateHashtags`
*   **Trigger:** HTTPS Callable (called directly from React frontend).
*   **Logic:**
    *   Receives: `{ title, body, platform, pillar_name, pillar_description }`.
    *   Constructs a Prompt: *"Generate 30 hashtags for Instagram about [Title]..."* based on platform rules.
    *   Calls OpenAI API (`gpt-3.5-turbo`).
    *   Returns: A string of hashtags (e.g., `#AI #Tech #Innovation`).
*   **Security:** Uses `functions.config().openai.key` to store the API Key securely on the server. The key is NEVER exposed to the frontend client.

### B. Frontend (React)
*   **Component:** `PostEditorModal.jsx`
*   **State:** Added `generated_hashtags` string to `formData`.
*   **UI:**
    *   New Text Area in **Content Tab** (below CTA).
    *   "Generate" button (with loading state).
    *   "Copy" button.
*   **Schema:** Updated `post-schema.json` to include `generated_hashtags` (string, nullable).

---

## 3. Deployment & Setup SOP

### Prerequisite: OpenAI API Key
You must have a valid OpenAI API Key (`sk-...`). 
*   *For now:* Use Gord's key for all tenants.
*   *Future:* Can legally swap to Client's key per project without code changes.

### Step 1: Configure Environment (Local)
1.  Create/Edit `.env.local` (or `.env`) in the root directory.
2.  Add: `OPENAI_API_KEY=sk-your-actual-key-here`
3.  *Note:* The local emulator needs this to test functions locally.

### Step 2: Configure Environment (Production - Firebase)
**CRITICAL:** This step must be performed manually for **EACH** production environment (`cac-gord-prod`, `cac-prod-laurie`) before the feature will work. It is NOT automated.

See detailed instructions in: `system_docs/daily_ops/API_KEY_MANAGEMENT.md`

**Command to Set Key:**
```bash
firebase functions:config:set openai.key="sk-your-actual-key-here"
```

### Step 3: Deploy Backend
```bash
firebase deploy --only functions:generateHashtags
```

### Step 4: Verify
1.  Open the App (Prod).
2.  Open a Post.
3.  Click "Generate Hashtags".
4.  Success = Tags appear. Failure = Check Firebase Function Logs.

---

## 4. Platform Rules (AI Context)
The AI is instructed to follow these conventions:
*   **Instagram:** 30 tags (Mix of broad/niche).
*   **LinkedIn:** 3-5 tags (Professional, camelCase).
*   **TikTok:** 3-6 tags (Trending + Niche).
*   **X (Twitter):** 1-2 tags (Integrated into text style).
*   **Youtube:** 15 tags (Comma separated for SEO box).
*   **Facebook:** 3 tags (Broad topics).

---

## 5. Cost Estimation (Reference)
*   **Model:** `gpt-3.5-turbo`
*   **Avg Cost:** $0.00025 per generation.
*   **Usage:**
    *   **Light:** 40 posts/mo = **$0.01/mo**
    *   **Heavy:** 300 posts/mo = **$0.10/mo**
    *   **Agency:** 1,500 posts/mo = **$0.50/mo**
*   *Verdict:* Negligible. Safe to bundle into standard hosting fees.
