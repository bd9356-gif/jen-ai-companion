import SwiftUI
import RevenueCat
import Supabase

@main
struct MyRecipeCompanionApp: App {
    @StateObject var authManager = AuthManager()
    @State private var selectedTab = 0

    init() {
        Purchases.configure(withAPIKey: "appl_DIJKaTaoMfrHRhBYZkBJjAxUwdM")
        Purchases.logLevel = .error
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if authManager.isLoading {
                    SplashView()
                } else if authManager.isLoggedIn {
                    MainTabView(selectedTab: $selectedTab)
                        .environmentObject(authManager)
                } else {
                    LoginView()
                        .environmentObject(authManager)
                }
            }
            .onOpenURL { url in
                print("🔗 Received URL:", url.absoluteString)
                Task {
                    // Handle Supabase auth callbacks
                    do {
                        try await supabase.auth.session(from: url)
                    } catch {
                        print("🔗 Session error:", error)
                    }
                    await authManager.checkSession()

                    // Handle deep link imports (myrecipe://import?url=...)
                    if url.host == "import" {
                        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
                        let urlString = components?.queryItems?.first(where: { $0.name == "url" })?.value

                        if let urlString = urlString {
                            // Deep link with URL param — store and pre-fill
                            let defaults = UserDefaults(suiteName: "group.com.mycompanionapps.recipe")
                            defaults?.set(urlString, forKey: "pendingImportURL")
                            defaults?.synchronize()
                            await MainActor.run {
                                authManager.pendingImportURL = urlString
                                selectedTab = 4
                            }
                        } else {
                            // Share Extension open — URL already in UserDefaults, just switch tab
                            await MainActor.run {
                                selectedTab = 4
                            }
                        }
                    }
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                // Fallback: if app becomes active and there's a pending URL, switch to Import tab
                let defaults = UserDefaults(suiteName: "group.com.mycompanionapps.recipe")
                if defaults?.string(forKey: "pendingImportURL") != nil {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        selectedTab = 4
                    }
                }
            }
            .onChange(of: authManager.isLoggedIn) { _, isLoggedIn in
                if isLoggedIn { selectedTab = 0 }
            }
        }
    }
}
