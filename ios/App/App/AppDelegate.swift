import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // Hardcoded so we only treat our own domain as a Universal Link
    // target — random https URLs that happen to drift into the
    // continueUserActivity handler shouldn't be coerced into imports.
    private let universalLinkHost = "recipe.mycompanionapps.com"

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
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
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
        // QR code, third-party app) opens an https URL on our domain
        // that matches the AASA file's components, iOS routes it here.
        // We intercept the import patterns and forward to the existing
        // smart-import flow in the webview.
        //
        // Patterns we own:
        //   https://recipe.mycompanionapps.com/secret?import=<encoded>
        //   https://recipe.mycompanionapps.com/import?url=<encoded>
        //   https://recipe.mycompanionapps.com/import?u=<encoded>
        //
        // Anything else falls through to Capacitor's default proxy so
        // existing Universal Link handling on plugins still works.
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let webpageURL = userActivity.webpageURL,
           webpageURL.host == universalLinkHost {

            let path = webpageURL.path
            let components = URLComponents(url: webpageURL, resolvingAgainstBaseURL: false)
            let queryItems = components?.queryItems ?? []

            // /secret?import=<URL> — the Share Extension's drop-off.
            if path == "/secret",
               let importValue = queryItems.first(where: { $0.name == "import" })?.value,
               !importValue.isEmpty {
                navigateToImport(sharedURL: importValue)
                return true
            }

            // /import?url=<URL> or /import?u=<URL> — the short alias
            // used by the iOS Shortcut "Send to MyRecipe" path. The
            // /import route on the web already redirects to
            // /secret?import=…, so funnel them through the same JS
            // navigation we use for /secret.
            if path == "/import" || path.hasPrefix("/import") {
                let raw = queryItems.first(where: { $0.name == "url" })?.value
                    ?? queryItems.first(where: { $0.name == "u" })?.value
                if let urlValue = raw, !urlValue.isEmpty {
                    navigateToImport(sharedURL: urlValue)
                    return true
                }
            }
        }

        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
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
