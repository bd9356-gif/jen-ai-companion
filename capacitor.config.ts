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
};

export default config;
