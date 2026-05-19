//
//  ShareViewController.swift
//  ShareExtension
//
//  Share Extension entry point (May 2026 — Universal Links rewrite).
//
//  When the user taps Share on a recipe page in Safari and picks
//  MyRecipe, this controller runs in iOS's share sheet sandbox.
//  It reads the shared URL and asks iOS to open a Universal Link
//  back to our domain — recipe.mycompanionapps.com/secret?import=<URL>.
//
//  iOS sees the https:// URL matches our Associated Domains entry
//  (applinks:recipe.mycompanionapps.com) and routes the open call
//  to the installed MyRecipe app instead of Safari. The main app's
//  continue(userActivity:) handler then forwards to the existing
//  smart-import flow at /secret?import=<URL>.
//
//  Why Universal Links instead of the old myrecipe:// custom scheme:
//    - iOS 18+ tightened restrictions on Share Extensions opening
//      custom URL schemes via the responder-chain openURL: trick.
//      The call would fire but iOS silently refused to hand off,
//      resulting in a "flash" with no app launch.
//    - Universal Links are Apple's blessed routing mechanism. They
//      don't suffer the same restrictions because iOS treats them
//      as legitimate web URLs that happen to have an app claim.
//    - Bonus: when AASA validation fails or the app isn't installed,
//      Safari opens the https URL — the same /secret?import flow runs
//      in the browser, so there's a graceful fallback.
//
//  Why we don't do the import here:
//    - Share Extensions have a hard 120 MB memory limit and can't
//      make authenticated API calls (no Supabase session).
//    - The main app already has the user's session + UI for review.
//      So we just deliver the URL and let the main app finish.
//

import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    // Hardcoded so the extension doesn't need to read its own Info.plist.
    // Keeps the routing domain in one obvious place.
    private let universalLinkHost = "recipe.mycompanionapps.com"

    override func viewDidLoad() {
        super.viewDidLoad()
        // We immediately read the URL and bounce — no UI for the
        // user to interact with. The share sheet dismisses itself
        // as soon as we complete the request.
        extractURLAndOpenMainApp()
    }

    private func extractURLAndOpenMainApp() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let providers = item.attachments else {
            finish()
            return
        }

        // Look for a URL attachment among what Safari sent us.
        let urlType = UTType.url.identifier
        for provider in providers where provider.hasItemConformingToTypeIdentifier(urlType) {
            provider.loadItem(forTypeIdentifier: urlType, options: nil) { [weak self] item, _ in
                guard let url = item as? URL else {
                    self?.finish()
                    return
                }
                DispatchQueue.main.async {
                    self?.openMainApp(with: url)
                }
            }
            return
        }

        // No URL found — just dismiss.
        finish()
    }

    private func openMainApp(with sharedURL: URL) {
        // Build the Universal Link: https://recipe.mycompanionapps.com/secret?import=<encoded-url>
        // The AASA file at /.well-known/apple-app-site-association claims
        // this path pattern, so iOS routes the open to the MyRecipe app
        // when it's installed.
        var components = URLComponents()
        components.scheme = "https"
        components.host = universalLinkHost
        components.path = "/secret"
        components.queryItems = [
            URLQueryItem(name: "import", value: sharedURL.absoluteString)
        ]

        guard let deepLink = components.url else {
            finish()
            return
        }

        // Order matters: completeRequest FIRST so iOS starts dismissing
        // the share sheet cleanly, then attempt the open in the callback.
        // Doing it open-then-finish would race iOS's dismissal animation
        // and on iOS 18+ tends to abort the URL open mid-flight.
        extensionContext?.completeRequest(returningItems: nil) { [weak self] _ in
            guard let self = self else { return }
            // Walk the responder chain to find the application instance
            // even from inside the sandboxed share-extension context, then
            // call openURL: on it. With Universal Links (https://), this
            // is the Apple-blessed handoff — iOS doesn't silently block
            // it the way it does for custom URL schemes on iOS 18+.
            var responder: UIResponder? = self
            while responder != nil {
                if let application = responder as? UIApplication {
                    let selector = NSSelectorFromString("openURL:")
                    if application.responds(to: selector) {
                        _ = application.perform(selector, with: deepLink)
                    }
                    break
                }
                responder = responder?.next
            }
        }
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
