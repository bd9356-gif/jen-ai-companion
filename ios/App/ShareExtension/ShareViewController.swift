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
        // Blurred background
        let blur = UIBlurEffect(style: .systemUltraThinMaterialDark)
        let blurView = UIVisualEffectView(effect: blur)
        blurView.frame = view.bounds
        blurView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(blurView)

        // Card container
        let card = UIView()
        card.backgroundColor = UIColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 0.85)
        card.layer.cornerRadius = 24
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.4
        card.layer.shadowRadius = 20
        card.translatesAutoresizingMaskIntoConstraints = false
        card.alpha = 0
        view.addSubview(card)

        // Chef hat emoji
        let emoji = UILabel()
        emoji.text = "👩‍🍳"
        emoji.font = UIFont.systemFont(ofSize: 52)
        emoji.textAlignment = .center
        emoji.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(emoji)

        // Title
        let title = UILabel()
        title.text = "Recipe Saved!"
        title.textColor = .white
        title.font = UIFont.systemFont(ofSize: 22, weight: .bold)
        title.textAlignment = .center
        title.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(title)

        // Subtitle
        let subtitle = UILabel()
        subtitle.text = "Open MyRecipe Companion\nto review and save"
        subtitle.textColor = UIColor.white.withAlphaComponent(0.7)
        subtitle.font = UIFont.systemFont(ofSize: 15, weight: .regular)
        subtitle.numberOfLines = 2
        subtitle.textAlignment = .center
        subtitle.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(subtitle)

        NSLayoutConstraint.activate([
            card.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            card.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            card.widthAnchor.constraint(equalToConstant: 280),

            emoji.topAnchor.constraint(equalTo: card.topAnchor, constant: 28),
            emoji.centerXAnchor.constraint(equalTo: card.centerXAnchor),

            title.topAnchor.constraint(equalTo: emoji.bottomAnchor, constant: 12),
            title.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            title.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),

            subtitle.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 8),
            subtitle.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            subtitle.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
            subtitle.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -28),
        ])

        // Animate in
        UIView.animate(withDuration: 0.4, delay: 0, usingSpringWithDamping: 0.7, initialSpringVelocity: 0.5) {
            card.alpha = 1
            card.transform = CGAffineTransform(scaleX: 1.0, y: 1.0)
        }
        card.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)
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
        // Wait 2.5 seconds so user can read the card, then dismiss
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            self.extensionContext?.completeRequest(returningItems: nil) { _ in
                let url = URL(string: "myrecipe://import")!
                _ = self.extensionContext?.open(url, completionHandler: nil)
            }
        }
    }
}
