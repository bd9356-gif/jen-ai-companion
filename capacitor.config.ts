import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor configuration for the MyRecipe iOS wrap (May 2026).
//
// Live Reload mode: the iOS app's webview loads the production URL
// (recipe.mycompanionapps.com) instead of a bundled static export.
// Every Vercel deploy instantly updates what the iOS app shows — no
// App Store re-submission needed for content/UI changes. The native
// shell (icons, splash, native plugins, Share Extension) is the only
// thing that requires App Store re-submission going forward.
//
// `webDir` still needs to point at *something* so the CLI is happy;
// `public` works because it already exists. The actual content is
// served by `server.url` at runtime, not from this directory.
//
// `ios.contentInset: 'always'` makes the webview respect iOS safe-
// area insets (status bar, notch, home indicator) so app content
// doesn't sit underneath them.

const config: CapacitorConfig = {
  appId: 'com.mycompanionapps.recipe',
  appName: 'MyRecipe Companion',
  webDir: 'public',
  server: {
    url: 'https://recipe.mycompanionapps.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
  // Native plugin configuration. May 2026 — added StatusBar config so
  // the iOS status bar / Dynamic Island sits ABOVE the webview instead
  // of being overlaid on top of it. Fixes the "screen scrolls under
  // the notch" issue without needing safe-area-inset CSS gymnastics.
  // `overlaysWebView: false` is the key flag; `style: 'DEFAULT'` lets
  // iOS pick light/dark text based on the system appearance.
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DEFAULT',
    },
  },
};

export default config;
