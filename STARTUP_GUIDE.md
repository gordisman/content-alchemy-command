# Daily Development Startup Routine

Since this is a development environment, the application does not run automatically in the background like a finished installed program. You need to start the "server" each time you want to work on it.

## The 3-Step Startup Checklist

1.  **Open Antigravity** (You are here).
2.  **Open the Integrated Terminal**:
    *   Press `Ctrl + ~` (tilde) OR go to *Terminal > New Terminal*.
3.  **Start the App**:
    *   Type: `npm run dev:all`
    *   Press `Enter`.

> [!NOTE]
> `npm run dev:all` now automatically checks for new data backups and restores them before starting. You don't have to worry about missing data if you use this command!

## How do I know it's working?
You will see success messages for both the **Emulators** and **Vite**:

```
  VITE v5.x.x  ready in 350 ms
  ➜  Local:   http://localhost:5173/

  ┌─────────────────────────────────────────────────────────────┐
  │ Emulator UI  │ http://127.0.0.1:4000                        │
  └─────────────────────────────────────────────────────────────┘
```

Once you see the **Green Local URL**, your app is alive!

## 🌙 End-of-Day Safety (Crucial!)
To ensure your work is saved exactly where it needs to be:

1. **Explicit Save**: Before closing, open a **second terminal** and run:
   *   `npm run save`
2. **Shutdown**: Go back to the first terminal and press `Ctrl + C` **once**.
3. **Ignore Ghost Folders**: If you see new `firebase-export-XXXXXXXX` folders appear, don't worry. The next time you run `npm run dev:all`, they will be automatically merged back into your project.

## 🚑 Emergency Data Recovery
If `npm run dev:all` fails to find your data:
1. Run `npm run finalize` in the terminal.
2. This manually triggers the data restoration logic.
3. Restart with `npm run dev:all`.

