# Capacitor Setup Runbook — Recipe → iOS App

When you're ready to ship MyRecipe Companion to the App Store, follow this. The Next.js web app stays as-is; Capacitor just wraps it in a native iOS shell and gives you access to Apple-only capabilities (Share extension, native camera, push notifications, etc.).

Estimated time start to App Store submission: **2 weeks of focused work**, mostly waiting on App Review.

---

## Prerequisites

One-time setup, do these BEFORE running any commands:

- [ ] **Mac with macOS 13+** (you have this).
- [ ] **Xcode** from the Mac App Store. ~30GB download, ~1 hour install. Open it once after install so it extracts tools and you accept the license.
- [ ] **Xcode Command Line Tools.** After Xcode is installed, run in Terminal: `xcode-select --install` and click through.
- [ ] **CocoaPods** (iOS dependency manager): `sudo gem install cocoapods`. If your Ruby is too old, install via Homebrew instead: `brew install cocoapods`.
- [ ] **Apple Developer account** — $99/year. Sign up at https://developer.apple.com/programs/. Use the same Apple ID you sign into Xcode with. Approval is usually instant after payment.
- [ ] **Privacy Policy URL.** Required by App Store. Can be a simple page on `mycompanionapps.com/privacy`. Cover what data you collect (Supabase auth email, recipe content) and that you don't sell it.
- [ ] **App icon master** — 1024×1024 PNG, no transparency, no rounded corners (iOS rounds them automatically). The current stone-on-cream "R" works as a placeholder; consider a brand-final pass before submission.

---

## Stage 1 — Add Capacitor to the Next.js project

From `~/recipe-ai-companion`:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "MyRecipe Companion" com.mycompanionapps.recipe --web-dir=out
```

The `--web-dir=out` tells Capacitor where the static build output lives. We'll deal with that in Stage 2.

**Important:** the bundle ID `com.mycompanionapps.recipe` must be unique across the App Store. Once you submit with it, you can't change it. Pick deliberately.

---

## Stage 2 — Decide: Static export OR live URL

Two ways Capacitor can load your app:

### Option A — Bundle the app into the iOS binary (static export)
The web build gets baked into the `.ipa`. Pros: works offline, fast launch, no server dependency. Cons: every UI change requires a new App Store submission. Server-side routes (your `/api/...` endpoints) still hit Vercel.

To use this path, configure Next.js to support static export:

In `next.config.mjs`:
```js
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}
```

Then `npm run build` produces a `/out` directory. **Caveat:** static export means **no server-rendered routes**. Your `/api/*` routes still work because they live on Vercel — your app just calls them from the iOS WebView. But any page that depends on Next's server-side features (rare in your codebase, but check) needs to become client-side.

### Option B — Point Capacitor at the live Vercel URL
The iOS app is essentially a chrome-less browser pointed at `https://recipe.mycompanionapps.com`. Pros: every UI change you push to Vercel is live in the app instantly, no resubmission. Cons: requires internet on first launch, and Apple sometimes rejects "just a webview wrapper" apps.

To use this path, set `server.url` in `capacitor.config.ts`:
```ts
const config: CapacitorConfig = {
  appId: 'com.mycompanionapps.recipe',
  appName: 'MyRecipe Companion',
  webDir: 'out',
  server: {
    url: 'https://recipe.mycompanionapps.com',
    cleartext: false,
  },
};
```

**Recommendation: ship Option A first, the static export.** Apple is friendlier to bundled apps, you can pre-cache icons/fonts in the binary, and offline-first is genuinely better UX for a recipe app (you might be in a kitchen without wifi). Start there. If you hit a wall with the static-export constraints, switch to Option B before submission.

---

## Stage 3 — Add the iOS platform

```bash
npm run build      # produces /out
npx cap add ios    # creates /ios folder with the Xcode project
npx cap sync       # copies your /out into /ios/App/App/public
```

Whenever you change web code: rebuild and sync.

```bash
npm run build && npx cap sync
```

Or add a script to `package.json`:
```json
"scripts": {
  "ios": "next build && cap sync ios && cap open ios"
}
```

---

## Stage 4 — Add native plugins (do these one at a time)

The whole point of Capacitor is replacing your web-only workarounds with native iOS APIs. The plugins worth adding for MyRecipe:

### `@capacitor/share` — replace the iOS Shortcut hack
Native Share extension. Users can share a recipe URL from any other app (Safari, Mail, Messages) → "MyRecipe Companion" appears in the share sheet → app opens with the URL ready to import. Replaces your `Send to MyRecipe` Shortcut entirely.

```bash
npm install @capacitor/share
npx cap sync
```

The Share extension is configured in Xcode (an extra "App Extension" target). When the user taps share → MyRecipe, your app receives the URL via `App.addListener('appUrlOpen', handler)`. Wire that to the existing `/secret?import=<url>` deep-link flow.

### `@capacitor/camera` — native camera + photo library
Replaces `<input type="file">` and the clipboard-paste-image dance. Tap "Add a photo" → real iOS camera or photo library picker → photo lands in the recipe.

```bash
npm install @capacitor/camera
npx cap sync
```

Add usage strings to `ios/App/App/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Add a photo to your recipe.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Pick a photo from your library to add to a recipe.</string>
```

These strings appear in the iOS permission prompt. Apple rejects apps that use camera/photo APIs without explaining why in plain English.

### `@capacitor/clipboard` — better clipboard
Replaces `navigator.clipboard.read()` (which has been our headache for image paste). Capacitor's clipboard API works more reliably on iOS.

```bash
npm install @capacitor/clipboard
npx cap sync
```

### `@capacitor/app` — deep links and app-state
Listen for URLs the app was opened with (from Share extension, push notifications, universal links).

```bash
npm install @capacitor/app
npx cap sync
```

```js
import { App } from '@capacitor/app'

App.addListener('appUrlOpen', ({ url }) => {
  // Route the user to /secret?import=<url> or whatever
})
```

### `@capacitor/push-notifications` — native push
Real iOS push notifications. Requires APNs certificate setup in your Apple Developer account + Firebase Cloud Messaging or OneSignal as the delivery service.

```bash
npm install @capacitor/push-notifications
npx cap sync
```

Skip this for v1 unless you've identified a clear use ("Your meal plan is ready," "New recipe in your library"). It's a meaningful addition but not free; defer.

### `@capacitor/haptics` — button feedback
Tiny vibration when buttons are tapped. Optional polish; users feel it.

```bash
npm install @capacitor/haptics
```

---

## Stage 5 — Configure signing in Xcode

```bash
npx cap open ios
```

This opens the project in Xcode. In the navigator, click the project root → Signing & Capabilities tab.

- **Team:** select your Apple Developer team (the dropdown lists every team your Apple ID belongs to)
- **Bundle Identifier:** `com.mycompanionapps.recipe` (must match what you set in `cap init`)
- **Automatically manage signing:** checked. Xcode handles certificates and provisioning profiles for you.
- **App icons:** in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, replace the placeholders with your 1024x1024 master and the various sizes Apple wants. Use https://appicon.co/ to generate the full set from a single 1024 master.
- **Splash screen:** in `ios/App/App/Assets.xcassets/Splash.imageset/`. Same idea — generate the various sizes from a master.

---

## Stage 6 — Test on a real iPhone

```bash
npx cap open ios
```

In Xcode:
1. Plug in your iPhone via USB.
2. Top of Xcode, next to the Run button, select your iPhone from the device dropdown.
3. First time: iPhone might say "Untrusted Developer." On the iPhone, Settings → General → VPN & Device Management → trust your developer profile.
4. Click Run (▶). Xcode builds, installs, and launches the app on your phone.

You should see MyRecipe Companion run as a real app on your phone, with no Safari chrome. Test the same flows you've been testing in Safari + a few new ones (Share extension, camera, etc.).

---

## Stage 7 — App Store Connect

Go to https://appstoreconnect.apple.com.

Create a new app:
- **Platform:** iOS
- **Name:** MyRecipe Companion
- **Primary Language:** English (U.S.)
- **Bundle ID:** `com.mycompanionapps.recipe` (the dropdown should show what you registered in Stage 5)
- **SKU:** any unique string, e.g. `myrecipe-companion-001`
- **User Access:** Full Access

Fill in:
- **Description** (short and long versions)
- **Keywords** (100 chars max, comma-separated)
- **Support URL** — link to a contact page or even just `mailto:` works for indie apps
- **Privacy Policy URL** — required, no shortcut around this
- **Category** — Food & Drink → primary, Lifestyle → secondary
- **Screenshots** — 6.5" iPhone screenshots (5-10 of them). Use the iOS Simulator in Xcode + Cmd+S to grab perfectly-sized PNGs, then put them in App Store Connect. Annotate with text overlays in Figma/Pixelmator if you want.
- **App Preview** (optional video, skip for v1)
- **Pricing & Availability** — Free, all countries. Easy.
- **App Privacy** — declare what you collect. For MyRecipe: Email Address (linked to user, used for app functionality), User Content (recipes, notes — not linked to identity). Be honest; lying here is a fast rejection.

---

## Stage 8 — Submit for Review

In Xcode:
1. **Product → Archive** (you may need to switch the device dropdown to "Any iOS Device (arm64)" first)
2. Wait for archive build to complete (~5 min)
3. Organizer window opens automatically → **Distribute App** → **App Store Connect** → **Upload**
4. Once uploaded, it appears in App Store Connect under TestFlight (Beta) or as a build available for submission

In App Store Connect:
1. Pick the build you just uploaded
2. Add review notes if there's anything Apple should know (test account credentials are common)
3. Submit for Review

**Review timeline:** usually 24-72 hours. Sometimes faster, sometimes slower. You'll get an email when status changes.

**Common rejection reasons:**
- App crashes on first launch (usually a missing entitlement or unhandled error). Fix and resubmit.
- "Minimum functionality" rejection — Apple doesn't like apps that just wrap a website with no native value-add. **This is the biggest risk for Capacitor apps.** Mitigations: add the Share extension (real native behavior), camera plugin (real iOS UI), push notifications, haptics. The native plugins ARE the answer to this rejection — they prove your app is more than a webview wrapper.
- Missing usage strings in Info.plist (camera/photos/etc. without "why" text)
- Privacy policy doesn't match what the app actually does

If rejected, Apple gives a specific reason. Address it, archive a new build, resubmit. Subsequent reviews are usually faster.

---

## After approval

You're live. Updates flow the same way: code changes → archive → upload → submit. Each new version takes another review cycle, but they're usually fast for established apps.

Things to plan for after v1:
- **TestFlight** — invite up to 10,000 beta testers (you, friends, family) before public release. Configure in App Store Connect → TestFlight tab.
- **App Store Optimization (ASO)** — keywords, screenshots, description matter for organic discovery
- **Push notifications** — only after you have something genuinely useful to ping users about
- **In-app purchases / subscriptions** — if you ever monetize. Apple takes 15% of subscriptions in year 1 (rev <$1M), 30% beyond. Subscriptions need a separate Apple framework setup.

---

## Cost summary

| Item | Cost |
|---|---|
| Apple Developer Program | $99/year |
| Xcode | Free |
| Capacitor + plugins | Free |
| Your time | The biggest cost |
| Optional: app icon polish (Fiverr / freelance) | $30-150 |
| Optional: screenshot mockups | $0-100 |
| Optional: Push notification provider (OneSignal Free tier works) | $0 to start |

---

## What can stay the same vs change

**Stays exactly the same:**
- All your React/Next.js code in `app/`, `components/`, `lib/`
- Supabase database, auth, RLS policies
- Vercel deployment for `/api/*` routes
- Your Tailwind classes
- The mobile-first responsive layouts you built (they were practice for this)

**Changes or adds:**
- New `/ios` folder with Xcode project (don't edit by hand; let Capacitor regenerate it)
- `capacitor.config.ts` at repo root
- `Info.plist` usage strings for any permission-requesting plugin
- Splash screen + app icon assets
- `npx cap sync` becomes a step after every web build
- Some pages may swap web-paste/camera flows for native plugin equivalents

**Branch strategy:** keep all of this on `main` (no separate "ios" branch). The `/ios` folder is generated and gitignored beyond the project files, so it doesn't bloat the repo.

---

## When to start

Don't start until:
- The web app feels stable for 2-3 weeks of daily use
- You've stopped finding bugs that affect the core flow
- You have at least 5-10 testers using the PWA happily
- Privacy policy is written and hosted

When all four are true, allocate a focused 2-week window and run through this doc top-to-bottom.
