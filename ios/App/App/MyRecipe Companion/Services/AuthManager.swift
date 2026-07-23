import Foundation
import Combine
import Supabase
import AuthenticationServices
import CommonCrypto
import RevenueCat

enum SubscriptionTier {
    case free, premium, pro

    var canImportUnlimited: Bool { self != .free }
    var canUseChefJenUnlimited: Bool { self == .pro }
    var chefJenMonthlyLimit: Int {
        switch self {
        case .free: return 2
        case .premium: return 5
        case .pro: return Int.max
        }
    }
    var importMonthlyLimit: Int {
        switch self {
        case .free: return 3
        case .premium, .pro: return Int.max
        }
    }
    var canUseAIPhotos: Bool { self != .free }
    var canUseRecipeBox: Bool { self != .free }
    var canUseKitchenHelpers: Bool { self != .free }
    var canUseSocialShare: Bool { self != .free }
}

class AuthManager: NSObject, ObservableObject {
    @Published var isLoggedIn = false
    @Published var isLoading = true
    @Published var user: User?
    @Published var pendingImportURL: String? = nil
    @Published var subscriptionTier: SubscriptionTier = .free
    @Published var isLoadingSubscription = true

    override init() {
        super.init()
        Task { await checkSession() }
        setupRevenueCatListener()
    }

    // MARK: - RevenueCat
    func setupRevenueCatListener() {
        // Listen for subscription updates
        Purchases.shared.delegate = self
    }

    func checkSubscription() async {
        do {
            let customerInfo: CustomerInfo
            if let userId = self.user?.id.uuidString {
                (customerInfo, _) = try await Purchases.shared.logIn(userId)
            } else {
                customerInfo = try await Purchases.shared.customerInfo()
            }
            let rcTier = tierFromCustomerInfo(customerInfo)
            let resolvedTier = await resolvedTier(rcTier: rcTier)
            await MainActor.run {
                self.subscriptionTier = resolvedTier
                self.isLoadingSubscription = false
            }
            print("📦 Subscription tier:", self.subscriptionTier)
        } catch {
            print("checkSubscription error:", error)
            await MainActor.run { self.isLoadingSubscription = false }
        }
    }

    // Read-only: resolves what tier to actually show, using the database
    // as a fallback when RevenueCat has no entitlement on file. Some users
    // get Pro/Premium granted directly in our database (web checkout,
    // TestFlight, manual grants) with no matching RevenueCat purchase —
    // RevenueCat saying "free" for them doesn't mean they lost access, it
    // just means RevenueCat never knew about it in the first place. This
    // never writes anything, so it's safe to call from anywhere.
    func resolvedTier(rcTier: SubscriptionTier) async -> SubscriptionTier {
        guard rcTier == .free, let user = self.user else { return rcTier }
        let row = await fetchSubscriptionRow(userId: user.id.uuidString)
        return tierFromString(row?.tier ?? "free")
    }

    struct SubscriptionRow {
        let tier: String
        let source: String
    }

    func fetchSubscriptionRow(userId: String) async -> SubscriptionRow? {
        let rows: [[String: String]] = (try? await supabase.from("user_subscriptions")
            .select("tier, source").eq("user_id", value: userId).execute().value) ?? []
        guard let row = rows.first, let tier = row["tier"] else { return nil }
        return SubscriptionRow(tier: tier, source: row["source"] ?? "unknown")
    }

    func tierFromCustomerInfo(_ customerInfo: CustomerInfo) -> SubscriptionTier {
        if customerInfo.entitlements["Pro"]?.isActive == true { return .pro }
        if customerInfo.entitlements["Premium"]?.isActive == true { return .premium }
        return .free
    }

    func tierFromString(_ tier: String) -> SubscriptionTier {
        switch tier.lowercased() {
        case "pro": return .pro
        case "premium": return .premium
        default: return .free
        }
    }

    // Called passively by the RevenueCat delegate whenever it pushes a
    // customer info update — NOT just after a real purchase.
    //
    // Upgrades (RC says Pro/Premium): always safe to sync — a real
    // purchase is happening, so we mark the row's source as 'revenuecat'
    // going forward.
    //
    // Downgrades (RC says free): only sync this down to the database if
    // the EXISTING row's source is already 'revenuecat' — meaning this
    // user's access was itself originally granted by a real purchase, so
    // RevenueCat genuinely is authoritative for it and a real
    // cancellation/expiration should take effect. If the existing source
    // is 'web', 'manual', or 'unknown' (legacy rows before this tracking
    // existed), we leave the database untouched — RevenueCat has no
    // visibility into those grants and must never silently erase them.
    func updateTier(from customerInfo: CustomerInfo) {
        let rcTier = tierFromCustomerInfo(customerInfo)
        Task {
            let resolved = await resolvedTier(rcTier: rcTier)
            await MainActor.run {
                self.subscriptionTier = resolved
                print("📦 Subscription tier (from RevenueCat push):", self.subscriptionTier)
            }

            guard let user = self.user else { return }

            if rcTier != .free {
                await syncTierToDatabase(tier: rcTier, source: "revenuecat")
            } else {
                let existing = await fetchSubscriptionRow(userId: user.id.uuidString)
                if existing?.source == "revenuecat" {
                    await syncTierToDatabase(tier: .free, source: "revenuecat")
                }
                // else: leave the database as-is, don't touch a
                // web/manual/unknown-sourced grant based on RC alone.
            }
        }
    }

    func syncTierToDatabase(tier: SubscriptionTier? = nil, source: String = "revenuecat") async {
        guard let user = self.user else { return }
        let resolvedTierValue = tier ?? subscriptionTier
        let tierString: String
        switch resolvedTierValue {
        case .pro: tierString = "pro"
        case .premium: tierString = "premium"
        case .free: tierString = "free"
        }
        do {
            try await supabase.from("user_subscriptions")
                .upsert(["user_id": user.id.uuidString, "tier": tierString, "source": source], onConflict: "user_id")
                .execute()
        } catch {
            print("❌ syncTierToDatabase failed:", error)
        }
    }

    // MARK: - Session
    @MainActor
    func checkSession() async {
        let task = Task {
            do {
                let session = try await supabase.auth.session
                await MainActor.run {
                    self.user = session.user
                    self.isLoggedIn = true
                    self.isLoading = false
                }
                await checkSubscription()
                await seedNewUserIfNeeded(userId: session.user.id)
            } catch {
                await MainActor.run {
                    self.isLoggedIn = false
                    self.isLoading = false
                    self.isLoadingSubscription = false
                }
            }
        }

        // Force timeout after 3 seconds
        try? await Task.sleep(nanoseconds: 3_000_000_000)
        if isLoading {
            task.cancel()
            self.isLoggedIn = false
            self.isLoading = false
            self.isLoadingSubscription = false
        }
    }

    @MainActor
    func signInWithApple() async {
        let nonce = randomNonceString()
        let hashedNonce = sha256(nonce)
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = hashedNonce

        let result = try? await withCheckedThrowingContinuation { continuation in
            let controller = ASAuthorizationController(authorizationRequests: [request])
            let delegate = AppleSignInDelegate(continuation: continuation)
            controller.delegate = delegate
            controller.presentationContextProvider = delegate
            controller.performRequests()
            objc_setAssociatedObject(controller, "delegate", delegate, .OBJC_ASSOCIATION_RETAIN)
        } as ASAuthorization

        guard let credential = result?.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let token = String(data: tokenData, encoding: .utf8) else { return }

        do {
            let session = try await supabase.auth.signInWithIdToken(
                credentials: OpenIDConnectCredentials(provider: .apple, idToken: token, nonce: nonce)
            )
            self.user = session.user
            self.isLoggedIn = true
            await checkSubscription()
            await seedNewUserIfNeeded(userId: session.user.id)
        } catch {
            print("Apple sign in error:", error)
        }
    }

    func seedNewUserIfNeeded(userId: UUID) async {
        // Use UserDefaults to avoid calling seed multiple times
        let key = "seeded_\(userId.uuidString)"
        guard !UserDefaults.standard.bool(forKey: key) else { return }
        do {
            try await supabase.rpc("seed_new_user", params: ["p_user_id": userId.uuidString]).execute()
            UserDefaults.standard.set(true, forKey: key)
            print("seedNewUserIfNeeded: seeded recipes for \(userId)")
        } catch {
            print("seedNewUserIfNeeded error:", error)
        }
    }

    @MainActor
    func signOut() async {
        try? await supabase.auth.signOut()
        self.isLoggedIn = false
        self.user = nil
        self.subscriptionTier = .free
    }

    private func randomNonceString(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length
        while remainingLength > 0 {
            let randoms: [UInt8] = (0..<16).map { _ in
                var random: UInt8 = 0
                _ = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
                return random
            }
            randoms.forEach { random in
                if remainingLength == 0 { return }
                if random < charset.count {
                    result.append(charset[Int(random)])
                    remainingLength -= 1
                }
            }
        }
        return result
    }

    private func sha256(_ input: String) -> String {
        let data = Data(input.utf8)
        var digest = [UInt8](repeating: 0, count: 32)
        data.withUnsafeBytes { _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &digest) }
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - RevenueCat Delegate
extension AuthManager: PurchasesDelegate {
    func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        Task { @MainActor in
            updateTier(from: customerInfo)
        }
    }
}
