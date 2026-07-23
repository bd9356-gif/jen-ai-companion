import SwiftUI
import RevenueCat
import Supabase

struct EmptyParams: Encodable {}

struct ProfileView: View {
    @Environment(\.horizontalSizeClass) var sizeClass
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authManager: AuthManager
    @State private var showPaywall = false
    @State private var showDeleteConfirm = false
    @State private var isRestoring = false
    @State private var restoreResultMessage: String? = nil
    @State private var showRestoreResult = false

    var tierName: String {
        switch authManager.subscriptionTier {
        case .pro: return "Pro"
        case .premium: return "Premium"
        case .free: return "Free"
        }
    }

    var tierColor: Color {
        switch authManager.subscriptionTier {
        case .pro: return .purple
        case .premium: return .orange
        case .free: return .gray
        }
    }

    var tierIcon: String {
        switch authManager.subscriptionTier {
        case .pro: return "star.fill"
        case .premium: return "crown.fill"
        case .free: return "person.circle"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .bottomLeading) {
                Image("your-profile-hero")
                    .resizable().scaledToFit()
                    .frame(maxWidth: .infinity, maxHeight: 100)
                Button { dismiss() } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.primary)
                        .padding(8)
                        .background(Color(.systemBackground).opacity(0.8))
                        .clipShape(Circle())
                }
                .padding(.leading, 12).padding(.bottom, 8)
            }
            List {
            Section {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(authManager.user?.email ?? "")
                            .font(.subheadline).foregroundColor(.gray)
                        Text(tierName)
                            .font(.headline).foregroundColor(tierColor)
                    }
                    Spacer()
                    Image(systemName: tierIcon)
                        .font(.title2).foregroundColor(tierColor)
                }
            }

            if authManager.subscriptionTier == .free {
                Section {
                    Button { showPaywall = true } label: {
                        HStack {
                            Image(systemName: "crown.fill").foregroundColor(.orange)
                            Text("Upgrade to Premium").fontWeight(.semibold)
                        }
                    }
                }
            }

            if authManager.subscriptionTier == .premium {
                Section {
                    Button { showPaywall = true } label: {
                        HStack {
                            Image(systemName: "star.fill").foregroundColor(.purple)
                            Text("Upgrade to Pro").fontWeight(.semibold)
                        }
                    }
                }
            }

            if authManager.subscriptionTier != .free {
                Section {
                    Button {
                        if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        HStack {
                            Image(systemName: "creditcard").foregroundColor(.gray)
                            Text("Manage Subscription")
                        }
                    }
                }
            }

            Section {
                Button {
                    Task {
                        isRestoring = true
                        do {
                            let customerInfo = try await Purchases.shared.restorePurchases()
                            authManager.updateTier(from: customerInfo)
                            await authManager.checkSubscription()
                            let hasEntitlement = customerInfo.entitlements["Pro"]?.isActive == true
                                || customerInfo.entitlements["Premium"]?.isActive == true
                            restoreResultMessage = hasEntitlement
                                ? "Your subscription has been restored."
                                : "No active purchases were found for this Apple ID on this device."
                        } catch {
                            print("Restore error:", error)
                            restoreResultMessage = "Restore failed: \(error.localizedDescription)"
                        }
                        isRestoring = false
                        showRestoreResult = true
                    }
                } label: {
                    HStack {
                        if isRestoring {
                            ProgressView().padding(.trailing, 4)
                        } else {
                            Image(systemName: "arrow.clockwise").foregroundColor(.blue)
                        }
                        Text(isRestoring ? "Restoring..." : "Restore Purchases")
                    }
                }
                .disabled(isRestoring)
            }

            Section {
                Button(role: .destructive) { showDeleteConfirm = true } label: {
                    Label("Delete Account", systemImage: "trash")
                }
            }

            Section {
                Button { dismiss() } label: {
                    HStack {
                        Image(systemName: "chevron.left").font(.caption)
                        Text("Back")
                    }
                    .foregroundColor(.blue)
                }
            }
        }
        }
        .navigationBarHidden(true)
        .frame(maxWidth: sizeClass == .regular ? 600 : .infinity)
        .frame(maxWidth: .infinity)
        .sheet(isPresented: $showPaywall) {
            PaywallView().environmentObject(authManager)
        }
        .confirmationDialog("Delete Account", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete Account", role: .destructive) {
                Task { await deleteAccount() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently delete your account and all data.")
        }
        .alert("Restore Purchases", isPresented: $showRestoreResult) {
            Button("OK") {}
        } message: {
            Text(restoreResultMessage ?? "")
        }
    }

    func deleteAccount() async {
        do {
            try await supabase.rpc("delete_user_account", params: EmptyParams()).execute()
            await authManager.signOut()
        } catch {
            print("deleteAccount error:", error)
        }
    }
}
