import SwiftUI

struct MoreView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.horizontalSizeClass) var sizeClass
    @State private var showPaywall = false
    @State private var showImport = false

    var body: some View {
        if sizeClass == .regular {
            // iPad — no NavigationView needed, sidebar provides context
            contentView
                .navigationBarHidden(false)
                .onAppear { checkPendingImport() }
        } else {
            // iPhone — needs NavigationView for NavigationLink to work
            NavigationView {
                contentView
                    .onAppear { checkPendingImport() }
            }
            .navigationViewStyle(.stack)
        }
    }

    func checkPendingImport() {
        let defaults = UserDefaults(suiteName: "group.com.mycompanionapps.recipe")
        if let url = defaults?.string(forKey: "pendingImportURL"), !url.isEmpty {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                showImport = true
            }
        }
    }

    var contentView: some View {
        VStack(spacing: 0) {

            // ── Banner ──
            Image("more-hero")
                .resizable().scaledToFit()
                .frame(maxWidth: .infinity, maxHeight: 100)

            List {
                Section {
                    Button { showImport = true } label: {
                        Label("Bring In Recipe", systemImage: "square.and.arrow.down")
                    }
                }

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
            .listStyle(.insetGrouped)
            .navigationBarHidden(true)
            .sheet(isPresented: $showPaywall) {
                PaywallView().environmentObject(authManager)
            }
            .sheet(isPresented: $showImport) {
                ImportView().environmentObject(authManager)
            }
        }
    }
}
