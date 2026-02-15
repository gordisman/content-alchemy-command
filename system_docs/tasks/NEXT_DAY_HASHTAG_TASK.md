# Next Day Task: Promote Hashtag Feature to Production

**Date:** 2026-02-14
**Status:** Ready for Deployment
**Feature:** AI Hashtag Generation

## Checklist for Tomorrow Morning

### 1. Pre-Flight Check (Local)
- [x] Code is clean (no hardcoded keys).
- [x] `firebase.js` is using standard connection logic.
- [x] Feature works in local emulator (Approved by Gord).

#### ✅ FINAL STATUS: COMPLETED (Feb 14, 2026)

- [x] **PHASE 1: Local & Security** (Verified Gord's production key using V1 stability)
- [x] **PHASE 2: Deploy Gord Prod** (Success after index.js consolidation)
- [x] **PHASE 3: Deploy Laurie Prod** (Success using switch-env scripts)

### 💡 Deployment Lessons Learned
- **Consolidation**: Moving all Cloud Functions into `index.js` solved "require" and "analysis" errors during Firebase deploy.
- **Protocol Stability**: Used `functions.region().https.onCall` (V1) to avoid permission/IAM issues common with V2/Cloud Run on existing projects.
- **Environment Management**: Verified `npm run env:[project]` is the reliable way to swap identities before building.

### 2. Deploy to Gord Prod (`cac-gord-prod`)
- [ ] Swtich Project:
  ```bash
  firebase use cac-gord-prod
  ```
- [ ] **CRITICAL:** Set API Key (One-Time Setup):
  ```bash
  firebase functions:config:set openai.key="sk-..." 
  ```
  *(See `system_docs/daily_ops/API_KEY_MANAGEMENT.md` for details)*
- [ ] Deploy Functions & Hosting:
  ```bash
  npm run build
  firebase deploy --only functions,hosting,firestore:rules
  ```
- [ ] Verify in Live App:
  - Generate Hashtags on a test post.

### 3. Deploy to Laurie Prod (`cac-prod-laurie`)
- [ ] Switch Project:
  ```bash
  firebase use cac-prod-laurie
  ```
- [ ] **CRITICAL:** Set API Key:
  ```bash
  firebase functions:config:set openai.key="sk-..." 
  ```
- [ ] Deploy:
  ```bash
  npm run build
  firebase deploy --only functions,hosting,firestore:rules
  ```
- [ ] Verify.

## Notes
- The "Internal Error" seen locally was due to Project ID mismatch in the emulator. This will NOT happen in production as long as `firebase use` is set correctly before deploy.
- API Keys are NOT deployed with the code. They must be set manually via the CLI command above.
