import SwiftUI
import RevenueCat

struct PaywallView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.horizontalSizeClass) var sizeClass
    @EnvironmentObject var authManager: AuthManager
    @State private var offerings: Offerings? = nil
    @State private var isLoading = true
    @State private var isPurchasing = false
    @State private var isRestoring = false
    @State private var selectedTier: String = "premium"
    @State private var errorMessage = ""

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {

                    // ── Hero ──
                    ZStack {
                        LinearGradient(
                            colors: [Color(red: 0.78, green: 0.25, blue: 0.10), Color.orange.opacity(0.8)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                        VStack(spacing: 10) {
                            Text("👩‍🍳")
                                .font(.system(size: 64))
                                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                            Text("Unlock Your Full Kitchen")
                                .font(.title2).fontWeight(.bold).foregroundColor(.white)
                            Text("Everything Chef Jen has to offer")
                                .font(.subheadline).foregroundColor(.white.opacity(0.85))
                        }
                        .padding(.vertical, 32)
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 20) {

                        // ── Plan selector ──
                        VStack(spacing: 10) {
                            Text("Choose your plan")
                                .font(.headline).padding(.top, 4)

                            HStack(spacing: 10) {
                                TierPill(
                                    label: "Premium",
                                    price: "$34.99/yr",
                                    subprice: "Just $2.92/mo",
                                    badge: nil,
                                    isSelected: selectedTier == "premium",
                                    color: .orange
                                ) { selectedTier = "premium" }

                                TierPill(
                                    label: "Pro",
                                    price: "$49.99/yr",
                                    subprice: "Just $4.17/mo",
                                    badge: "Best Value",
                                    isSelected: selectedTier == "pro",
                                    color: Color(red: 0.5, green: 0.2, blue: 0.8)
                                ) { selectedTier = "pro" }
                            }
                        }

                        // ── Feature comparison ──
                        featureTable

                        // ── CTA ──
                        VStack(spacing: 12) {
                            if isLoading {
                                ProgressView().padding(.vertical, 14)
                            } else {
                                Button {
                                    Task { await purchase(tier: selectedTier) }
                                } label: {
                                    HStack {
                                        if isPurchasing {
                                            ProgressView().tint(.white)
                                        } else {
                                            Text(selectedTier == "pro" ? "Get Pro — $49.99/yr" : "Get Premium — $34.99/yr")
                                                .fontWeight(.bold)
                                        }
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(selectedTier == "pro" ? Color(red: 0.5, green: 0.2, blue: 0.8) : Color.orange)
                                    .foregroundColor(.white)
                                    .cornerRadius(14)
                                }
                                .disabled(isPurchasing)
                            }

                            Text("Cancel anytime • Billed annually")
                                .font(.caption).foregroundColor(.gray)

                            if !errorMessage.isEmpty {
                                Text(errorMessage)
                                    .font(.caption).foregroundColor(.red)
                                    .multilineTextAlignment(.center)
                            }

                            Button {
                                Task { await restorePurchases() }
                            } label: {
                                HStack(spacing: 6) {
                                    if isRestoring {
                                        ProgressView().scaleEffect(0.7)
                                    }
                                    Text(isRestoring ? "Restoring..." : "Restore Purchases")
                                        .font(.caption).foregroundColor(.gray)
                                        .underline()
                                }
                            }
                            .disabled(isRestoring)
                        }

                        // ── Free tier reminder ──
                        VStack(spacing: 6) {
                            Text("Always free")
                                .font(.caption).fontWeight(.semibold).foregroundColor(.secondary)
                            Text("Recipe Vault (10) • Meal Ideas • Shopping List • Chef TV • 3 imports/month")
                                .font(.caption2).foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(Color(.systemGray6))
                        .cornerRadius(10)

                        // ── Legal links ──
                        HStack(spacing: 16) {
                            Link("Terms of Use", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
                                .font(.caption)
                                .foregroundColor(.gray)
                            Text("•").font(.caption).foregroundColor(.gray)
                            Link("Privacy Policy", destination: URL(string: "https://mycompanionapps.com/privacy")!)
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        .padding(.bottom, 8)

                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 40)
                    .padding(.top, 20)
                }
            }
            .ignoresSafeArea(edges: .top)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.white)
                            .font(.system(size: 22))
                    }
                }
            }
        }
        .task { await loadOfferings() }
        .frame(maxWidth: sizeClass == .regular ? 600 : .infinity)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Feature Table
    var featureTable: some View {
        VStack(spacing: 0) {

            // Header
            HStack {
                Text("Features").font(.caption).fontWeight(.semibold).foregroundColor(.gray)
                Spacer()
                Text("Premium").font(.caption).fontWeight(.semibold)
                    .foregroundColor(selectedTier == "premium" ? .orange : .gray)
                    .frame(width: 72, alignment: .center)
                Text("Pro").font(.caption).fontWeight(.semibold)
                    .foregroundColor(selectedTier == "pro" ? Color(red: 0.5, green: 0.2, blue: 0.8) : .gray)
                    .frame(width: 56, alignment: .center)
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(Color(.systemGray6))
            .cornerRadius(12)

            VStack(spacing: 0) {
                FeatureRow(icon: "tray.and.arrow.down",
                    label: "Recipe imports", free: "3/mo", premium: "Unlimited", pro: "Unlimited",
                    selected: selectedTier)
                Divider().padding(.leading, 14)
                FeatureRow(icon: "books.vertical",
                    label: "Recipe Vault", free: "10 max", premium: "Unlimited", pro: "Unlimited",
                    selected: selectedTier)
                Divider().padding(.leading, 14)
                FeatureRow(icon: "archivebox.fill",
                    label: "Recipe Box + Memories", free: "3 cards", premium: "Unlimited", pro: "Unlimited",
                    selected: selectedTier)
                Divider().padding(.leading, 14)
                FeatureRow(icon: "photo.fill",
                    label: "Memory Photos", free: "—", premium: "✓", pro: "✓",
                    selected: selectedTier)
                Divider().padding(.leading, 14)
                FeatureRow(icon: "sparkles",
                    label: "Chef Jen AI", free: "3 uses", premium: "5/mo", pro: "Unlimited",
                    selected: selectedTier)
                Divider().padding(.leading, 14)
                FeatureRow(icon: "wand.and.stars",
                    label: "Chef Jen Helpers + Photos", free: "5 uses", premium: "5/mo", pro: "Unlimited",
                    selected: selectedTier)
                Divider().padding(.leading, 14)
                FeatureRow(icon: "graduationcap.fill",
                    label: "Learn & Practice", free: "3 uses", premium: "✓", pro: "✓",
                    selected: selectedTier)
                Divider().padding(.leading, 14)
                FeatureRow(icon: "printer.fill",
                    label: "Print recipes", free: "—", premium: "✓", pro: "✓",
                    selected: selectedTier)
                Divider().padding(.leading, 14)
                FeatureRow(icon: "square.and.arrow.up",
                    label: "Social sharing", free: "—", premium: "✓", pro: "✓",
                    selected: selectedTier)
                Divider().padding(.leading, 14)
                FeatureRow(icon: "bolt.fill",
                    label: "Priority support", free: "—", premium: "—", pro: "✓",
                    selected: selectedTier)
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.systemGray5), lineWidth: 1))
            .padding(.top, 8)
        }
    }

    // MARK: - RevenueCat
    func loadOfferings() async {
        do {
            offerings = try await Purchases.shared.offerings()
        } catch {
            print("loadOfferings error:", error)
        }
        await MainActor.run { isLoading = false }
    }

    func purchase(tier: String) async {
        isPurchasing = true; errorMessage = ""
        let offeringId = "default"
        let packageId = tier == "pro" ? "annual_pro" : "annual_premium"
        do {
            if let pkg = offerings?.offering(identifier: offeringId)?.availablePackages
                .first(where: { $0.identifier == packageId }) {
                let result = try await Purchases.shared.purchase(package: pkg)
                // Explicitly sync here — don't rely solely on the passive
                // RevenueCat delegate callback, which doesn't reliably
                // fire immediately after a purchase completes. This is
                // the actual purchase event; source is genuinely
                // 'revenuecat', safe to write directly.
                authManager.updateTier(from: result.customerInfo)
                await authManager.checkSubscription()
                dismiss()
            } else {
                await MainActor.run { errorMessage = "Package not available. Try again later." }
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
        await MainActor.run { isPurchasing = false }
    }

    func restorePurchases() async {
        isRestoring = true
        do {
            let customerInfo = try await Purchases.shared.restorePurchases()
            authManager.updateTier(from: customerInfo)
            await authManager.checkSubscription()
            let hasEntitlement = customerInfo.entitlements["Pro"]?.isActive == true
                || customerInfo.entitlements["Premium"]?.isActive == true
            await MainActor.run {
                isRestoring = false
                if hasEntitlement {
                    dismiss()
                } else {
                    errorMessage = "No active purchases were found for this Apple ID on this device."
                }
            }
        } catch {
            await MainActor.run {
                isRestoring = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Supporting Views

struct TierPill: View {
    let label: String
    let price: String
    let subprice: String
    let badge: String?
    let isSelected: Bool
    let color: Color
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                if let badge = badge {
                    Text(badge)
                        .font(.caption2).fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8).padding(.vertical, 2)
                        .background(color)
                        .cornerRadius(6)
                } else {
                    Spacer().frame(height: 18)
                }
                Text(label)
                    .font(.subheadline).fontWeight(.bold)
                    .foregroundColor(isSelected ? color : .primary)
                Text(price)
                    .font(.caption).fontWeight(.semibold)
                    .foregroundColor(isSelected ? color : .gray)
                Text(subprice)
                    .font(.caption2).foregroundColor(.gray)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(isSelected ? color.opacity(0.08) : Color(.systemGray6))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? color : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
}

struct FeatureRow: View {
    let icon: String
    let label: String
    let free: String
    let premium: String
    let pro: String
    let selected: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.caption).foregroundColor(.orange)
                .frame(width: 20)
            Text(label)
                .font(.footnote)
            Spacer()
            Text(premium)
                .font(.caption).fontWeight(.medium)
                .foregroundColor(selected == "premium" ? .orange : .secondary)
                .frame(width: 72, alignment: .center)
            Text(pro)
                .font(.caption).fontWeight(.medium)
                .foregroundColor(selected == "pro" ? Color(red: 0.5, green: 0.2, blue: 0.8) : .secondary)
                .frame(width: 56, alignment: .center)
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
    }
}
