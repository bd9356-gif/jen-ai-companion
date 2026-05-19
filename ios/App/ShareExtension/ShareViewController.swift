//
//  ShareViewController.swift
//  ShareExtension
//
//  Share Extension entry point (May 2026 — App Groups handoff).
//
//  When the user taps Share on a recipe page in Safari and picks
//  MyRecipe, this controller runs in iOS's share sheet sandbox.
//  It reads the shared URL, writes it to a shared App Group
//  UserDefaults under key `pendingImportURL`, and dismisses the
//  share sheet cleanly.
//
//  When the user next taps the MyRecipe app icon, the main app's
//  applicationDidBecomeActive: reads the pending URL from the same
//  App Group container and navigates the webview to the existing
//  smart-import flow at /secret?import=<URL>.
//
//  Why this design (vs. trying to open the app programmatically):
//    Apple locked down iOS 18+ Share Extensions from opening any URL
//    (custom scheme OR Universal Link) via extensionContext.open()
//    or the responder-chain openURL: trick. Both calls return
//    failure silently. The App Groups handoff is what every modern
//    iOS app does for this use case — costs one extra tap on the
//    app icon but works 100% reliably.
//
//  See AGENTS.md "iOS Share Extension" section for the full diagnostic
//  history including the Console.app logs that proved the open APIs
//  are dead.
//

import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    // App Group ID must match the entry in both targets' Associated
    // Domains / App Groups capability AND the registered group at
    // developer.apple.com. The "group." prefix is required by Apple.
    private let appGroupID = "group.com.mycompanionapps.recipe"
    private let pendingURLKey = "pendingImportURL"
    private let pendingTimestampKey = "pendingImportTimestamp"

    override func viewDidLoad() {
        super.viewDidLoad()
        extractURLAndStash()
    }

    private func extractURLAndStash() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let providers = item.attachments else {
            NSLog("[MyRecipeShare] No input items / attachments — dismissing")
            finish()
            return
        }

        let urlType = UTType.url.identifier
        for provider in providers where provider.hasItemConformingToTypeIdentifier(urlType) {
            provider.loadItem(forTypeIdentifier: urlType, options: nil) { [weak self] item, error in
                if let error = error {
                    NSLog("[MyRecipeShare] loadItem error: %@", error.localizedDescription)
                }
                guard let url = item as? URL else {
                    NSLog("[MyRecipeShare] Loaded item is not a URL")
                    self?.finish()
                    return
                }
                self?.stashURL(url)
                DispatchQueue.main.async {
                    self?.finish()
                }
            }
            return
        }

        NSLog("[MyRecipeShare] No URL-type attachment found")
        finish()
    }

    private func stashURL(_ url: URL) {
        // Write to the App Group's shared UserDefaults. The main app
        // reads this on applicationDidBecomeActive and clears it after
        // navigating the webview, so each share is consumed exactly once.
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            NSLog("[MyRecipeShare] CRITICAL: Could not open App Group UserDefaults (suite: %@). Is the App Groups capability set on the ShareExtension target?", appGroupID)
            return
        }
        defaults.set(url.absoluteString, forKey: pendingURLKey)
        defaults.set(Date().timeIntervalSince1970, forKey: pendingTimestampKey)
        NSLog("[MyRecipeShare] Stashed URL to App Group: %@", url.absoluteString)
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
