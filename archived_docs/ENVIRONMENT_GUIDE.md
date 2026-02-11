# How to Switch Environments (Easy Mode)

I have created custom scripts so you don't have to rename files manually.

### To work on PROD (Gord Prod)
Run this command in your terminal:
`npm run env:prod`

*   **What it does:** Copies your `Gord` keys into the active slot.
*   **Verify:** The app will behave like a fresh system (empty data).

### To work on DEV (Original)
Run this command in your terminal:
`npm run env:dev`

*   **What it does:** Removes the override file, falling back to your original Dev keys.
*   **Verify:** You will see all your old test data.

> **⚠️ Important:** After switching, you usually need to **Stop (Ctrl+C)** and **Restart (`npm run dev`)** your server for it to pick up the change.

## Architecture: One Codebase, Many Clients
You might be wondering: *"How do I manage code differences between clients?"*

**Answer: You don't.**
We are building a **Single Multi-Tenant App code**.
*   The Code (`src/`) is the **Factory**.
*   The `.env` file is the **Key**.

When you change the code (e.g., make the buttons blue), **EVERYONE** (Dev, Gord, Coca-Cola) gets blue buttons the next time you deploy to them.

**To Deployment:**
1.  **Test in Dev** (`env:dev`). Make sure the blue buttons work.
2.  **Switch to Prod** (`env:prod`). Verify the blue buttons look good with real data.
3.  **Deploy** (Future Step). This pushes the "Blue Button Code" to the internet for that specific client.
