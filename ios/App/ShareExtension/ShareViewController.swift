//
//  ShareViewController.swift
//  ShareExtension
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
        // Make the view transparent — no UI shown
        view.backgroundColor = .clear
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
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
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            NSLog("[MyRecipeShare] CRITICAL: Could not open App Group UserDefaults (suite: %@)", appGroupID)
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
