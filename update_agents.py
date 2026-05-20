path = 'AGENTS.md'
with open(path, 'r') as f:
    content = f.read()

old = "## OAuth-in-Capacitor — the remaining blocker before TestFlight (May 19, 2026 — pending)"

new = """## OAuth-in-Capacitor — SOLVED (May 20, 2026)

**Status: WORKING on iPhone.** Google OAuth and Microsoft OAuth both work inside the Capacitor webview. Session persists across app launches. This is no longer a blocker.

**What was wrong and how it was fixed:**

1. **WebAuthPlugin.swift was missing from Xcode build target.**
   The file existed on disk but was never added to Xcode's App target. Symptom: `window.Capacitor.Plugins.WebAuth` returned undefined at runtime — "WebAuth plugin not available — Xcode rebuild needed?"
   Fix: Right-click App folder in Xcode → Add Files to "App" → select WebAuthPlugin.swift → check App target ONLY (not ShareExtension — UIApplication.shared is unavailable in extensions).

2. **Bad registration call removed.**
   An attempt to register via `CAPBridge.registerPlugin(WebAuthPlugin.self)` in AppDelegate.swift was added and then removed — Capacitor 6+ does not use this method.

3. **WebAuthPlugin added to packageClassList.**
   `ios/App/App/capacitor.config.json` → `packageClassList` array must include `"WebAuthPlugin"` alongside `"StatusBarPlugin"`. This is how Capacitor discovers local custom plugins.

4. **Supabase was returning implicit flow tokens, not PKCE codes.**
   The callback URL came back as `myrecipe://auth-callback#access_token=...` (hash fragment) instead of `?code=...`. The JS handler was only looking for `?code=` and throwing "No auth code in callback URL".
   Fix in `app/login/page.js`: check for `access_token` + `refresh_token` in the hash first, call `supabase.auth.setSession({ access_token, refresh_token })` directly. Fall back to `exchangeCodeForSession(code)` if a code is present instead.

**Files changed:**
- `ios/App/App/WebAuthPlugin.swift` — recreated (was deleted)
- `ios/App/App/capacitor.config.json` — added WebAuthPlugin to packageClassList
- `ios/App/App/AppDelegate.swift` — removed bad CAPBridge.registerPlugin line
- `app/login/page.js` — handle implicit flow tokens in signInWithProviderNative()

**Supabase config required:**
- `myrecipe://auth-callback` must be in Authentication → URL Configuration → Redirect URLs (already set)

**If this ever breaks again — checklist:**
1. Open Xcode, click WebAuthPlugin.swift, check right panel Target Membership — App must be checked, ShareExtension must NOT be checked
2. Check `ios/App/App/capacitor.config.json` has `"WebAuthPlugin"` in packageClassList
3. Clean build folder (Shift+Cmd+K) and rebuild
4. Check Xcode console for `[WebAuthPlugin] Plugin loaded` on app launch — if missing, file is not in build

## OAuth-in-Capacitor — the remaining blocker before TestFlight (May 19, 2026 — pending)"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('Done - AGENTS.md updated')
else:
    print('Pattern not found')
