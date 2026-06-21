
import UIKit
import UniformTypeIdentifiers

@objc(ShareViewController)
class ShareViewController: UIViewController {

    private let appGroupID = "group.com.mycompanionapps.recipe"

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        extractURLAndProcess()
    }

    private func setupUI() {
        let blur = UIBlurEffect(style: .systemUltraThinMaterialDark)
        let blurView = UIVisualEffectView(effect: blur)
        blurView.frame = view.bounds
        blurView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(blurView)

        let card = UIView()
        card.backgroundColor = UIColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 0.92)
        card.layer.cornerRadius = 24
        card.translatesAutoresizingMaskIntoConstraints = false
        card.alpha = 0
        card.tag = 100
        view.addSubview(card)

        let emoji = UILabel()
        emoji.text = "👩‍🍳"
        emoji.font = UIFont.systemFont(ofSize: 52)
        emoji.textAlignment = .center
        emoji.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(emoji)

        let title = UILabel()
        title.text = "Saving Recipe..."
        title.textColor = .white
        title.font = UIFont.systemFont(ofSize: 20, weight: .bold)
        title.textAlignment = .center
        title.translatesAutoresizingMaskIntoConstraints = false
        title.tag = 101
        card.addSubview(title)

        let subtitle = UILabel()
        subtitle.text = "Chef Jennifer is on it"
        subtitle.textColor = UIColor.white.withAlphaComponent(0.65)
        subtitle.font = UIFont.systemFont(ofSize: 14)
        subtitle.textAlignment = .center
        subtitle.translatesAutoresizingMaskIntoConstraints = false
        subtitle.tag = 102
        card.addSubview(subtitle)

        let hint = UILabel()
        hint.text = ""
        hint.textColor = UIColor(red: 1.0, green: 0.6, blue: 0.2, alpha: 1.0)
        hint.font = UIFont.systemFont(ofSize: 13, weight: .medium)
        hint.textAlignment = .center
        hint.numberOfLines = 2
        hint.translatesAutoresizingMaskIntoConstraints = false
        hint.tag = 103
        card.addSubview(hint)

        NSLayoutConstraint.activate([
            card.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            card.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            card.widthAnchor.constraint(equalToConstant: 300),

            emoji.topAnchor.constraint(equalTo: card.topAnchor, constant: 28),
            emoji.centerXAnchor.constraint(equalTo: card.centerXAnchor),

            title.topAnchor.constraint(equalTo: emoji.bottomAnchor, constant: 12),
            title.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            title.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),

            subtitle.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 6),
            subtitle.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            subtitle.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),

            hint.topAnchor.constraint(equalTo: subtitle.bottomAnchor, constant: 16),
            hint.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            hint.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
            hint.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -28),
        ])

        card.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)
        UIView.animate(withDuration: 0.4, delay: 0, usingSpringWithDamping: 0.7, initialSpringVelocity: 0.5) {
            card.alpha = 1
            card.transform = .identity
        }
    }

    private func updateCard(title: String, subtitle: String, hint: String, emoji: String? = nil) {
        DispatchQueue.main.async {
            guard let card = self.view.viewWithTag(100) else { return }
            if let titleLabel = card.viewWithTag(101) as? UILabel { titleLabel.text = title }
            if let subtitleLabel = card.viewWithTag(102) as? UILabel { subtitleLabel.text = subtitle }
            if let hintLabel = card.viewWithTag(103) as? UILabel { hintLabel.text = hint }
        }
    }

    private func extractURLAndProcess() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let providers = item.attachments else {
            finish(withURL: nil); return
        }

        let urlType = UTType.url.identifier
        for provider in providers where provider.hasItemConformingToTypeIdentifier(urlType) {
            provider.loadItem(forTypeIdentifier: urlType, options: nil) { [weak self] item, _ in
                guard let self = self else { return }
                guard let url = item as? URL else { self.finish(withURL: nil); return }

                // Silently cancel if this is our own share URL
                if url.host?.contains("mycompanionapps.com") == true {
                    self.extensionContext?.cancelRequest(withError: NSError(domain: "com.mycompanionapps.recipe", code: 0))
                    return
                }

                let defaults = UserDefaults(suiteName: self.appGroupID)
                defaults?.set(url.absoluteString, forKey: "pendingImportURL")
                defaults?.removeObject(forKey: "pendingImportHTML")
                defaults?.synchronize()

                // Show success state
                self.updateCard(
                    title: "Recipe Saved! ✓",
                    subtitle: "Ready to import into your vault",
                    hint: "Open MyRecipe Companion\nto finish importing"
                )

                self.finish(withURL: url)
            }
            return
        }
        finish(withURL: nil)
    }

    private func finish(withURL url: URL?) {
        // Stay visible for 2.5 seconds so user can read the message
        DispatchQueue.main.asyncAfter(deadline: .now() + 4.0) {
            // Fade out card
            UIView.animate(withDuration: 0.3) {
                self.view.viewWithTag(100)?.alpha = 0
            }
            self.extensionContext?.completeRequest(returningItems: nil) { _ in
                guard url != nil else { return }
                // Attempt to open app — works on some iOS versions
                let selector = NSSelectorFromString("openURL:")
                var responder: UIResponder? = self
                while responder != nil {
                    if responder?.responds(to: selector) == true {
                        responder?.perform(selector, with: URL(string: "com.mycompanionapps.recipe://import"))
                        break
                    }
                    responder = responder?.next
                }
            }
        }
    }
}
