import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authManager: AuthManager
    @Binding var selectedTab: Int
    @Environment(\.horizontalSizeClass) var sizeClass
    @State private var sidebarSelection: Int? = 0
    @State private var navPath = NavigationPath()

    var body: some View {
        if sizeClass == .regular {
            NavigationSplitView {
                List(selection: $sidebarSelection) {
                    Label("Home", systemImage: "house.fill").tag(0)
                    Label("Vault", systemImage: "book.closed.fill").tag(1)
                    Label("Box", systemImage: "archivebox.fill").tag(2)
                    Label("School", systemImage: "graduationcap.fill").tag(3)
                    Label("More", systemImage: "ellipsis").tag(4)
                }
                .navigationTitle("MyRecipe")
                .accentColor(.orange)
            } detail: {
                NavigationStack(path: $navPath) {
                    switch sidebarSelection ?? 0 {
                    case 0: KitchenHubView(onSidebarSelect: { tag in sidebarSelection = tag }).environmentObject(authManager)
                    case 1: RecipeVaultView().environmentObject(authManager)
                    case 2: RecipeCardsView().environmentObject(authManager)
                    case 3: ClassroomView().environmentObject(authManager)
                    case 4: MoreView().environmentObject(authManager)
                    default: KitchenHubView().environmentObject(authManager)
                    }
                }
                .id(sidebarSelection)
            }
            .accentColor(.orange)
            .onChange(of: sidebarSelection) { _, _ in
                navPath = NavigationPath()
            }
        } else {
            TabView(selection: $selectedTab) {
                NavigationView {
                    KitchenHubView().environmentObject(authManager)
                }
                .navigationViewStyle(.stack)
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(0)

                NavigationView {
                    RecipeVaultView().environmentObject(authManager)
                }
                .navigationViewStyle(.stack)
                .tabItem { Label("Vault", systemImage: "book.closed.fill") }
                .tag(1)

                NavigationView {
                    RecipeCardsView().environmentObject(authManager)
                }
                .navigationViewStyle(.stack)
                .tabItem { Label("Box", systemImage: "archivebox.fill") }
                .tag(2)

                NavigationView {
                    ClassroomView().environmentObject(authManager)
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
}
