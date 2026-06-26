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
                        do {
                            let customerInfo = try await Purchases.shared.restorePurchases()
                            await authManager.updateTier(from: customerInfo)
                        } catch {
                            print("Restore error:", error)
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "arrow.clockwise").foregroundColor(.blue)
                        Text("Restore Purchases")
                    }
                }
            }

            Section {
                Button(role: .destructive) { showDeleteConfirm = true } label: {
                    Label("Delete Account", systemImage: "trash")
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
