import SwiftUI

struct MoreView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showPaywall = false

    var body: some View {
        NavigationView {
            List {
                Section {
                    NavigationLink(destination: ProfileView().environmentObject(authManager)) {
                        Label("Profile & Subscription", systemImage: "person.circle")
                    }
                }

                Section {
                    Button { showPaywall = true } label: {
                        Label("View Pricing", systemImage: "creditcard")
                    }
                    Link(destination: URL(string: "https://mycompanionapps.com")!) {
                        Label("MyCompanionApps.com", systemImage: "globe")
                    }
                }

                Section {
                    Button(role: .destructive) {
                        Task { await authManager.signOut() }
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("More")
            .sheet(isPresented: $showPaywall) {
                PaywallView().environmentObject(authManager)
            }
        }
    }
}
