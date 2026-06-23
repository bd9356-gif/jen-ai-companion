import SwiftUI

struct KitchenHubView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.horizontalSizeClass) var sizeClass
    var onSidebarSelect: ((Int) -> Void)? = nil
    var onTabSelect: ((Int) -> Void)? = nil

    let cream = Color(.systemBackground)
    let cardBg = Color(.systemBackground)
    let orange = Color(red: 0.93, green: 0.35, blue: 0.12)
    let blue = Color(red: 0.18, green: 0.42, blue: 0.78)
    @State private var showMealPlan = false
    @State private var showShoppingList = false
    @State private var showSocialShare = false

    var body: some View {
        ZStack {
            cream.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 0) {

                    // ── Hero Header ──
                    Image("master-header")
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: sizeClass == .regular ? 500 : .infinity)
                        .padding(.vertical, 2)
                        .background(cream)

                    VStack(spacing: 20) {

                        // ── My Kitchen ──
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 10) {
                                Image("my-kitchen-icon")
                                    .resizable().scaledToFit()
                                    .frame(width: 44, height: 44)
                                    .cornerRadius(10)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text("My Kitchen")
                                        .font(.headline).fontWeight(.bold).foregroundColor(orange)
                                    Text("Your everyday cooking life")
                                        .font(.caption2).foregroundColor(.secondary)
                                }
                            }
                            .padding(.horizontal, 14).padding(.top, 4)

                            VStack(spacing: 4) {
                                // Vault — switch tab/sidebar
                                Button {
                                    if sizeClass == .regular { onSidebarSelect?(1) }
                                    else { onTabSelect?(1) }
                                } label: {
                                    KitchenBar(iconName: "recipe-vault", title: "Recipe Vault", description: "Where recipes begin their journey", color: orange, cardBg: cardBg)
                                }.buttonStyle(.plain)

                                // Box — switch tab/sidebar
                                Button {
                                    if sizeClass == .regular { onSidebarSelect?(2) }
                                    else { onTabSelect?(2) }
                                } label: {
                                    KitchenBar(iconName: "recipe-box", title: "Recipe Box", description: "Your keep-forever recipe collection", color: orange, cardBg: cardBg)
                                }.buttonStyle(.plain)

                                // Meal Ideas — sheet on iPad, push on iPhone
                                if sizeClass == .regular {
                                    Button { showMealPlan = true } label: {
                                        KitchenBar(iconName: "meal-ideas", title: "My Meal Ideas", description: "What you're thinking of cooking next", color: orange, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                } else {
                                    NavigationLink(destination: MealPlanView().environmentObject(authManager).navigationBarBackButtonHidden(true)) {
                                        KitchenBar(iconName: "meal-ideas", title: "My Meal Ideas", description: "What you're thinking of cooking next", color: orange, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                }

                                // Shopping List — sheet on iPad, push on iPhone
                                if sizeClass == .regular {
                                    Button { showShoppingList = true } label: {
                                        KitchenBar(iconName: "shopping-list", title: "Shopping List", description: "Ingredients, organized", color: orange, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                } else {
                                    NavigationLink(destination: ShoppingListView().environmentObject(authManager).navigationBarBackButtonHidden(true)) {
                                        KitchenBar(iconName: "shopping-list", title: "Shopping List", description: "Ingredients, organized", color: orange, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                }

                                // Social Share — sheet on iPad, push on iPhone
                                if sizeClass == .regular {
                                    Button { showSocialShare = true } label: {
                                        KitchenBar(iconName: "social-share-box", title: "Social Share", description: "Recipes you want to share", color: orange, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                } else {
                                    NavigationLink(destination: ShareQueueView().environmentObject(authManager).navigationBarBackButtonHidden(true)) {
                                        KitchenBar(iconName: "social-share-box", title: "Social Share", description: "Recipes you want to share", color: orange, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 14)
                        }

                        // ── AI Cooking School ──
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 10) {
                                Image("ai-school-icon")
                                    .resizable().scaledToFit()
                                    .frame(width: 44, height: 44)
                                    .cornerRadius(10)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text("AI Cooking School")
                                        .font(.headline).fontWeight(.bold).foregroundColor(blue)
                                    Text("Your personal cooking school")
                                        .font(.caption2).foregroundColor(.secondary)
                                }
                            }
                            .padding(.horizontal, 14)

                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
                                if sizeClass == .regular {
                                    Button { onSidebarSelect?(3) } label: {
                                        HubCard(iconName: "chef-icon", title: "Chef Jennifer", description: "Learn and Practice", accentColor: blue, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                    Button { onSidebarSelect?(3) } label: {
                                        HubCard(iconName: "class-videos", title: "Class Videos", description: "Watch and Learn", accentColor: blue, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                    Button { onSidebarSelect?(3) } label: {
                                        HubCard(iconName: "library", title: "Library", description: "Techniques & guides", accentColor: blue, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                    Button { onSidebarSelect?(3) } label: {
                                        HubCard(iconName: "my-notebook", title: "My Notebook", description: "Your saved lessons", accentColor: blue, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                } else {
                                    NavigationLink(destination: ClassroomView(startingMode: .learn).environmentObject(authManager)) {
                                        HubCard(iconName: "chef-icon", title: "Chef Jennifer", description: "Learn and Practice", accentColor: blue, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                    NavigationLink(destination: ClassroomView(startingMode: .videos).environmentObject(authManager)) {
                                        HubCard(iconName: "class-videos", title: "Class Videos", description: "Watch and Learn", accentColor: blue, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                    NavigationLink(destination: ClassroomView(startingMode: .library).environmentObject(authManager)) {
                                        HubCard(iconName: "library", title: "Library", description: "Techniques & guides", accentColor: blue, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                    NavigationLink(destination: ClassroomView(startingMode: .notebook).environmentObject(authManager)) {
                                        HubCard(iconName: "my-notebook", title: "My Notebook", description: "Your saved lessons", accentColor: blue, cardBg: cardBg)
                                    }.buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 14)
                        }
                    }
                    .padding(.vertical, 10).padding(.bottom, 20)
                }
            }
        }
        .navigationBarHidden(sizeClass != .regular)
        .fullScreenCover(isPresented: $showMealPlan) { MealPlanView().environmentObject(authManager) }
        .fullScreenCover(isPresented: $showShoppingList) { ShoppingListView().environmentObject(authManager) }
        .fullScreenCover(isPresented: $showSocialShare) { ShareQueueView().environmentObject(authManager) }
    }
}

// MARK: - Kitchen Bar
struct KitchenBar: View {
    let iconName: String
    let title: String
    let description: String
    let color: Color
    let cardBg: Color

    var body: some View {
        HStack(spacing: 10) {
            Image(iconName)
                .resizable().scaledToFit()
                .frame(width: 32, height: 32)
                .cornerRadius(8)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption).fontWeight(.bold)
                    .foregroundColor(.primary)
                Text(description)
                    .font(.caption2).foregroundColor(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption2).foregroundColor(.gray.opacity(0.5))
        }
        .padding(.horizontal, 10).padding(.vertical, 7)
        .background(cardBg)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(color.opacity(0.15), lineWidth: 1))
        .shadow(color: .black.opacity(0.04), radius: 3, x: 0, y: 2)
    }
}

// MARK: - Hub Card
struct HubCard: View {
    let iconName: String
    let title: String
    let description: String
    let accentColor: Color
    let cardBg: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Image(iconName)
                    .resizable().scaledToFit()
                    .frame(width: 32, height: 32)
                    .cornerRadius(8)
                Text(title)
                    .font(.caption).fontWeight(.bold)
                    .foregroundColor(.primary)
                    .lineLimit(1)
            }
            Text(description)
                .font(.caption2).foregroundColor(.secondary)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, minHeight: 60, alignment: .topLeading)
        .padding(10)
        .background(cardBg)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(accentColor.opacity(0.2), lineWidth: 1.5))
        .shadow(color: .black.opacity(0.04), radius: 3, x: 0, y: 2)
    }
}
