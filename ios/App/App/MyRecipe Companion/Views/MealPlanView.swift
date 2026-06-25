import SwiftUI
import Supabase

struct MyPick: Identifiable, Codable, Equatable {
    let id: UUID
    var user_id: UUID?
    var recipe_id: UUID?
    var title: String
    var photo_url: String?
    var category: String?
    var bucket: String?
    var sort_order: Int?
    var is_side: Bool?
    var created_at: Date?
}

struct MealPlanView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.horizontalSizeClass) var sizeClass
    @EnvironmentObject var authManager: AuthManager
    @State private var picks: [MyPick] = []
    @State private var recipes: [Recipe] = []
    @State private var isLoading = true
    @State private var showAddPick = false
    @State private var selectionOrder: [UUID] = []

    var selected: Set<UUID> { Set(selectionOrder) }
    @State private var showMise = false
    @State private var showMisePicker = false
    @State private var miseEnPlaceRecipe: Recipe? = nil
    @State private var showShoppingPicker = false

    var sortedPicks: [MyPick] {
        picks.sorted { ($0.sort_order ?? 0) < ($1.sort_order ?? 0) }
    }

    var selectedPicks: [MyPick] {
        sortedPicks.filter { selected.contains($0.id) }
    }

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView()
                } else if picks.isEmpty {
                    VStack(spacing: 16) {
                        Text("🍽️").font(.system(size: 60))
                        Text("Your cooking rotation is empty")
                            .font(.title3).fontWeight(.semibold)
                        Text("Add your go-to meals and recipes you want to try")
                            .font(.subheadline).foregroundColor(.gray)
                            .multilineTextAlignment(.center).padding(.horizontal, 32)
                        Button { showAddPick = true } label: {
                            Label("Add a Meal", systemImage: "plus")
                                .fontWeight(.semibold)
                                .padding(.horizontal, 24).padding(.vertical, 12)
                                .background(Color.orange).foregroundColor(.white).cornerRadius(12)
                        }
                    }
                } else {
                    VStack(spacing: 0) {

                        // ── Banner + Back ──
                        ZStack(alignment: .bottomLeading) {
                            Image("my-meal-hero")
                                .resizable().scaledToFit()
                                .frame(maxWidth: .infinity, maxHeight: 100)
                                .padding(.top, 8)
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
                        .frame(maxWidth: .infinity)


                        // ── Action toolbar ──
                        HStack(spacing: 12) {
                            if !selectionOrder.isEmpty {
                                Button { sortBySelection() } label: {
                                    HStack(spacing: 5) {
                                        Image(systemName: "arrow.up.arrow.down").font(.caption)
                                        Text("Sort").font(.caption).fontWeight(.semibold)
                                    }
                                    .foregroundColor(.primary)
                                    .padding(.horizontal, 12).padding(.vertical, 7)
                                    .background(Color(.systemGray6)).cornerRadius(10)
                                }
                            }
                            Spacer()
                            Button { showAddPick = true } label: {
                                HStack(spacing: 5) {
                                    Image(systemName: "plus").font(.caption)
                                    Text("Add Meal").font(.caption).fontWeight(.semibold)
                                }
                                .foregroundColor(.white)
                                .padding(.horizontal, 12).padding(.vertical, 7)
                                .background(Color.orange).cornerRadius(10)
                            }
                        }
                        .padding(.horizontal, 16).padding(.vertical, 8)
                        .frame(maxWidth: .infinity)

                        Divider()

                        if !selected.isEmpty {
                            HStack {
                                Image(systemName: "checkmark.circle.fill").foregroundColor(.orange).font(.caption)
                                Text("\(selected.count) selected — tap again to deselect")
                                    .font(.caption).foregroundColor(.gray)
                                Spacer()
                                Button("Clear") { selectionOrder = []; saveSelection() }
                                    .font(.caption).foregroundColor(.orange)
                            }
                            .padding(.horizontal, 16).padding(.vertical, 8)
                            .background(Color.orange.opacity(0.06))
                        }

                        HStack {
                            Image(systemName: "hand.tap").font(.caption2).foregroundColor(.gray)
                            Text("Tap to select  ·  Hold to remove")
                                .font(.caption2).foregroundColor(.gray)
                            Spacer()
                        }
                        .padding(.horizontal, 16).padding(.vertical, 6)
                        .background(Color(.systemGray6))

                        List {
                            ForEach(sortedPicks) { pick in
                                let isSelected = selected.contains(pick.id)
                                HStack(spacing: 12) {
                                    if let url = pick.photo_url, !url.isEmpty {
                                        AsyncImage(url: URL(string: url)) { image in
                                            image.resizable().scaledToFill()
                                        } placeholder: { Color.orange.opacity(0.12) }
                                        .frame(width: 52, height: 52).cornerRadius(10).clipped()
                                    } else {
                                        ZStack {
                                            Color.orange.opacity(0.08)
                                            Text("🍽️").font(.title3)
                                        }
                                        .frame(width: 52, height: 52).cornerRadius(10)
                                    }
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(pick.title)
                                            .font(.subheadline).fontWeight(.semibold).lineLimit(1)
                                            .foregroundColor(isSelected ? .orange : .primary)
                                        if let category = pick.category, !category.isEmpty {
                                            Text(category).font(.caption2).foregroundColor(.gray)
                                        }
                                    }
                                    Spacer()
                                    if let idx = selectionOrder.firstIndex(of: pick.id) {
                                        ZStack {
                                            Circle().fill(Color.orange).frame(width: 28, height: 28)
                                            Text("\(idx + 1)").font(.caption).fontWeight(.bold).foregroundColor(.white)
                                        }
                                    } else {
                                        Circle().stroke(Color(.systemGray4), lineWidth: 1.5).frame(width: 28, height: 28)
                                    }
                                }
                                .padding(.vertical, 4)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    if let idx = selectionOrder.firstIndex(of: pick.id) {
                                        selectionOrder.remove(at: idx)
                                    } else {
                                        selectionOrder.append(pick.id)
                                    }
                                    saveSelection()
                                }
                                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                                .listRowSeparator(.hidden)
                                .listRowBackground(isSelected ? Color.orange.opacity(0.04) : Color(.systemBackground))
                                .contextMenu {
                                    Button(role: .destructive) {
                                        Task { await deletePick(pick) }
                                    } label: {
                                        Label("Remove from list", systemImage: "trash")
                                    }
                                }
                            }
                            .onMove { from, to in
                                var flat = sortedPicks
                                flat.move(fromOffsets: from, toOffset: to)
                                let newSelectionOrder = flat.filter { selected.contains($0.id) }.map { $0.id }
                                selectionOrder = newSelectionOrder
                                saveSelection()
                                Task { await reorderAll(flat) }
                            }
                        }
                        .listStyle(.plain)
                        .environment(\.editMode, .constant(.active))

                        commandBar
                    }
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $showAddPick) {
                AddPickView(recipes: recipes) { recipe in
                    Task { await addPick(recipe: recipe) }
                }
            }
            .sheet(isPresented: $showMisePicker) {
                let orderedRecipes = selectionOrder.compactMap { id -> Recipe? in
                    guard let pick = picks.first(where: { $0.id == id }),
                          let recipeId = pick.recipe_id else { return nil }
                    return recipes.first(where: { $0.id == recipeId })
                }
                NavigationView {
                    List(orderedRecipes) { recipe in
                        Button {
                            miseEnPlaceRecipe = recipe
                            showMisePicker = false
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                showMise = true
                            }
                        } label: {
                            HStack {
                                Text("👨‍🍳").font(.title3)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(recipe.title).font(.subheadline).fontWeight(.semibold).foregroundColor(.primary)
                                    if let cat = recipe.category, !cat.isEmpty {
                                        Text(cat).font(.caption).foregroundColor(.orange)
                                    }
                                }
                                Spacer()
                                Image(systemName: "chevron.right").font(.caption2).foregroundColor(.gray)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .navigationTitle("Select a Meal")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button("Cancel") { showMisePicker = false }
                        }
                    }
                }
            }
            .sheet(isPresented: $showMise) {
                if let recipe = miseEnPlaceRecipe {
                    MiseEnPlaceSheetView(recipe: recipe)
                }
            }
            .sheet(isPresented: $showShoppingPicker) {
                let orderedRecipes = selectionOrder.compactMap { id -> Recipe? in
                    guard let pick = picks.first(where: { $0.id == id }),
                          let recipeId = pick.recipe_id else { return nil }
                    return recipes.first(where: { $0.id == recipeId })
                }
                MealIdeasShoppingPickerView(recipes: orderedRecipes)
                    .environmentObject(authManager)
            }
            .task { await loadAll() }
            .onDisappear { saveSelection() }
            .frame(maxWidth: sizeClass == .regular ? 700 : .infinity)
            .frame(maxWidth: .infinity)
        }
        .navigationViewStyle(.stack)
    }

    var commandBar: some View {
        VStack(spacing: 0) {
            Divider()
            HStack(spacing: 10) {
                Button { showMisePicker = true } label: {
                    VStack(spacing: 3) {
                        Image(systemName: "list.bullet.clipboard").font(.title3)
                        Text("Mise en Place").font(.caption2).fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 12)
                    .background(selected.isEmpty ? Color(.systemGray6) : Color.orange)
                    .foregroundColor(selected.isEmpty ? .gray : .white)
                    .cornerRadius(12)
                }
                .disabled(selected.isEmpty)

                Button { showShoppingPicker = true } label: {
                    VStack(spacing: 3) {
                        Image(systemName: "cart.badge.plus").font(.title3)
                        Text("Shopping List").font(.caption2).fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 12)
                    .background(selected.isEmpty ? Color(.systemGray6) : Color.blue)
                    .foregroundColor(selected.isEmpty ? .gray : .white)
                    .cornerRadius(12)
                }
                .disabled(selected.isEmpty)
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(Color(.systemBackground))
        }
    }

    func saveSelection() {
        let ids = selectionOrder.map { $0.uuidString }
        UserDefaults.standard.set(ids, forKey: "mealIdeasSelection")
    }

    func loadSelection() {
        let ids = UserDefaults.standard.stringArray(forKey: "mealIdeasSelection") ?? []
        let allIds = Set(picks.map { $0.id })
        selectionOrder = ids.compactMap { UUID(uuidString: $0) }.filter { allIds.contains($0) }
    }

    func loadAll() async {
        guard let user = authManager.user else { return }
        do {
            async let picksResult: [MyPick] = supabase.from("my_picks").select()
                .eq("user_id", value: user.id).order("sort_order", ascending: true).execute().value
            async let recipesResult: [Recipe] = supabase.from("personal_recipes")
                .select("id, title, photo_url, ingredients, category, tags")
                .eq("user_id", value: user.id).is("deleted_at", value: nil)
                .order("title", ascending: true).execute().value
            let (picksList, recipesList) = try await (picksResult, recipesResult)
            await MainActor.run {
                picks = picksList
                recipes = recipesList
                isLoading = false
                loadSelection()
            }
        } catch {
            print("loadAll error:", error)
            await MainActor.run { isLoading = false }
        }
    }

    func addPick(recipe: Recipe) async {
        guard let user = authManager.user else { return }
        do {
            let nextOrder = (picks.map { $0.sort_order ?? 0 }.max() ?? -1) + 1
            try await supabase.from("my_picks").insert([
                "user_id": user.id.uuidString,
                "recipe_id": recipe.id.uuidString,
                "title": recipe.title,
                "photo_url": recipe.photo_url ?? "",
                "category": recipe.category ?? "",
                "bucket": "later",
                "sort_order": String(nextOrder),
                "is_side": "false"
            ]).execute()
            await loadAll()
        } catch { print("addPick error:", error) }
    }

    func reorderAll(_ reordered: [MyPick]) async {
        await MainActor.run {
            for (index, pick) in reordered.enumerated() {
                if let i = picks.firstIndex(where: { $0.id == pick.id }) {
                    picks[i].sort_order = index
                }
            }
        }
        do {
            for (index, pick) in reordered.enumerated() {
                try await supabase.from("my_picks")
                    .update(["sort_order": AnyJSON.double(Double(index))])
                    .eq("id", value: pick.id).execute()
            }
        } catch { print("reorderAll error:", error) }
    }

    func sortBySelection() {
        let selectedInOrder = selectionOrder.compactMap { id in sortedPicks.first(where: { $0.id == id }) }
        let unselected = sortedPicks.filter { !selected.contains($0.id) }
        let newOrder = selectedInOrder + unselected
        Task { await reorderAll(newOrder) }
    }

    func deletePick(_ pick: MyPick) async {
        do {
            try await supabase.from("my_picks").delete().eq("id", value: pick.id).execute()
            await MainActor.run {
                picks.removeAll { $0.id == pick.id }
                selectionOrder.removeAll { $0 == pick.id }
                saveSelection()
            }
        } catch { print("deletePick error:", error) }
    }
}

struct AddPickView: View {
    let recipes: [Recipe]
    let onAdd: (Recipe) -> Void
    @Environment(\.dismiss) var dismiss
    @State private var searchText = ""
    @State private var selectedFilter = ""

    let curatedTagGroups = [
        ("🍽 Meal", ["breakfast", "lunch", "dinner", "dessert", "side", "snack"]),
        ("🥩 Protein", ["chicken", "beef", "seafood", "pasta", "vegetarian"]),
        ("✨ Style", ["quick", "comfort", "healthy", "baking", "holiday"])
    ]
    let curatedTags = ["breakfast","lunch","dinner","dessert","side","snack","chicken","beef","seafood","pasta","vegetarian","quick","comfort","healthy","baking","holiday"]

    var allUsedTags: [String] {
        Array(Set(recipes.flatMap { $0.tags ?? [] })).sorted()
    }

    var filtered: [Recipe] {
        var result = recipes
        if !selectedFilter.isEmpty {
            result = result.filter { ($0.tags ?? []).contains(selectedFilter) }
        }
        if !searchText.isEmpty {
            result = result.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
        }
        return result.sorted { $0.title < $1.title }
    }

    var filterLabel: String {
        selectedFilter.isEmpty ? "All Recipes" : "#\(selectedFilter)"
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
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
                .padding(.horizontal, 16).padding(.vertical, 8)

                HStack(spacing: 8) {
                    Menu {
                        Button { selectedFilter = "" } label: {
                            HStack {
                                Text("All Recipes")
                                if selectedFilter.isEmpty { Image(systemName: "checkmark") }
                            }
                        }
                        ForEach(curatedTagGroups, id: \.0) { group, tags in
                            let used = tags.filter { allUsedTags.contains($0) }
                            if !used.isEmpty {
                                Section(group) {
                                    ForEach(used, id: \.self) { tag in
                                        Button { selectedFilter = tag } label: {
                                            HStack {
                                                Text("#\(tag)")
                                                if selectedFilter == tag { Image(systemName: "checkmark") }
                                            }
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
                                        HStack {
                                            Text("#\(tag)")
                                            if selectedFilter == tag { Image(systemName: "checkmark") }
                                        }
                                    }
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(filterLabel).font(.subheadline).fontWeight(.semibold)
                                .foregroundColor(selectedFilter.isEmpty ? .primary : .orange)
                            Image(systemName: "chevron.down").font(.caption).foregroundColor(.gray)
                        }
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(selectedFilter.isEmpty ? Color(.systemGray6) : Color.orange.opacity(0.1))
                        .cornerRadius(10)
                    }
                    Spacer()
                    Text("\(filtered.count) recipes").font(.caption).foregroundColor(.gray)
                }
                .padding(.horizontal, 16).padding(.bottom, 8)

                Divider()

                List(filtered) { recipe in
                    Button { onAdd(recipe); dismiss() } label: {
                        HStack(spacing: 12) {
                            if let url = recipe.photo_url, !url.isEmpty {
                                AsyncImage(url: URL(string: url)) { image in image.resizable().scaledToFill() }
                                    placeholder: { Color.orange.opacity(0.15) }
                                .frame(width: 44, height: 44).cornerRadius(8).clipped()
                            } else {
                                ZStack { Color.orange.opacity(0.1); Text("🍽️").font(.subheadline) }
                                    .frame(width: 44, height: 44).cornerRadius(8)
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(recipe.title).font(.subheadline).foregroundColor(.primary)
                                if let category = recipe.category, !category.isEmpty {
                                    Text(category).font(.caption2).foregroundColor(.orange)
                                }
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
                .listStyle(.plain)
            }
            .navigationTitle("Add Meal Idea")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Cancel") { dismiss() } }
            }
        }
    }
}

struct MealIdeasShoppingPickerView: View {
    let recipes: [Recipe]
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var selected: Set<String> = []
    @State private var isAdding = false
    @State private var added = false

    struct IngredientItem: Identifiable {
        let id: String
        let name: String
        let qty: String
        let recipeTitle: String
        let fullText: String
    }

    var allIngredients: [IngredientItem] {
        var items: [IngredientItem] = []
        for recipe in recipes {
            for (i, ingredient) in (recipe.ingredients ?? []).enumerated() {
                guard let name = ingredient.name, !name.isEmpty else { continue }
                let qty = ingredient.amount ?? ingredient.measure ?? ""
                let fullText = qty.isEmpty ? name : "\(qty) \(name)"
                items.append(IngredientItem(id: "\(recipe.id)-\(i)", name: name, qty: qty, recipeTitle: recipe.title, fullText: fullText))
            }
        }
        return items
    }

    var body: some View {
        NavigationView {
            List {
                Section {
                    Button {
                        if selected.count == allIngredients.count { selected = [] }
                        else { selected = Set(allIngredients.map { $0.id }) }
                    } label: {
                        HStack {
                            Image(systemName: selected.count == allIngredients.count ? "checkmark.circle.fill" : "circle").foregroundColor(.orange)
                            Text(selected.count == allIngredients.count ? "Deselect All" : "Select All").foregroundColor(.orange)
                        }
                    }
                    .buttonStyle(.plain)
                }
                ForEach(recipes) { recipe in
                    let recipeIngredients = allIngredients.filter { $0.recipeTitle == recipe.title }
                    if !recipeIngredients.isEmpty {
                        Section(recipe.title) {
                            ForEach(recipeIngredients) { item in
                                Button {
                                    if selected.contains(item.id) { selected.remove(item.id) }
                                    else { selected.insert(item.id) }
                                } label: {
                                    HStack {
                                        Image(systemName: selected.contains(item.id) ? "checkmark.circle.fill" : "circle")
                                            .foregroundColor(selected.contains(item.id) ? .orange : .gray)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(item.name).font(.subheadline).foregroundColor(.primary)
                                            if !item.qty.isEmpty { Text(item.qty).font(.caption).foregroundColor(.gray) }
                                        }
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Add to Shopping List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { Task { await addSelected() } } label: {
                        if isAdding { ProgressView().scaleEffect(0.8) }
                        else if added { Text("Added ✓").foregroundColor(.green) }
                        else { Text("Add \(selected.count)").fontWeight(.semibold).foregroundColor(selected.isEmpty ? .gray : .orange) }
                    }
                    .disabled(selected.isEmpty || isAdding || added)
                }
            }
            .onAppear { selected = Set(allIngredients.map { $0.id }) }
        }
    }

    func addSelected() async {
        guard let user = authManager.user, !selected.isEmpty else { return }
        isAdding = true
        let stores: [Store] = (try? await supabase.from("stores").select()
            .eq("user_id", value: user.id).eq("is_default", value: true)
            .limit(1).execute().value) ?? []
        let defaultStoreId = stores.first?.id
        var insertItems: [AnyJSON] = []
        for item in allIngredients.filter({ selected.contains($0.id) }) {
            var obj: [String: AnyJSON] = [
                "user_id": .string(user.id.uuidString),
                "ingredient": .string(item.fullText),
                "recipe_title": .string(item.recipeTitle),
                "checked": .bool(false)
            ]
            if let storeId = defaultStoreId { obj["store_id"] = .string(storeId.uuidString) }
            insertItems.append(.object(obj))
        }
        try? await supabase.from("shopping_list").insert(insertItems).execute()
        await MainActor.run { isAdding = false; added = true }
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        dismiss()
    }
}
