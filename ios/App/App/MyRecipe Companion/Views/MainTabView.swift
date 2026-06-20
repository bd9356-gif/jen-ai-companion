import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authManager: AuthManager
    @Binding var selectedTab: Int

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationView {
                KitchenHubView()
                    .environmentObject(authManager)
            }
            .navigationViewStyle(.stack)
            .tabItem { Label("Kitchen", systemImage: "house.fill") }
            .tag(0)
            NavigationView {
                RecipeVaultView()
                    .environmentObject(authManager)
            }
            .navigationViewStyle(.stack)
            .tabItem { Label("Vault", systemImage: "book.closed.fill") }
            .tag(1)
            ImportView()
                .tabItem { Label("Import", systemImage: "square.and.arrow.down") }
                .tag(2)
            NavigationView {
                ClassroomView()
                    .environmentObject(authManager)
            }
            .navigationViewStyle(.stack)
            .tabItem { Label("School", systemImage: "graduationcap.fill") }
            .tag(3)
            MoreView()
                .tabItem { Label("More", systemImage: "ellipsis") }
                .tag(4)
        }
        .accentColor(.orange)
    }
}
