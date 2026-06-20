import SwiftUI

struct SubscriptionGate<Content: View>: View {
    @EnvironmentObject var authManager: AuthManager
    let requiredTier: SubscriptionTier
    let featureName: String
    let featureIcon: String
    @ViewBuilder let content: Content
    @State private var showPaywall = false

    var hasAccess: Bool {
        switch requiredTier {
        case .free: return true
        case .premium: return authManager.subscriptionTier == .premium || authManager.subscriptionTier == .pro
        case .pro: return authManager.subscriptionTier == .pro
        }
    }

    var body: some View {
        if authManager.isLoadingSubscription {
            ProgressView()
        } else if hasAccess {
            content
        } else {
            VStack(spacing: 20) {
                Spacer()
                VStack(spacing: 12) {
                    ZStack {
                        Circle().fill(Color.orange.opacity(0.1)).frame(width: 80, height: 80)
                        Image(systemName: featureIcon)
                            .font(.system(size: 32)).foregroundColor(.orange)
                    }
                    Text(featureName).font(.title3).fontWeight(.bold)
                    Text("This feature requires a Premium or Pro subscription")
                        .font(.subheadline).foregroundColor(.gray)
                        .multilineTextAlignment(.center).padding(.horizontal, 32)
                }
                Button { showPaywall = true } label: {
                    Label("Unlock Now", systemImage: "lock.open.fill")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity).padding(.vertical, 14)
                        .background(Color.orange).foregroundColor(.white).cornerRadius(14)
                }
                .padding(.horizontal, 40)
                Spacer()
            }
            .sheet(isPresented: $showPaywall) {
                PaywallView().environmentObject(authManager)
            }
        }
    }
}

struct GatedButton: View {
    @EnvironmentObject var authManager: AuthManager
    let requiredTier: SubscriptionTier
    let action: () -> Void
    @ViewBuilder let label: () -> AnyView
    @State private var showPaywall = false

    var hasAccess: Bool {
        switch requiredTier {
        case .free: return true
        case .premium: return authManager.subscriptionTier == .premium || authManager.subscriptionTier == .pro
        case .pro: return authManager.subscriptionTier == .pro
        }
    }

    var body: some View {
        Button {
            if hasAccess { action() } else { showPaywall = true }
        } label: {
            label()
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView().environmentObject(authManager)
        }
    }
}
