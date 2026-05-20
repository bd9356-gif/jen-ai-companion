//
//  ShareViewController.swift
//  ShareExtension
//
//  Grabs the current page URL + full HTML via Action.js preprocessing,
//  writes URL\n\nHTML to the system clipboard (same format the iOS
//  Shortcut uses), stashes the URL in the App Group for the app to
//  read on launch, then dismisses cleanly.
//
//  When the main app opens it checks for ?smart_import=1 behavior:
//  reads the clipboard, finds URL\n\nHTML, POSTs both to
//  /api/import-recipe. Server tries the URL fetch first (A-sites),
//  falls back to the supplied HTML (B-sites that block scrapers).
//  User never sees the difference.
//

import UIKit
import MobileCoreServices
import UniformTypeIdentifiers

@objc(ShareViewController)
class ShareViewController: UIViewController {

    private let appGroupID = "group.com.mycompanionapps.recipe"
    private let pendingURLKey = "pendingImportURL"
    private let pendingTimestampKey = "pendingImportTimestamp"

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        extractAndStash()
    }

    private func extractAndStash() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let providers = item.attachments else {
            NSLog("[MyRecipeShare] No input items / attachments — dismissing")
            finish()
            return
        }

        let propertyListType = UTType.propertyList.identifier
        let urlType = UTType.url.identifier

        for provider in providers {
            // Try JS result first (has both URL and HTML)
            if provider.hasItemConformingToTypeIdentifier(propertyListType) {
                provider.loadItem(forTypeIdentifier: propertyListType, options: nil) { [weak self] item, error in
                    if let dict = item as? [String: Any],
                       let urlString = dict["url"] as? String,
                       let html = dict["html"] as? String,
                       let url = URL(string: urlString) {
                        NSLog("[MyRecipeShare] Got URL + HTML from JS preprocessing")
                        self?.stashURL(url)
                        self?.writeToClipboard(urlString: urlString, html: html)
                    } else {
                        NSLog("[MyRecipeShare] JS result missing url/html — falling back")
                    }
                    DispatchQueue.main.async { self?.finish() }
                }
                return
            }

            // Fallback: URL only
            if provider.hasItemConformingToTypeIdentifier(urlType) {
                provider.loadItem(forTypeIdentifier: urlType, options: nil) { [weak self] item, error in
                    if let url = item as? URL {
                        NSLog("[MyRecipeShare] Got URL only (no HTML)")
                        self?.stashURL(url)
                        UIPasteboard.general.string = url.absoluteString
                    }
                    DispatchQueue.main.async { self?.finish() }
                }
                return
            }
        }

        NSLog("[MyRecipeShare] No usable attachment found")
        finish()
    }

    private func stashURL(_ url: URL) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            NSLog("[MyRecipeShare] CRITICAL: Could not open App Group UserDefaults (suite: %@)", appGroupID)
            return
        }
        defaults.set(url.absoluteString, forKey: pendingURLKey)
        defaults.set(Date().timeIntervalSince1970, forKey: pendingTimestampKey)
        NSLog("[MyRecipeShare] Stashed URL: %@", url.absoluteString)
    }

    private func writeToClipboard(urlString: String, html: String) {
        let payload = "\(urlString)\n\n\(html)"
        UIPasteboard.general.string = payload
        NSLog("[MyRecipeShare] Wrote URL+HTML to clipboard (%d chars)", payload.count)
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
