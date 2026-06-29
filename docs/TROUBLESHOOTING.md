# Troubleshooting

Common issues and how to fix them.

---

## Installation

### Windows: Security warning on install

**Symptom:** Windows SmartScreen shows a blue warning when launching the installer.

**Cause:** Thred is a new application and hasn't built reputation with Microsoft yet.

**Fix:** Click "More info" → "Run anyway". The app is safe.

### App not launching

**Symptom:** Nothing happens when you try to open Thred.

**Fix:**
1. Try right-click → "Run as Administrator"
2. Check if another instance is already running (look in system tray)
3. Make sure you have Windows 10/11

---

## AI Models

### Webview shows "Connection Failed"

**Symptom:** You see a red cloud icon with "Connection Failed" and a "Try Again" button.

**Cause:** The AI service couldn't be reached — either your internet is down, the service is experiencing downtime, or a firewall is blocking the connection.

**Fix:**
1. Check your internet connection
2. Visit the AI service's status page to check for outages
3. Click "Try Again" to reload
4. If the issue persists, try a different AI model to confirm it's service-specific

### Session keeps logging out

**Symptom:** You log into an AI service, but it logs you out when you switch away and come back.

**Cause:** The AI service's session cookies may have expired, or the webview's session storage was cleared.

**Fix:**
1. Make sure your system clock is accurate (incorrect time breaks session cookies)
2. Log in again and wait a few seconds before switching AIs
3. If the issue persists, try restarting Thred

### Split view not working

**Symptom:** Pressing `Ctrl+\` doesn't show the split view menu.

**Cause:** You need to have an active AI selected first. Split view adds a second AI alongside the current one.

**Fix:** Open an AI first (e.g., `Alt+1` for ChatGPT), then press `Ctrl+\` to add a second AI in split view.

### Zoom level not applying

**Symptom:** You change the zoom, but the AI webview doesn't reflect it.

**Cause:** The webview may not have registered properly with the main process.

**Fix:**
1. Reload the webview (`Ctrl+R`)
2. Try changing zoom again via the logo menu → Zoom controls
3. If stuck, restart Thred

---

## Tools

### Notes not saving

**Symptom:** You type a note, close the tool, and your changes are lost.

**Cause:** Notes auto-save with a 500ms debounce. If you close the tool within 500ms of your last keystroke, the save may be cancelled.

**Fix:** Wait a moment after typing before closing the Notes tool. You can also manually save by clicking outside the editor to trigger the save.

### Whiteboard work lost after closing

**Symptom:** You draw on the whiteboard, close it, and your work is gone.

**Cause:** The whiteboard does not auto-save. You must explicitly save before closing.

**Fix:** Press `Ctrl+S` or click the Save button before closing the whiteboard. Saved whiteboards are accessible in Vault → Whiteboard tab.

### Pomodoro timer jumps or completes early

**Symptom:** Your focus session suddenly completes while you were away, or the timer jumps forward.

**Cause:** The timer is anchored to your system clock. If your computer goes to sleep and wakes up, the clock jumps forward and the timer completes immediately.

**Fix:** This is expected behavior — the timer tracks real elapsed time. If you need to pause, press `Space` before stepping away.

### Focus session history lost

**Symptom:** Your focus session streaks and history disappear.

**Cause:** Focus session records are stored in local browser storage, not in the Vault. Clearing app data or reinstalling will erase them.

**Fix:** Important focus summaries can be saved to Vault manually via the "Save Notes & Finish" button at the end of each session.

### Currency rates not updating

**Symptom:** The Converter tool shows old exchange rates.

**Cause:** Live rates are fetched from an external API. If the API is down or your internet is offline, the tool falls back to cached/hardcoded rates.

**Fix:**
1. Check your internet connection
2. Click the refresh button next to "Live Rate" in the Converter
3. If rates still don't update, the API may be temporarily down — try again later

---

## Vault

### Vault items disappearing

**Symptom:** Items you saved to the Vault are no longer visible.

**Cause:** A corrupt JSON file on disk can cause an item to be silently skipped during loading.

**Fix:**
1. Check your Thred data folder (Settings → System → Data Location)
2. Look in the relevant subfolder (Prompts, Responses, etc.) for `.json` files
3. If you find a corrupt file, delete it and the other items should load normally
4. Back up your Thred folder regularly to prevent data loss

### Can't favorite more than 4 items

**Symptom:** The favorite button doesn't work after favoriting 4 items.

**Cause:** There's a hard limit of 4 favorites per vault category.

**Fix:** Unfavorite an existing item first, then favorite the new one.

### Vault import deleted all my data

**Symptom:** After importing a vault export, all your existing items are gone.

**Cause:** Importing with "replace" mode deletes all existing vault items before importing.

**Fix:** Always use "merge" mode when importing unless you intentionally want to replace everything. Back up your Thred folder before importing.

---

## Screenshots

### Capture not working

**Symptom:** `Ctrl+Shift+S` or `Ctrl+Shift+X` doesn't capture anything.

**Cause:** There's no active AI webview to capture, or the webview hasn't fully loaded.

**Fix:**
1. Make sure you have an AI open and fully loaded
2. Try `Ctrl+Shift+S` (content capture) instead of `Ctrl+Shift+X` (workspace capture)
3. If using split view, make sure the correct AI panel is focused

### Blank screenshots

**Symptom:** Captured screenshots are empty or show only the background.

**Cause:** The webview may still be loading, or the AI service's content is rendered in a way that capture can't reach.

**Fix:** Wait for the AI to fully load before capturing. If the issue persists, try reloading the webview (`Ctrl+R`) and capturing again.

---

## Bookmarks

### Can't bookmark a chat

**Symptom:** `Ctrl+Shift+D` doesn't save the bookmark.

**Cause:** You may not have an active AI with a loaded page.

**Fix:**
1. Make sure an AI is open and has a conversation loaded
2. Press `Ctrl+Shift+D` to open the bookmark popover
3. Enter a name and click Save

### Sidebar bookmarks not appearing

**Symptom:** You marked a bookmark as "Sidebar" but it doesn't show in the left sidebar.

**Cause:** There's a limit of 5 sidebar bookmarks.

**Fix:** Remove an existing sidebar bookmark first (uncheck "Sidebar" in the bookmark edit popover), then add the new one.

### Pin limit reached

**Symptom:** You try to pin a bookmark and the button shakes but nothing happens.

**Cause:** There's a limit of 8 pinned bookmarks.

**Fix:** Unpin an existing bookmark first, then pin the new one.

---

## Keyboard Shortcuts

### Shortcuts not working

**Symptom:** Keyboard shortcuts like `Ctrl+K` or `Alt+1` don't do anything.

**Cause:** Another application may be intercepting the shortcut, or the Thred window isn't focused.

**Fix:**
1. Click on the Thred window to make sure it's focused
2. Check if another app (e.g., screen recording, clipboard manager) is capturing the same shortcuts
3. Try the action via the sidebar or logo menu instead

### Shortcut conflicts with other apps

**Thred shortcuts that commonly conflict:**
- `Ctrl+Shift+S` — may conflict with "Save As" in other apps
- `Ctrl+Shift+X` — may conflict with screenshot tools
- `Ctrl+\` — may conflict with terminal or text editors

**Fix:** Minimize conflicting apps while using Thred, or use the sidebar buttons as alternatives.

---

## Performance

### High memory usage on startup

**Symptom:** Thred uses 2-4 GB of RAM shortly after launching.

**Cause:** Thred preloads all 9 AI webviews in the background so switching between them is instant. Each webview is essentially a browser tab.

**Fix:**
1. Hide AI models you don't use (Settings → AI Models) to reduce preloaded webviews
2. Close and reopen Thred to clear cached webview memory
3. If memory is consistently high, consider using fewer simultaneous AI models

### Slow startup

**Symptom:** Thred takes a long time to open.

**Cause:** The app loads all AI webviews, vault items, and tool states on startup.

**Fix:**
1. Reduce the number of AI models if possible
2. Move your Thred data folder to an SSD if it's on an HDD
3. Close other resource-heavy applications

### UI lag or freezing

**Symptom:** The interface feels sluggish or unresponsive.

**Cause:** Too many tool windows open, or a webview is consuming resources.

**Fix:**
1. Close tool windows you're not using (click the X on each floating window)
2. Switch away from resource-heavy AI models (some use more memory than others)
3. Restart Thred if the issue persists

---

## Data & Settings

### Settings reverted to defaults

**Symptom:** Your preferences, AI order, or other settings are reset.

**Cause:** The settings file may have become corrupt (e.g., from a crash during write). Thred falls back to defaults when it can't read the file.

**Fix:**
1. Check your Thred data folder (Settings → System → Data Location)
2. Look for `settings.json.corrupt-*` backup files in `.system/Config/`
3. If found, rename the backup to `settings.json` to restore your settings
4. Back up your Thred folder regularly

### Onboarding showing again

**Symptom:** The welcome screen appears even though you've already set up Thred.

**Cause:** The settings file was deleted, moved, or became corrupt.

**Fix:**
1. Check if your Thred data folder still exists
2. If the folder was deleted, you'll need to complete onboarding again
3. Your vault data (if any) may still be in the folder — check before deleting

### Data location issues

**Symptom:** Thred can't find your data folder or shows errors when saving.

**Cause:** The Thred data folder was moved, renamed, or deleted externally.

**Fix:**
1. Go to Settings → System → Data Location
2. Click "Change" to select the correct folder
3. If the folder was deleted, Thred will create a new one

---

## AI Service Issues

### Google login not working

**Symptom:** You can't log into Google-based services (Gemini) using Google Sign-In.

**Cause:** Google's login flow uses WebAuthn/passkey detection that conflicts with Thred's security measures.

**Fix:** Use email or phone login instead of Google Sign-In. This is more reliable across all AI services in Thred.

### OAuth popup closes unexpectedly

**Symptom:** The login popup closes before you can complete authentication.

**Cause:** OAuth popups have a 20-second timeout. If authentication takes longer (slow network, MFA challenges), the popup is automatically closed.

**Fix:**
1. Have your 2FA code ready before starting the login flow
2. Use a fast internet connection during authentication
3. If the popup closes, try again — subsequent attempts may be faster due to cached credentials

---

## Known Issues

### Save to Vault shows wrong type

**Symptom:** When you save text from an AI chat, the vault save modal shows "Code" instead of "Response" (or vice versa).

**Cause:** Thred detects content type by analyzing the AI service's page structure. AI services frequently update their code, which can break detection.

**Fix:** Change the type dropdown in the save modal before clicking Save. The detection improves over time as Thred is updated.

### No auto-update

**Symptom:** Thred doesn't notify you about or install updates automatically.

**Cause:** Auto-update is not yet implemented. The setting exists in preferences but has no effect.

**Fix:** Check the GitHub releases page periodically for new versions, or follow Thred on social media for release announcements.

### WebAuthn/passkeys blocked

**Symptom:** You can't use passkeys or biometric authentication on AI sites.

**Cause:** Thred suppresses WebAuthn to prevent Windows Security popups during Google OAuth flows. This blocks all passkey usage.

**Fix:** Use traditional password-based login instead of passkeys.

---

## Still stuck?

If none of the above fixes work:

1. **Report a bug:** Press `Ctrl+Shift+I` in Thred, or go to Settings → About → Report Bug
2. **Check GitHub:** Visit the [GitHub repository](https://github.com/i-ayushsingh/thred) for known issues
3. **Restart Thred:** Close completely (right-click system tray → Quit) and reopen
4. **Nuclear option:** Delete your Thred data folder and start fresh (you'll lose all saved data)
