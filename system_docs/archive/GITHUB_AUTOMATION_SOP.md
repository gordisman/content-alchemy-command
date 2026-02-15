# 🤖 GitHub Automation & Scaling SOP

This guide explains how to manage your automated deployment pipeline and how to "onboard" a new client into the automated world.

---

## 🛠️ How it Works
When you push code to GitHub (specifically the `main` branch), GitHub starts a "Robot" (Action) that:
1.  Downloads your code.
2.  Installs your dependencies (`npm ci`).
3.  Builds the project (`npm run build`).
4.  Deploys it to Firebase using a **Service Account Secret**.

---

## 🚀 Adding a New Client to the Pipeline
Follow these 4 steps to start "Spawning" deployments for a new client:

### 1. Generate the Client's Secret
1.  Open the **Client's Firebase Console** project.
2.  Go to **Project Settings** -> **Service accounts**.
3.  Click **"Generate new private key"** and download the JSON.

### 2. Store the Secret in GitHub
1.  Go to your GitHub Repo -> **Settings** -> **Secrets and variables** -> **Actions**.
2.  Create a **New repository secret**.
3.  **Name:** `FIREBASE_SERVICE_ACCOUNT_CAC_PROD_[CLIENTNAME]`
4.  **Value:** Paste the entire JSON content.

### 3. Update the "Brain" (.github/workflows/deploy.yml)
Open your `deploy.yml` file and add the client to the `matrix` section:
```yaml
strategy:
  matrix:
    include:
      - project_id: cac-prod-gord
        secret_name: FIREBASE_SERVICE_ACCOUNT_CAC_PROD_GORD
      - project_id: cac-prod-client-abc   # <--- Add this
        secret_name: FIREBASE_SERVICE_ACCOUNT_CAC_PROD_CLIENT_ABC # <--- Add this
```

### 4. Commit and Push
```powershell
git add .
git commit -m "feat: added client-abc to deployment pipeline"
git push origin main
```
*GitHub will now automatically deploy the code to BOTH your project and the client's project simultaneously.*

---

## 🕵️ How to Monitor Deployments
1.  Go to your GitHub Repository.
2.  Click the **"Actions"** tab at the top.
3.  You will see a list of runs. Click on the latest one to see the "Robot" working in real-time. If it turns **Green**, the site is live!
