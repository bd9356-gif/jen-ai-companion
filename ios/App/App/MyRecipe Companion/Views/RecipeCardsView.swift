import SwiftUI
import PhotosUI
import Supabase

// MARK: - Recipe Cards View
struct RecipeCardsView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var recipes: [Recipe] = []
    @State private var isLoading = true
    @State private var selectedRecipe: Recipe? = nil
    @State private var refreshID = UUID()
    @State private var searchText = ""
    @State private var selectedFilter = ""
    @State private var sortOrder: CardSortOrder = .dateDesc

    @Environment(\.horizontalSizeClass) var sizeClass
    var columns: [GridItem] {
        let count = sizeClass == .regular ? 4 : 2
        return Array(repeating: GridItem(.flexible(), spacing: 12), count: count)
    }

    enum CardSortOrder: String, CaseIterable {
        case dateDesc = "Newest First"
        case dateAsc = "Oldest First"
        case titleAsc = "Title A–Z"
        case titleDesc = "Title Z–A"
    }

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
        switch sortOrder {
        case .dateDesc: return result
        case .dateAsc: return result.reversed()
        case .titleAsc: return result.sorted { $0.title < $1.title }
        case .titleDesc: return result.sorted { $0.title > $1.title }
        }
    }

    var filterLabel: String {
        selectedFilter.isEmpty ? "All Recipes" : "#\(selectedFilter)"
    }

    var body: some View {
        VStack(spacing: 0) {

            // ── Banner + Back ──
            ZStack(alignment: .bottomLeading) {
                Image("recipe-box-hero")
                    .resizable().scaledToFit()
                    .frame(maxWidth: .infinity, maxHeight: 100)
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

            Divider()

            // ── Filter + Sort bar ──
            HStack(spacing: 8) {
                Menu {
                    Button { selectedFilter = "" } label: {
                        HStack { Text("All Recipes"); if selectedFilter == "" { Image(systemName: "checkmark") } }
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
                    ForEach(CardSortOrder.allCases, id: \.self) { order in
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

            if isLoading {
                Spacer(); ProgressView(); Spacer()
            } else if recipes.isEmpty {
                Spacer()
                VStack(spacing: 16) {
                    Text("📦").font(.system(size: 60))
                    Text("Your Recipe Box is empty").font(.title3).fontWeight(.semibold)
                    Text("Add recipes from your vault to build your personal collection")
                        .font(.subheadline).foregroundColor(.gray)
                        .multilineTextAlignment(.center).padding(.horizontal, 32)
                }
                Spacer()
            } else if filtered.isEmpty {
                Spacer()
                VStack(spacing: 16) {
                    Text("🔍").font(.system(size: 60))
                    Text("No results").font(.title3).fontWeight(.semibold)
                    Text("Try a different filter or search")
                        .font(.subheadline).foregroundColor(.gray)
                        .multilineTextAlignment(.center).padding(.horizontal, 32)
                }
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(filtered) { recipe in
                            Button { selectedRecipe = recipe } label: {
                                RecipeCardTile(recipe: recipe)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(16)
                }
                .refreshable { await loadCards() }
            }
        }
        .navigationBarHidden(true)
        .sheet(item: $selectedRecipe) { recipe in
            RecipeCardDetailView(recipe: recipe) {
                Task { await loadCards(); await MainActor.run { refreshID = UUID() } }
            }
            .environmentObject(authManager)
        }
        .task { await loadCards() }
    }

    func loadCards() async {
        guard let user = authManager.user else { return }
        do {
            let cardIds: [[String: String]] = try await supabase.from("recipe_cards")
                .select("recipe_id").eq("user_id", value: user.id).execute().value
            let ids = cardIds.compactMap { $0["recipe_id"] }
            guard !ids.isEmpty else {
                await MainActor.run { recipes = []; isLoading = false }
                return
            }
            let result: [Recipe] = try await supabase.from("personal_recipes")
                .select().in("id", values: ids).is("deleted_at", value: nil)
                .order("title", ascending: true).execute().value
            await MainActor.run { recipes = result; isLoading = false }
        } catch {
            print("loadCards error:", error)
            await MainActor.run { isLoading = false }
        }
    }
}

// MARK: - Card Tile
struct RecipeCardTile: View {
    let recipe: Recipe

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let photoUrl = recipe.photo_url, !photoUrl.isEmpty {
                AsyncImage(url: URL(string: photoUrl)) { image in
                    image.resizable().scaledToFill()
                } placeholder: { Color.orange.opacity(0.08) }
                .frame(height: 130).clipped()
            } else {
                Image("chef-logo")
                    .resizable().scaledToFit()
                    .frame(height: 130).frame(maxWidth: .infinity)
                    .background(Color.orange.opacity(0.06))
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(recipe.title).font(.caption).fontWeight(.semibold).lineLimit(2).foregroundColor(.primary)
                if let category = recipe.category, !category.isEmpty {
                    Text(category).font(.caption2).foregroundColor(.orange)
                }
                Spacer(minLength: 0)
            }
            .frame(height: 56).padding(.horizontal, 8).padding(.top, 6)
        }
        .background(Color(.systemBackground)).cornerRadius(12)
        .shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Recipe Card Detail View
struct RecipeCardDetailView: View {
    let recipe: Recipe
    var onRemoved: (() -> Void)? = nil
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss

    @State private var specialNotes = ""
    @State private var savingNotes = false
    @State private var notesSaved = false
    @State private var memories: [RecipeMemory] = []
    @State private var selectedMemoryPhoto: PhotosPickerItem? = nil
    @State private var isUploadingMemory = false
    @State private var openSections: Set<String> = []
    @State private var showRemoveConfirm = false
    @State private var showFullRecipe = false
    @State private var showMiseEnPlace = false
    @State private var editingCaption: RecipeMemory? = nil
    @State private var editCaptionText = ""
    enum FullscreenItem: Identifiable {
        case memory(RecipeMemory)
        case recipePhoto(String)
        var id: String {
            switch self {
            case .memory(let m): return m.id.uuidString
            case .recipePhoto(let url): return url
            }
        }
    }
    @State private var fullscreenItem: FullscreenItem? = nil

    struct RecipeMemory: Identifiable, Codable {
        let id: UUID
        var recipe_id: UUID?
        var user_id: UUID?
        var image_url: String
        var caption: String?
        var sort_order: Int?
        var created_at: Date?
    }

    func toggleSection(_ key: String) {
        if openSections.contains(key) { openSections.remove(key) } else { openSections.insert(key) }
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    heroSection
                    contentSection
                }
            }
            .navigationTitle(recipe.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Close") { dismiss() } }
            }
            .confirmationDialog("Remove from Recipe Box?", isPresented: $showRemoveConfirm, titleVisibility: .visible) {
                Button("Remove", role: .destructive) { Task { await removeFromBox() } }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This won't delete the recipe from your vault.")
            }
            .sheet(isPresented: $showMiseEnPlace) { MiseEnPlaceSheetView(recipe: recipe) }
            .sheet(isPresented: $showFullRecipe) {
                NavigationView {
                    RecipeDetailView(recipe: recipe).environmentObject(authManager)
                        .toolbar { ToolbarItem(placement: .navigationBarLeading) { Button("Close") { showFullRecipe = false } } }
                }
            }
            .alert("Edit Caption", isPresented: Binding(get: { editingCaption != nil }, set: { if !$0 { editingCaption = nil } })) {
                TextField("Caption", text: $editCaptionText)
                Button("Save") {
                    let memoryToUpdate = editingCaption
                    let text = editCaptionText
                    editingCaption = nil
                    guard let memory = memoryToUpdate else { return }
                    Task {
                        await MainActor.run {
                            if let index = memories.firstIndex(where: { $0.id == memory.id }) {
                                memories[index].caption = text
                            }
                        }
                        do {
                            try await supabase.from("recipe_memories")
                                .update(["caption": text])
                                .eq("id", value: memory.id)
                                .execute()
                            print("caption saved ok")
                        } catch {
                            print("caption save error:", error)
                        }
                    }
                }
                Button("Cancel", role: .cancel) { editingCaption = nil }
            }
            .fullScreenCover(item: $fullscreenItem) { item in
                switch item {
                case .memory(let memory):
                    fullscreenView(memory)
                case .recipePhoto(let url):
                    ZStack(alignment: .topTrailing) {
                        Color.black.ignoresSafeArea()
                        AsyncImage(url: URL(string: url)) { image in
                            image.resizable().scaledToFit().frame(maxWidth: .infinity, maxHeight: .infinity)
                        } placeholder: { ProgressView().tint(.white) }
                        Button { fullscreenItem = nil } label: {
                            Image(systemName: "xmark.circle.fill").font(.title).foregroundColor(.white).padding(20)
                        }
                    }
                }
            }
            .task { await loadCardData() }
            .onChange(of: selectedMemoryPhoto) { _, _ in Task { await uploadMemory() } }
        }
    }

    @ViewBuilder var heroSection: some View {
        if let photoUrl = recipe.photo_url, !photoUrl.isEmpty, let url = URL(string: photoUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                        .frame(maxWidth: .infinity).frame(height: 160).clipped()
                        .onTapGesture {
                            if let url = recipe.photo_url, !url.isEmpty {
                                fullscreenItem = .recipePhoto(url)
                            }
                        }
                default:
                    Color.orange.opacity(0.06).frame(maxWidth: .infinity).frame(height: 160)
                }
            }
        } else {
            Image("chef-logo").resizable().scaledToFit()
                .frame(maxWidth: .infinity).frame(height: 160).background(Color.orange.opacity(0.06))
        }
    }

    @ViewBuilder var contentSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            titleSection
            miseEnPlaceButton
            Divider().padding(.vertical, 12).padding(.horizontal, 20)
            ingredientsSection
            Divider().padding(.horizontal, 20)
            viewRecipeButton
            Divider().padding(.vertical, 12).padding(.horizontal, 20)
            memoriesSection
            Divider().padding(.horizontal, 20)
            specialNotesSection
            removeButton
        }
    }

    @ViewBuilder var titleSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(recipe.title).font(.title3).fontWeight(.bold)
            HStack(spacing: 12) {
                if let cat = recipe.category, !cat.isEmpty {
                    Label(cat, systemImage: "tag").font(.caption).foregroundColor(.orange)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(Color.orange.opacity(0.1)).cornerRadius(8)
                }
                if let mins = recipe.cook_time_minutes, mins > 0 {
                    Label("\(mins) min", systemImage: "clock").font(.caption).foregroundColor(.gray)
                }
            }
        }
        .padding(.horizontal, 20).padding(.top, 16)
    }

    @ViewBuilder var miseEnPlaceButton: some View {
        Button { showMiseEnPlace = true } label: {
            HStack {
                Text("👨‍🍳")
                Text("Mise en Place").font(.footnote).fontWeight(.semibold)
                Spacer()
                Image(systemName: "chevron.right").font(.caption2).foregroundColor(.gray)
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(Color(.systemGray6)).foregroundColor(.primary).cornerRadius(10)
        }
        .padding(.horizontal, 20).padding(.top, 12)
    }

    @ViewBuilder var viewRecipeButton: some View {
        Button { showFullRecipe = true } label: {
            HStack {
                Image(systemName: "book.fill").font(.caption)
                Text("View Recipe Details").font(.footnote).fontWeight(.semibold)
                Spacer()
                Image(systemName: "chevron.right").font(.caption2).foregroundColor(.orange.opacity(0.6))
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(Color.orange.opacity(0.08)).foregroundColor(.orange).cornerRadius(10)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.orange.opacity(0.2), lineWidth: 1))
        }
        .padding(.horizontal, 20).padding(.vertical, 12)
    }

    @ViewBuilder var memoriesSection: some View {
        CollapsibleSection(title: "❤️ Recipe Memories", isOpen: openSections.contains("memories"), onToggle: { toggleSection("memories") }) {
            VStack(alignment: .leading, spacing: 12) {
                Text("From handwritten recipe cards to family moments.")
                    .font(.caption).foregroundColor(.secondary).padding(.horizontal, 20)
                if memories.isEmpty {
                    Text("No memories yet — add a photo to preserve a meaningful moment.")
                        .font(.caption).foregroundColor(.gray).italic().padding(.horizontal, 20)
                } else {
                    VStack(spacing: 10) { ForEach(memories) { memory in memoryCard(memory) } }.padding(.horizontal, 20)
                }
                if memories.count < 3 {
                    PhotosPicker(selection: $selectedMemoryPhoto, matching: .images) {
                        HStack {
                            if isUploadingMemory { ProgressView().scaleEffect(0.8); Text("Uploading...").font(.footnote) }
                            else { Image(systemName: "plus.circle"); Text("Add Memory (\(memories.count)/3)").font(.footnote).fontWeight(.semibold) }
                        }
                        .frame(maxWidth: .infinity).padding(.vertical, 10)
                        .background(Color(.systemGray5)).foregroundColor(.primary).cornerRadius(10)
                    }
                    .padding(.horizontal, 20).disabled(isUploadingMemory)
                }
            }
            .padding(.bottom, 12)
        }
    }

    @ViewBuilder var specialNotesSection: some View {
        CollapsibleSection(title: "⭐ Special Notes", isOpen: openSections.contains("notes"), onToggle: { toggleSection("notes") }) {
            VStack(alignment: .leading, spacing: 8) {
                Text("What makes this recipe special to you.").font(.caption).foregroundColor(.secondary).padding(.horizontal, 20)
                TextEditor(text: $specialNotes).frame(minHeight: 100).padding(8)
                    .background(Color(.systemGray6)).cornerRadius(8).padding(.horizontal, 20)
                if notesSaved {
                    Text("✓ Saved").font(.caption).foregroundColor(.green).padding(.horizontal, 20)
                } else {
                    Button { Task { await saveSpecialNotes() } } label: {
                        Text(savingNotes ? "Saving..." : "Save Notes").font(.footnote).fontWeight(.semibold)
                            .frame(maxWidth: .infinity).padding(.vertical, 10)
                            .background(Color.orange).foregroundColor(.white).cornerRadius(10)
                    }
                    .disabled(savingNotes).padding(.horizontal, 20)
                }
            }
            .padding(.bottom, 12)
        }
    }

    @ViewBuilder var ingredientsSection: some View {
        if let ingredients = recipe.ingredients, !ingredients.isEmpty {
            CollapsibleSection(title: "🥘 Ingredients", isOpen: openSections.contains("ingredients"), onToggle: { toggleSection("ingredients") }) {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(Array(ingredients.enumerated()), id: \.offset) { _, ing in
                        HStack(alignment: .top, spacing: 8) {
                            Circle().fill(Color.orange).frame(width: 5, height: 5).padding(.top, 5)
                            VStack(alignment: .leading, spacing: 1) {
                                if let name = ing.name, !name.isEmpty { Text(name).font(.footnote) }
                                let qty = ing.amount ?? ing.measure ?? ""
                                if !qty.isEmpty { Text(qty).font(.caption).foregroundColor(.gray) }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20).padding(.bottom, 12)
            }
        }
    }

    @ViewBuilder var removeButton: some View {
        Button(role: .destructive) { showRemoveConfirm = true } label: {
            HStack(spacing: 6) {
                Image(systemName: "minus.circle")
                Text("Remove from Recipe Box").font(.footnote).fontWeight(.medium)
            }
            .frame(maxWidth: .infinity).padding(.vertical, 10)
            .background(Color.red.opacity(0.06)).foregroundColor(.red).cornerRadius(10)
        }
        .padding(.horizontal, 20).padding(.top, 20).padding(.bottom, 40)
    }

    @ViewBuilder func memoryCard(_ memory: RecipeMemory) -> some View {
        let imageUrl = memory.image_url
        let memoryId = memory.id
        VStack(alignment: .leading, spacing: 6) {
            ZStack(alignment: .topTrailing) {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image.resizable().scaledToFill()
                } placeholder: { Color.gray.opacity(0.15) }
                .frame(maxWidth: .infinity).frame(height: 160).clipped()
                .cornerRadius(12)
                Button { Task { await deleteMemory(memory) } } label: {
                    Image(systemName: "xmark.circle.fill").font(.title2).foregroundColor(.white)
                        .shadow(color: .black.opacity(0.4), radius: 2, x: 0, y: 1)
                }
                .padding(8)
            }
            .contentShape(Rectangle())
            .onTapGesture {
                if let m = memories.first(where: { $0.id == memoryId }) {
                    fullscreenItem = .memory(m)
                }
            }
            if let caption = memory.caption, !caption.isEmpty {
                Button { editingCaption = memory; editCaptionText = caption } label: {
                    HStack(spacing: 4) {
                        Text(caption).font(.caption).italic().foregroundColor(.secondary)
                        Image(systemName: "pencil").font(.caption2).foregroundColor(.orange)
                    }
                    .padding(.horizontal, 4)
                }
            } else {
                Button { editingCaption = memory; editCaptionText = "" } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "text.bubble").font(.caption2)
                        Text("Add caption...").font(.caption)
                    }
                    .foregroundColor(.orange).padding(.horizontal, 4)
                }
            }
        }
    }

    @ViewBuilder func fullscreenView(_ memory: RecipeMemory) -> some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()
            AsyncImage(url: URL(string: memory.image_url)) { image in
                image.resizable().scaledToFit().frame(maxWidth: .infinity, maxHeight: .infinity)
            } placeholder: { ProgressView().tint(.white) }
            Button { fullscreenItem = nil } label: {
                Image(systemName: "xmark.circle.fill").font(.title).foregroundColor(.white).padding(20)
            }
        }
    }

    func loadCardData() async {
        guard let user = authManager.user else { return }
        specialNotes = recipe.family_notes ?? ""
        do {
            let result: [RecipeMemory] = try await supabase.from("recipe_memories")
                .select().eq("user_id", value: user.id).eq("recipe_id", value: recipe.id)
                .order("sort_order", ascending: true).execute().value
            await MainActor.run { memories = result }
        } catch { print("loadCardData error:", error) }
    }

    func saveSpecialNotes() async {
        guard let user = authManager.user else { return }
        savingNotes = true
        do {
            try await supabase.from("personal_recipes").update(["family_notes": specialNotes])
                .eq("id", value: recipe.id).eq("user_id", value: user.id).execute()
            await MainActor.run { notesSaved = true }
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            await MainActor.run { notesSaved = false }
        } catch { print("saveSpecialNotes error:", error) }
        savingNotes = false
    }

    func uploadMemory() async {
        guard let item = selectedMemoryPhoto, let user = authManager.user,
              let data = try? await item.loadTransferable(type: Data.self), memories.count < 3 else { return }
        isUploadingMemory = true
        do {
            let memoryId = UUID()
            let path = "\(user.id)/memories/\(recipe.id)/\(memoryId).jpg"
            try await supabase.storage.from("personal_recipes").upload(path, data: data, options: .init(upsert: true))
            let url = try supabase.storage.from("personal_recipes").getPublicURL(path: path)
            let nextOrder = (memories.map { $0.sort_order ?? 0 }.max() ?? -1) + 1
            try await supabase.from("recipe_memories").insert([
                "id": memoryId.uuidString, "user_id": user.id.uuidString,
                "recipe_id": recipe.id.uuidString, "image_url": url.absoluteString,
                "sort_order": String(nextOrder)
            ]).execute()
            await loadCardData()
        } catch { print("uploadMemory error:", error) }
        isUploadingMemory = false
        selectedMemoryPhoto = nil
    }

    func updateCaption() async {
        guard let memory = editingCaption else { return }
        let captionText = editCaptionText
        print("updateCaption: saving '\(captionText)' to memory \(memory.id)")
        await MainActor.run {
            if let index = memories.firstIndex(where: { $0.id == memory.id }) {
                memories[index].caption = captionText
                print("updateCaption: local state updated, memories count \(memories.count)")
            } else {
                print("updateCaption: could not find memory in local array!")
            }
            editingCaption = nil
        }
        do {
            try await supabase.from("recipe_memories")
                .update(["caption": captionText])
                .eq("id", value: memory.id)
                .execute()
            print("updateCaption: Supabase save succeeded")
        } catch {
            print("updateCaption error:", error)
            await loadCardData()
        }
    }

    func deleteMemory(_ memory: RecipeMemory) async {
        guard let user = authManager.user else { return }
        do {
            try await supabase.from("recipe_memories").delete()
                .eq("id", value: memory.id).eq("user_id", value: user.id).execute()
            await MainActor.run { memories.removeAll { $0.id == memory.id } }
        } catch { print("deleteMemory error:", error) }
    }

    func removeFromBox() async {
        guard let user = authManager.user else { return }
        do {
            try await supabase.from("recipe_cards").delete()
                .eq("user_id", value: user.id).eq("recipe_id", value: recipe.id).execute()
            await MainActor.run { onRemoved?(); dismiss() }
        } catch { print("removeFromBox error:", error) }
    }
}

struct CollapsibleSection<Content: View>: View {
    let title: String
    let isOpen: Bool
    let onToggle: () -> Void
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: onToggle) {
                HStack {
                    Text(title).font(.subheadline).fontWeight(.semibold)
                    Spacer()
                    Image(systemName: isOpen ? "chevron.up" : "chevron.down").font(.caption).foregroundColor(.gray)
                }
                .padding(.horizontal, 20).padding(.vertical, 14)
            }
            .buttonStyle(.plain)
            if isOpen { content }
        }
    }
}
