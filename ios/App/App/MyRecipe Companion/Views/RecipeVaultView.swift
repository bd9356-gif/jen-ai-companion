import SwiftUI
import Supabase

struct RecipeVaultView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.horizontalSizeClass) var sizeClass
    @StateObject var recipeService = RecipeService()
    @State private var showPaywall = false
    @EnvironmentObject var authManager: AuthManager
    @State private var searchText = ""
    @State private var selectedFilter = ""
    @State private var sortOrder: SortOrder = .dateDesc
    @State private var selectedRecipe: Recipe? = nil

    var columns: [GridItem] {
        let count = sizeClass == .regular ? 4 : 2
        return Array(repeating: GridItem(.flexible(), spacing: 8), count: count)
    }

    enum SortOrder: String, CaseIterable {
        case dateDesc = "Newest First"
        case dateAsc = "Oldest First"
        case titleAsc = "Title A–Z"
        case titleDesc = "Title Z–A"
        case category = "Category"
    }

    let curatedTagGroups = [
        ("🍽 Meal", ["breakfast", "lunch", "dinner", "dessert", "side", "snack"]),
        ("🥩 Protein", ["chicken", "beef", "seafood", "pasta", "vegetarian"]),
        ("✨ Style", ["quick", "comfort", "healthy", "baking", "holiday"])
    ]
    let curatedTags = ["breakfast","lunch","dinner","dessert","side","snack","chicken","beef","seafood","pasta","vegetarian","quick","comfort","healthy","baking","holiday"]

    var allUsedTags: [String] {
        Array(Set(recipeService.recipes.flatMap { $0.tags ?? [] })).sorted()
    }

    var favoritesCount: Int {
        recipeService.recipes.filter { $0.is_favorite == true }.count
    }

    var filtered: [Recipe] {
        var result = recipeService.recipes
        switch selectedFilter {
        case "": break
        case "__favorites__":
            result = result.filter { $0.is_favorite == true }
        default:
            result = result.filter { ($0.tags ?? []).contains(selectedFilter) }
        }
        if !searchText.isEmpty {
            result = result.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
        }
        switch sortOrder {
        case .dateDesc: return result
        case .dateAsc: return result.reversed()
        case .titleAsc: return result.sorted { $0.title < $1.title }
        case .titleDesc: return result.sorted { $0.title > $1.title }
        case .category: return result.sorted { ($0.category ?? "zzz") < ($1.category ?? "zzz") }
        }
    }

    var filterLabel: String {
        switch selectedFilter {
        case "": return "All Recipes"
        case "__favorites__": return "❤️ Favorites"
        default: return "#\(selectedFilter)"
        }
    }

    var body: some View {
        VStack(spacing: 0) {

            // ── Banner + Back ──
            ZStack(alignment: .bottomLeading) {
                Image("recipe-vault-hero")
                    .resizable().scaledToFit()
                    .frame(maxWidth: .infinity, maxHeight: 100)
                if sizeClass != .regular {
                    Button { dismiss() } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.primary)
                            .padding(8)
                            .background(Color(.systemBackground).opacity(0.9))
                            .clipShape(Circle())
                    }
                    .padding(.leading, 12).padding(.bottom, 8)
                }
            }
            .frame(maxWidth: .infinity)

            // ── Filter + Sort bar ──
            HStack(spacing: 8) {
                Menu {
                    Button { selectedFilter = "" } label: {
                        HStack { Text("All Recipes"); if selectedFilter == "" { Image(systemName: "checkmark") } }
                    }
                    if favoritesCount > 0 {
                        Button { selectedFilter = "__favorites__" } label: {
                            HStack { Text("❤️ Favorites"); if selectedFilter == "__favorites__" { Image(systemName: "checkmark") } }
                        }
                    }
                    ForEach(curatedTagGroups, id: \.0) { group, tags in
                        let used = tags.filter { allUsedTags.contains($0) }
                        if !used.isEmpty {
                            Section(group) {
                                ForEach(used, id: \.self) { tag in
                                    Button { selectedFilter = tag } label: {
                                        HStack { Text("#\(tag)"); if selectedFilter == tag { Image(systemName: "checkmark") } }
                                    }
                                }
                            }
                        }
                    }
                    let customTags = allUsedTags.filter { !curatedTags.contains($0) }
                    if !customTags.isEmpty {
                        Section("✏️ Custom") {
                            ForEach(customTags, id: \.self) { tag in
                                Button { selectedFilter = tag } label: {
                                    HStack { Text("#\(tag)"); if selectedFilter == tag { Image(systemName: "checkmark") } }
                                }
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(filterLabel)
                            .font(.subheadline).fontWeight(.semibold)
                            .foregroundColor(selectedFilter.isEmpty ? .primary : .orange)
                        Image(systemName: "chevron.down").font(.caption).foregroundColor(.gray)
                    }
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(selectedFilter.isEmpty ? Color(.systemGray6) : Color.orange.opacity(0.1))
                    .cornerRadius(10)
                }
                Spacer()
                Text("\(filtered.count) recipes").font(.caption).foregroundColor(.gray)
                Menu {
                    ForEach(SortOrder.allCases, id: \.self) { order in
                        Button { sortOrder = order } label: {
                            HStack {
                                Text(order.rawValue)
                                if sortOrder == order { Image(systemName: "checkmark") }
                            }
                        }
                    }
                } label: {
                    Image(systemName: "arrow.up.arrow.down")
                        .padding(8)
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 6)

            // ── Search bar ──
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundColor(.gray).font(.subheadline)
                TextField("Search recipes", text: $searchText).font(.subheadline)
                if !searchText.isEmpty {
                    Button { searchText = "" } label: {
                        Image(systemName: "xmark.circle.fill").foregroundColor(.gray).font(.subheadline)
                    }
                }
            }
            .padding(.horizontal, 12).padding(.vertical, 9)
            .background(Color(.systemGray6)).cornerRadius(12)
            .padding(.horizontal, 16).padding(.bottom, 6)

            Divider()

            // ── Free tier vault limit ──
            if !recipeService.isLoading && authManager.subscriptionTier == .free {
                let count = recipeService.recipes.count
                let remaining = max(0, 15 - count)
                if count >= 12 {
                    HStack(spacing: 8) {
                        Image(systemName: remaining == 0 ? "lock.fill" : "exclamationmark.triangle")
                            .foregroundColor(remaining == 0 ? .red : .orange).font(.caption)
                        Text(remaining == 0
                             ? "Vault full — upgrade to store unlimited recipes"
                             : "\(remaining) recipe slot\(remaining == 1 ? "" : "s") remaining on free plan")
                            .font(.caption).foregroundColor(remaining == 0 ? .red : .orange)
                        Spacer()
                        Button("Upgrade") { showPaywall = true }
                            .font(.caption).fontWeight(.semibold).foregroundColor(.white)
                            .padding(.horizontal, 10).padding(.vertical, 4)
                            .background(Color.orange).cornerRadius(8)
                    }
                    .padding(.horizontal, 16).padding(.vertical, 8)
                    .background(remaining == 0 ? Color.red.opacity(0.06) : Color.orange.opacity(0.06))
                }
            }

            // ── Content ──
            if recipeService.isLoading {
                Spacer(); ProgressView(); Spacer()
            } else if recipeService.recipes.isEmpty {
                Spacer()
                VStack(spacing: 16) {
                    Text("🍽️").font(.system(size: 60))
                    Text("No recipes yet").font(.title3).fontWeight(.semibold)
                    Text("Import a recipe to get started").foregroundColor(.gray).font(.subheadline)
                }
                Spacer()
            } else if filtered.isEmpty {
                Spacer()
                VStack(spacing: 16) {
                    Text(selectedFilter == "__favorites__" ? "💔" : "🔍").font(.system(size: 60))
                    Text(selectedFilter == "__favorites__" ? "No favorites yet" : "No results")
                        .font(.title3).fontWeight(.semibold)
                    Text(selectedFilter == "__favorites__"
                         ? "Tap ❤️ on any recipe to add it here"
                         : "Try a different filter or search")
                        .foregroundColor(.gray).font(.subheadline)
                        .multilineTextAlignment(.center).padding(.horizontal, 32)
                }
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 8) {
                        ForEach(filtered) { recipe in
                            if sizeClass == .regular {
                                NavigationLink {
                                    RecipeDetailView(
                                        recipe: recipe,
                                        onUpdate: { updated in recipeService.updateRecipe(updated) },
                                        onDelete: { id in recipeService.removeRecipe(id: id) }
                                    )
                                    .environmentObject(authManager)
                                } label: {
                                    RecipeGridTile(recipe: recipe)
                                }
                                .buttonStyle(.plain)
                            } else {
                                RecipeGridTile(recipe: recipe)
                                    .contentShape(Rectangle())
                                    .onTapGesture { selectedRecipe = recipe }
                            }
                        }
                    }
                    .padding(8)
                }
                .refreshable {
                    if let user = authManager.user {
                        await recipeService.fetchRecipes(userId: user.id)
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .sheet(item: $selectedRecipe) { recipe in
            NavigationView {
                RecipeDetailView(
                    recipe: recipe,
                    onUpdate: { updated in recipeService.updateRecipe(updated) },
                    onDelete: { id in recipeService.removeRecipe(id: id); selectedRecipe = nil }
                )
                .environmentObject(authManager)
            }
            .navigationViewStyle(.stack)
            .onDisappear {
                if let user = authManager.user {
                    Task { await recipeService.fetchRecipes(userId: user.id) }
                }
            }
        }
        .sheet(isPresented: $showPaywall) { PaywallView().environmentObject(authManager).environmentObject(authManager) }
        .task {
            if let user = authManager.user { await recipeService.fetchRecipes(userId: user.id) }
        }
    }
}

// MARK: - Grid Tile
struct RecipeGridTile: View {
    let recipe: Recipe

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
                if let photoUrl = recipe.photo_url, !photoUrl.isEmpty {
                    AsyncImage(url: URL(string: photoUrl)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        ZStack { Color.orange.opacity(0.08); ProgressView() }
                    }
                    .frame(height: 110).clipped()
                } else {
                    Image("chef-logo")
                        .resizable().scaledToFit()
                        .frame(height: 110).frame(maxWidth: .infinity)
                        .background(Color.orange.opacity(0.06))
                }
                if recipe.is_favorite == true {
                    Image(systemName: "heart.fill")
                        .font(.caption2).foregroundColor(.red)
                        .padding(5).background(Color.white.opacity(0.9)).clipShape(Circle())
                        .padding(6)
                }
            }
            .cornerRadius(10)

            VStack(alignment: .leading, spacing: 3) {
                Text(recipe.title).font(.caption2).fontWeight(.semibold).lineLimit(2).foregroundColor(.primary)
                if let category = recipe.category, !category.isEmpty {
                    Text(category).font(.caption2).foregroundColor(.orange)
                }
                Spacer(minLength: 0)
            }
            .frame(height: 52).padding(.horizontal, 8).padding(.top, 6)
        }
        .background(Color(.systemBackground)).cornerRadius(10)
        .shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
    }
}
