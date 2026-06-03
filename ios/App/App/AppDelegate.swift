import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // Hardcoded so we only treat our own domain as a Universal Link
    // target — random https URLs that happen to drift into the
    // continueUserActivity handler shouldn't be coerced into imports.
    private let universalLinkHost = "recipe.mycompanionapps.com"

    // App Group shared with the ShareExtension target. The extension
    // writes the shared URL here; we read it on applicationDidBecomeActive.
    // Must match the group ID configured in:
    //   - developer.apple.com → Identifiers → App Groups
    //   - App target → Signing & Capabilities → App Groups
    //   - ShareExtension target → Signing & Capabilities → App Groups
    private let appGroupID = "group.com.mycompanionapps.recipe"
    private let pendingURLKey = "pendingImportURL"
    private let pendingTimestampKey = "pendingImportTimestamp"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Share Extension handoff (May 2026 — App Groups path).
        //
        // The Share Extension wrote the most recently shared URL to the
        // App Group's shared UserDefaults. Check for it here, navigate
        // the webview to the smart-import flow, and clear the entry so
        // each share is consumed exactly once.
        //
        // Why applicationDidBecomeActive (instead of didFinishLaunching):
        // fires reliably on BOTH cold launch and warm foreground, so it
        // catches "user shared while app was in background" without
        // needing a second handler. The 500ms delay below covers the
        // brief window after cold launch where the Capacitor webview
        // exists but hasn't loaded the initial page yet — too early and
        // the JS eval would land on a half-loaded webview.
        checkPendingImportURL()
    }

    private func checkPendingImportURL() {
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            NSLog("[MyRecipe] Could not open App Group UserDefaults (suite: %@). Is the App Groups capability set on the App target?", appGroupID)
            return
        }
        guard let pendingURL = defaults.string(forKey: pendingURLKey), !pendingURL.isEmpty else {
            // No pending share — normal case on most app launches.
            return
        }

        NSLog("[MyRecipe] Found pending import URL: %@", pendingURL)

        // Clear immediately so we don't loop forever if the navigation
        // fails for any reason (better to miss one share than to keep
        // firing the same import every time the user returns to the app).
        defaults.removeObject(forKey: pendingURLKey)
        defaults.removeObject(forKey: pendingTimestampKey)

        // Small delay so the Capacitor webview has time to be ready on
        // cold launch. On warm foreground the webview is already loaded
        // so this is just a brief no-op pause.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.navigateToImport(sharedURL: pendingURL)
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Legacy custom-scheme handler (May 2026).
        //
        // The Share Extension now uses Universal Links (https://) — see
        // `continue userActivity:` below. This `myrecipe://` handler is
        // kept as a fallback in case any old iOS Shortcut paths still
        // build the custom-scheme URL, and so testers who manually type
        // "myrecipe://import?url=..." in Safari still land in the app.
        if url.scheme == "myrecipe", url.host == "import" {
            let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
            if let sharedURL = components?.queryItems?.first(where: { $0.name == "url" })?.value,
               !sharedURL.isEmpty {
                navigateToImport(sharedURL: sharedURL)
                return true
            }
        }
        // Default Capacitor handling for any other URL.
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Universal Links handoff (May 2026).
        //
        // When the Share Extension (or any other source — text message,
        // QR code, third-party app, Mail tap on a magic-link email)
        // opens an https URL on our domain that matches the AASA file's
        // components, iOS routes it here.
        //
        // Generic policy: any URL on our domain → navigate the Capacitor
        // webview to that exact path+query. Specific cases:
        //   /secret?import=…       → Share Extension / iOS Shortcut handoff
        //   /import?url=… or ?u=…  → short import entry (server-redirects to /secret?import=)
        //   /auth/callback?code=…  → magic-link sign-in callback (Mail tap)
        //   /auth/confirm?…        → auth confirmation step
        //   anything else on our   → just preserve path+query and let the webview load it
        //   domain
        //
        // Anything off our domain falls through to Capacitor's default
        // proxy so existing Universal Link handling on plugins still works.
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let webpageURL = userActivity.webpageURL,
           webpageURL.host == universalLinkHost {

            NSLog("[MyRecipe] Universal Link received: %@", webpageURL.absoluteString)
            navigateWebView(to: webpageURL)
            return true
        }

        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // Navigate the Capacitor webview to the path+query of a Universal Link
    // we own. Keeps the cookie jar consistent (the cookies set during the
    // /auth/callback exchange land in the same jar that's serving /secret)
    // because everything happens inside the one Capacitor WKWebView.
    private func navigateWebView(to webpageURL: URL) {
        var target = webpageURL.path
        if let query = webpageURL.query, !query.isEmpty {
            target += "?" + query
        }
        if target.isEmpty { target = "/" }
        let safe = target.replacingOccurrences(of: "'", with: "%27")
        let js = "window.location.href = '\(safe)'"
        DispatchQueue.main.async { [weak self] in
            guard let rootVC = self?.window?.rootViewController as? CAPBridgeViewController,
                  let webView = rootVC.webView else {
                NSLog("[MyRecipe] webView not ready when navigating Universal Link")
                return
            }
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    // Navigate the Capacitor webview to /secret?import=<URL>. Uses a
    // small JS eval rather than webView.load() so it goes through the
    // same client-side router the rest of the app uses (preserves
    // Supabase session cookies, doesn't reload the whole webview).
    private func navigateToImport(sharedURL: String) {
        guard let encoded = sharedURL.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else { return }
        let target = "/secret?import=\(encoded)"
        // Escape any single quotes in the URL just in case (shouldn't
        // happen with percent-encoding, but defense in depth).
        let safe = target.replacingOccurrences(of: "'", with: "%27")
        let js = "window.location.href = '\(safe)'"
        DispatchQueue.main.async { [weak self] in
            guard let rootVC = self?.window?.rootViewController as? CAPBridgeViewController,
                  let webView = rootVC.webView else { return }
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

}
