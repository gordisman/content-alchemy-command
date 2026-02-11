# 🏦 Infrastructure & Billing Strategy Guide

This guide helps you decide how to "package" Content Alchemy Command for your clients and how to handle the costs and data ownership.

---

## ⚖️ The Two Primary Models

### 1. The "SaaS" Model (Option A: Landlord)
**You (Gord) provide everything as a service.**

*   **Hosting & Data Location:** Everything is on your Google Cloud/Firebase account.
*   **Billing:** You pay the Google bill. You charge the client a flat monthly fee (e.g., $50/mo or $500/yr).
*   **Pros:**
    *   **Maximum Control:** You can update all your clients at once with one click.
    *   **Simplicity:** The client doesn't need to know what "Firebase" is.
    *   **Revenue:** You can build a "service margin" into your monthly fee.
*   **Cons:**
    *   **Financial Liability:** If a client goes "viral" and incurs high costs, you are on the hook first (though you should have "Usage Limits" set).
    *   **Data Perception:** Some corporate clients might feel "locked in" because you hold the data.

### 2. The "Enterprise" Model (Option B: Sub-Contractor)
**The client owns their own "digital house," and you are the manager.**

*   **Hosting & Data Location:** On the client's own Google Cloud/Firebase account.
*   **Billing:** The client's credit card is tied to the project.
*   **Pros:**
    *   **Zero Cost to You:** You never see a bill for their usage.
    *   **Client Comfort:** The client owns their data 100%. If you and the client part ways, they still have their app.
*   **Cons:**
    *   **Onboarding Friction:** You have to wait for them to set up their credit card and add you as an "Owner" before you can start.
    *   **Maintenance Overhead:** Updating their app might require extra permissions steps.

---

## 💰 The Economic Reality (How much does it cost?)
Firebase is uniquely cheap for starting out:
*   **Database (Firestore):** First 50,000 reads/day are FREE. (A single user will almost never hit this).
*   **Cloud Functions:** First 2,000,000 invocations/month are FREE.
*   **Hosting:** First 10GB of storage is FREE.

### 💳 Ongoing Cost Breakdown:
1.  **Lead AI Access (Antigravity/Gemini):** This is your primary "Variable" expense. It's your subscription to the Lead Architect (me).
2.  **Custom Domains:** If you want `app.clientname.com`, expect to pay **~$12-$20 per year** per client.
3.  **GitHub Actions:** 2,000 "Robot Minutes" FREE per month. We use only a few per push.
4.  **Firebase Overages:** Only kicks in at high volume. (e.g., $1 or $2/mo if a client becomes a power user).

**Commercial Reality:** Your "Support Fee" ($XX/month) will likely be 99% profit until you are managing a very large fleet of clients.

---

## 📝 Client Discovery Questionnaire
Ask these questions to determine which model to use:

1.  **IT Maturity:** "Do you have a dedicated IT person or a Google Cloud account for your business?"
    *   *No?* -> **Use Option A.**
2.  **Data Policy:** "Does your business require that all data be hosted on servers you exclusively control?"
    *   *Yes?* -> **Use Option B.**
3.  **Billing Preference:** "Do you prefer a single annual invoice from me, or would you rather pay your own server costs directly to Google?"
    *   *Annual Invoice?* -> **Use Option A.**

---

## 🏢 Responsibility & Maintenance Matrix

If a client chooses to "Own their House" (Option B), duties must be clearly defined.

| Task | Landlord (Option A) | Sub-Contractor (Option B) |
| :--- | :--- | :--- |
| **Server Billing** | Gord pays Google; bills client. | Client pays Google directly. |
| **Initial Project Setup** | Gord (Instant). | Client (Manual/Guided). |
| **Code Updates** | Gord (Automatic/Fleet-wide). | Gord (Requires project access). |
| **Troubleshooting** | Gord (24/7 access). | Gord (Acting as Client IT). |
| **Data Backups** | Managed by Gord. | Managed by Gord (using Client tools). |

### 🛠️ Acting as "External IT"
If the client provides you with their Google login (or adds your email as an **Owner** in Firebase), you can perform 100% of the technical work for them. They "Own" the asset, but you "Manage" the asset. This is the best of both worlds for high-security clients who don't want to get their hands dirty.

---

## 💎 Pricing Tier Logic

Your pricing should reflect the different levels of responsibility and friction:

### Tier 1: The Managed Service (Landlord)
*   **Target:** Solopreneurs & Small Teams.
*   **Pricing:** High Monthly/Annual Fee.
*   **Rationale:** "You pay me for the result. I handle all the plumbing, the hosting, and the maintenance. You just log in and create."

### Tier 2: The Managed Asset (Sub-Contractor)
*   **Target:** Agencies or Enterprise Clients.
*   **Pricing:** Lower Monthly Management Fee + Higher One-time Setup Fee.
*   **Rationale:** "You own the database and pay Google the raw costs ($0.05 - $5/mo). You pay me a management fee to be your 'Content Architect' and keep the system running. Since I have to work within *your* specific infrastructure, there is a higher one-time activation cost."

---

## 🛡️ Data Ownership Addendum
If a client uses **Option A** but later wants to "leave," you can promise them a **"Data Export"** (a JSON file of all their posts). This usually satisfies most small business owners' fears about data lock-in.
