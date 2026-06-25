import SwiftUI
import Supabase

struct ShoppingItem: Identifiable, Codable {
    let id: UUID
    var user_id: UUID?
    var ingredient: String?
    var recipe_title: String?
    var checked: Bool?
    var store_id: UUID?
    var created_at: Date?
}

struct Store: Identifiable, Codable {
    let id: UUID
    var user_id: UUID
    var name: String
    var emoji: String?
    var website_url: String?
    var sort_order: Int?
    var is_default: Bool?
    var created_at: Date?
}

struct AisleBucket {
    let key: String
    let label: String
    let emoji: String
    let pattern: String

    func matches(_ text: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else { return false }
        return regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil
    }

    static let all: [AisleBucket] = [
        AisleBucket(key: "produce", label: "Fresh Produce", emoji: "🥬",
            pattern: "lettuce|spinach|kale|broccoli|carrot|celery|onion|garlic|potato|tomato|cucumber|pepper|mushroom|avocado|apple|banana|orange|lemon|lime|berry|herb|parsley|cilantro|basil"),
        AisleBucket(key: "meat_seafood", label: "Meat & Seafood", emoji: "🥩",
            pattern: "chicken|turkey|beef|steak|pork|bacon|sausage|ham|lamb|fish|salmon|tuna|shrimp|scallop|seafood"),
        AisleBucket(key: "frozen", label: "Frozen", emoji: "🧊",
            pattern: "frozen|ice cream|gelato|sorbet"),
        AisleBucket(key: "dairy", label: "Dairy & Eggs", emoji: "🥛",
            pattern: "milk|cream|buttermilk|yogurt|cheese|cheddar|mozzarella|parmesan|feta|butter|ghee|egg"),
        AisleBucket(key: "bakery", label: "Bakery", emoji: "🍞",
            pattern: "bread|loaf|baguette|sourdough|pita|naan|tortilla|bun|roll|croissant|bagel|muffin"),
        AisleBucket(key: "beverages", label: "Beverages", emoji: "🥤",
            pattern: "water|juice|tea|coffee|wine|beer|soda|kombucha|broth|stock"),
        AisleBucket(key: "pantry", label: "Pantry", emoji: "🥫",
            pattern: "flour|sugar|salt|pepper|baking soda|baking powder|yeast|cornstarch|rice|pasta|bean|chickpea|lentil|tomato sauce|olive oil|vinegar|soy sauce|honey|maple syrup|spice|cumin|paprika|cinnamon|vanilla|chocolate|nuts|almond|walnut|oat"),
        AisleBucket(key: "household", label: "Household", emoji: "🛒",
            pattern: "paper towel|toilet paper|dish soap|trash bag|foil|plastic wrap")
    ]

    static let other = AisleBucket(key: "other", label: "Other", emoji: "❓", pattern: "")
}

struct ShoppingListView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.horizontalSizeClass) var sizeClass
    @EnvironmentObject var authManager: AuthManager
    @State private var items: [ShoppingItem] = []
    @State private var stores: [Store] = []
    @State private var isLoading = true
    @State private var newItem = ""
    @State private var viewMode: ViewMode = .byStore
    @State private var showStoreManager = false
    @State private var isCleaningUp = false

    enum ViewMode { case byStore, byAisle, list }

    var unchecked: [ShoppingItem] { items.filter { !($0.checked ?? false) } }
    var checked: [ShoppingItem] { items.filter { $0.checked ?? false } }

    var body: some View {
        VStack(spacing: 0) {

            // ── Banner + Back ──
            ZStack(alignment: .bottomLeading) {
                Image("shopping-list-hero")
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
                if !unchecked.isEmpty {
                    Button { Task { await aiCleanup() } } label: {
                        HStack(spacing: 5) {
                            Image(systemName: isCleaningUp ? "clock" : "wand.and.stars").font(.caption)
                            Text(isCleaningUp ? "Tidying..." : "AI Tidy").font(.caption).fontWeight(.semibold)
                        }
                        .foregroundColor(.orange)
                        .padding(.horizontal, 12).padding(.vertical, 7)
                        .background(Color.orange.opacity(0.1)).cornerRadius(10)
                    }
                    .disabled(isCleaningUp)

                    Button { printList() } label: {
                        HStack(spacing: 5) {
                            Image(systemName: "printer").font(.caption)
                            Text("Print").font(.caption).fontWeight(.semibold)
                        }
                        .foregroundColor(.primary)
                        .padding(.horizontal, 12).padding(.vertical, 7)
                        .background(Color(.systemGray6)).cornerRadius(10)
                    }
                }
                Spacer()
                Button { showStoreManager = true } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "building.2").font(.caption)
                        Text("My Stores").font(.caption).fontWeight(.semibold)
                    }
                    .foregroundColor(.primary)
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .background(Color(.systemGray6)).cornerRadius(10)
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 8)

            Picker("View", selection: $viewMode) {
                Text("🏬 Store").tag(ViewMode.byStore)
                Text("🥬 Aisle").tag(ViewMode.byAisle)
                Text("📋 List").tag(ViewMode.list)
            }
            .pickerStyle(.segmented).padding(.horizontal).padding(.vertical, 8)
            Divider()

            if isLoading {
                Spacer(); ProgressView(); Spacer()
            } else {
                List {
                    HStack {
                        TextField("Add item...", text: $newItem)
                            .onSubmit { Task { await addItem() } }
                        Button { Task { await addItem() } } label: {
                            Image(systemName: "plus.circle.fill").foregroundColor(.orange).font(.title3)
                        }
                        .disabled(newItem.trimmingCharacters(in: .whitespaces).isEmpty)
                    }

                    switch viewMode {
                    case .byStore: byStoreContent
                    case .byAisle: byAisleContent
                    case .list: listContent
                    }

                    if !checked.isEmpty {
                        Button(role: .destructive) {
                            Task { await clearChecked() }
                        } label: {
                            Label("Clear completed (\(checked.count))", systemImage: "trash")
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .navigationBarHidden(sizeClass != .regular)
        .frame(maxWidth: sizeClass == .regular ? 700 : .infinity)
        .frame(maxWidth: .infinity)
        .sheet(isPresented: $showStoreManager) {
            StoreManagerView(stores: $stores).environmentObject(authManager)
        }
        .task { await loadAll() }
    }

    @ViewBuilder var byStoreContent: some View {
        let unsorted = unchecked.filter { $0.store_id == nil }
        if !unsorted.isEmpty {
            Section("🛒 Unsorted") {
                ForEach(unsorted) { item in
                    ShoppingItemRow(item: item, stores: stores,
                        onToggle: { Task { await toggleItem(item) } },
                        onAssignStore: { storeId in Task { await assignStore(item, storeId: storeId) } })
                }
                .onDelete { idx in Task { await deleteItems(at: idx, from: unsorted) } }
            }
        }
        ForEach(stores) { store in
            let storeItems = unchecked.filter { $0.store_id == store.id }
            if !storeItems.isEmpty {
                Section("\(store.emoji ?? "🏬") \(store.name)") {
                    ForEach(storeItems) { item in
                        ShoppingItemRow(item: item, stores: stores,
                            onToggle: { Task { await toggleItem(item) } },
                            onAssignStore: { storeId in Task { await assignStore(item, storeId: storeId) } })
                    }
                    .onDelete { idx in Task { await deleteItems(at: idx, from: storeItems) } }
                }
            }
        }
        if !checked.isEmpty {
            Section("✓ Done") {
                ForEach(checked) { item in
                    ShoppingItemRow(item: item, stores: stores,
                        onToggle: { Task { await toggleItem(item) } },
                        onAssignStore: { _ in })
                }
                .onDelete { idx in Task { await deleteItems(at: idx, from: checked) } }
            }
        }
    }

    @ViewBuilder var byAisleContent: some View {
        let groups = groupByAisle(unchecked)
        ForEach(groups, id: \.aisle.key) { group in
            Section("\(group.aisle.emoji) \(group.aisle.label)") {
                ForEach(group.items) { item in
                    ShoppingItemRow(item: item, stores: stores,
                        onToggle: { Task { await toggleItem(item) } },
                        onAssignStore: { _ in })
                }
                .onDelete { idx in Task { await deleteItems(at: idx, from: group.items) } }
            }
        }
        if !checked.isEmpty {
            Section("✓ Done") {
                ForEach(checked) { item in
                    ShoppingItemRow(item: item, stores: stores,
                        onToggle: { Task { await toggleItem(item) } },
                        onAssignStore: { _ in })
                }
            }
        }
    }

    @ViewBuilder var listContent: some View {
        if !unchecked.isEmpty {
            Section("To Buy") {
                ForEach(unchecked) { item in
                    ShoppingItemRow(item: item, stores: stores,
                        onToggle: { Task { await toggleItem(item) } },
                        onAssignStore: { _ in })
                }
                .onDelete { idx in Task { await deleteItems(at: idx, from: unchecked) } }
            }
        }
        if !checked.isEmpty {
            Section("Done") {
                ForEach(checked) { item in
                    ShoppingItemRow(item: item, stores: stores,
                        onToggle: { Task { await toggleItem(item) } },
                        onAssignStore: { _ in })
                }
                .onDelete { idx in Task { await deleteItems(at: idx, from: checked) } }
            }
        }
    }

    func aiCleanup() async {
        guard !unchecked.isEmpty, let user = authManager.user else { return }
        isCleaningUp = true
        let itemList = unchecked.compactMap { $0.ingredient }.joined(separator: ", ")
        do {
            guard let url = URL(string: "https://recipe.mycompanionapps.com/api/chef") else { return }
            var request = URLRequest(url: url, timeoutInterval: 60)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            let prompt = "Reply with ONLY a JSON array, nothing else. No explanation. No markdown. Clean up this shopping list — combine duplicates, convert recipe measurements to practical shopping amounts (6 tbsp butter = 1 stick butter, 1/2 cup wine = 1 bottle), merge same ingredients. Example output: [\"butter (1 stick)\",\"garlic (1 head)\"]. List: " + itemList
            let payload: [String: Any] = [
                "messages": [["role": "user", "content": prompt]],
                "user_id": user.id.uuidString
            ]
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let reply = json["reply"] as? String {
                var text = reply
                if let start = text.range(of: "["), let end = text.range(of: "]", options: .backwards) {
                    text = String(text[start.lowerBound...end.upperBound])
                }
                if let replyData = text.data(using: .utf8),
                   let cleanedItems = try? JSONSerialization.jsonObject(with: replyData) as? [String],
                   !cleanedItems.isEmpty {
                    for item in unchecked {
                        try? await supabase.from("shopping_list").delete().eq("id", value: item.id).execute()
                    }
                    let defaultStore = stores.first { $0.is_default == true }
                    for ingredient in cleanedItems {
                        var insert: [String: AnyJSON] = [
                            "user_id": .string(user.id.uuidString),
                            "ingredient": .string(ingredient),
                            "checked": .bool(false)
                        ]
                        if let store = defaultStore { insert["store_id"] = .string(store.id.uuidString) }
                        try? await supabase.from("shopping_list").insert(insert).execute()
                    }
                    await loadAll()
                }
            }
        } catch { print("aiCleanup error:", error) }
        await MainActor.run { isCleaningUp = false }
    }

    func printList() {
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: 612, height: 792))
        let data = renderer.pdfData { ctx in
            ctx.beginPage()
            let orange = UIColor(red: 0.93, green: 0.35, blue: 0.12, alpha: 1)
            let titleAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.boldSystemFont(ofSize: 22), .foregroundColor: orange]
            let sectionAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.boldSystemFont(ofSize: 13), .foregroundColor: orange]
            let itemAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 13), .foregroundColor: UIColor.black]
            let recipeAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 11), .foregroundColor: UIColor.gray]
            var y: CGFloat = 40
            "Shopping List".draw(at: CGPoint(x: 40, y: y), withAttributes: titleAttrs); y += 32
            DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .none).draw(at: CGPoint(x: 40, y: y), withAttributes: recipeAttrs); y += 24
            func drawDivider() {
                let path = UIBezierPath(); path.move(to: CGPoint(x: 40, y: y)); path.addLine(to: CGPoint(x: 572, y: y))
                UIColor.lightGray.setStroke(); path.lineWidth = 0.5; path.stroke(); y += 12
            }
            func drawItem(_ item: ShoppingItem) {
                if y > 740 { ctx.beginPage(); y = 40 }
                let box = CGRect(x: 40, y: y + 2, width: 12, height: 12)
                UIColor.lightGray.setStroke(); UIBezierPath(rect: box).stroke()
                (item.ingredient ?? "").draw(at: CGPoint(x: 62, y: y), withAttributes: itemAttrs); y += 20
                if let recipe = item.recipe_title, !recipe.isEmpty {
                    ("  from: \(recipe)").draw(at: CGPoint(x: 62, y: y), withAttributes: recipeAttrs); y += 16
                }
            }
            switch viewMode {
            case .byStore:
                let unsorted = unchecked.filter { $0.store_id == nil }
                if !unsorted.isEmpty { drawDivider(); "🛒 Unsorted".draw(at: CGPoint(x: 40, y: y), withAttributes: sectionAttrs); y += 20; unsorted.forEach { drawItem($0) }; y += 8 }
                for store in stores {
                    let si = unchecked.filter { $0.store_id == store.id }
                    if !si.isEmpty { drawDivider(); "\(store.emoji ?? "🏬") \(store.name)".draw(at: CGPoint(x: 40, y: y), withAttributes: sectionAttrs); y += 20; si.forEach { drawItem($0) }; y += 8 }
                }
            case .byAisle:
                for group in groupByAisle(unchecked) { drawDivider(); "\(group.aisle.emoji) \(group.aisle.label)".draw(at: CGPoint(x: 40, y: y), withAttributes: sectionAttrs); y += 20; group.items.forEach { drawItem($0) }; y += 8 }
            case .list:
                drawDivider(); unchecked.forEach { drawItem($0) }
            }
        }
        let av = UIActivityViewController(activityItems: [data], applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first, let rootVC = window.rootViewController {
            av.popoverPresentationController?.sourceView = window
            av.popoverPresentationController?.sourceRect = CGRect(x: window.bounds.midX, y: window.bounds.midY, width: 0, height: 0)
            rootVC.present(av, animated: true)
        }
    }

    func groupByAisle(_ items: [ShoppingItem]) -> [(aisle: AisleBucket, items: [ShoppingItem])] {
        var buckets: [String: [ShoppingItem]] = [:]
        for item in items {
            let lower = (item.ingredient ?? "").lowercased()
            let aisle = AisleBucket.all.first { $0.matches(lower) } ?? AisleBucket.other
            if buckets[aisle.key] == nil { buckets[aisle.key] = [] }
            buckets[aisle.key]!.append(item)
        }
        var groups: [(aisle: AisleBucket, items: [ShoppingItem])] = []
        for aisle in AisleBucket.all { if let g = buckets[aisle.key], !g.isEmpty { groups.append((aisle: aisle, items: g)) } }
        if let other = buckets["other"], !other.isEmpty { groups.append((aisle: AisleBucket.other, items: other)) }
        return groups
    }

    func loadAll() async {
        guard let user = authManager.user else { return }
        do {
            async let itemsResult: [ShoppingItem] = supabase.from("shopping_list").select()
                .eq("user_id", value: user.id).order("created_at", ascending: true).execute().value
            async let storesResult: [Store] = supabase.from("stores").select()
                .eq("user_id", value: user.id).order("sort_order", ascending: true).execute().value
            let (itemsList, storesList) = try await (itemsResult, storesResult)
            await MainActor.run { items = itemsList; stores = storesList; isLoading = false }
        } catch { print("loadAll error:", error); await MainActor.run { isLoading = false } }
    }

    func addItem() async {
        guard let user = authManager.user else { return }
        let text = newItem.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        await MainActor.run { newItem = "" }
        do {
            let defaultStore = stores.first { $0.is_default == true }
            var insert: [String: AnyJSON] = ["user_id": .string(user.id.uuidString), "ingredient": .string(text), "checked": .bool(false)]
            if let store = defaultStore { insert["store_id"] = .string(store.id.uuidString) }
            try await supabase.from("shopping_list").insert(insert).execute()
            await loadAll()
        } catch { print("addItem error:", error) }
    }

    func toggleItem(_ item: ShoppingItem) async {
        do {
            try await supabase.from("shopping_list").update(["checked": !(item.checked ?? false)]).eq("id", value: item.id).execute()
            await loadAll()
        } catch { print("toggleItem error:", error) }
    }

    func assignStore(_ item: ShoppingItem, storeId: UUID?) async {
        do {
            if let storeId = storeId {
                try await supabase.from("shopping_list").update(["store_id": storeId.uuidString]).eq("id", value: item.id).execute()
            } else {
                try await supabase.from("shopping_list").update(["store_id": AnyJSON.null]).eq("id", value: item.id).execute()
            }
            await loadAll()
        } catch { print("assignStore error:", error) }
    }

    func deleteItems(at indexSet: IndexSet, from list: [ShoppingItem]) async {
        for index in indexSet { try? await supabase.from("shopping_list").delete().eq("id", value: list[index].id).execute() }
        await loadAll()
    }

    func clearChecked() async {
        guard let user = authManager.user else { return }
        try? await supabase.from("shopping_list").delete().eq("user_id", value: user.id).eq("checked", value: true).execute()
        await loadAll()
    }
}

struct ShoppingItemRow: View {
    let item: ShoppingItem
    let stores: [Store]
    let onToggle: () -> Void
    let onAssignStore: (UUID?) -> Void
    @State private var showStorePicker = false

    var body: some View {
        HStack(spacing: 12) {
            Button { onToggle() } label: {
                Image(systemName: item.checked ?? false ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(item.checked ?? false ? .green : .gray).font(.title3)
            }
            .buttonStyle(.plain)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.ingredient ?? "").strikethrough(item.checked ?? false).foregroundColor(item.checked ?? false ? .gray : .primary)
                if let recipe = item.recipe_title, !recipe.isEmpty {
                    Text(recipe).font(.caption).foregroundColor(.gray)
                }
            }
            Spacer()
            if !stores.isEmpty && !(item.checked ?? false) {
                Button { showStorePicker = true } label: {
                    if let storeId = item.store_id, let store = stores.first(where: { $0.id == storeId }) {
                        Text(store.emoji ?? "🏬").font(.caption)
                    } else {
                        Image(systemName: "building.2").font(.caption).foregroundColor(.gray)
                    }
                }
                .buttonStyle(.plain)
                .confirmationDialog("Assign to Store", isPresented: $showStorePicker, titleVisibility: .visible) {
                    ForEach(stores) { store in Button("\(store.emoji ?? "🏬") \(store.name)") { onAssignStore(store.id) } }
                    Button("No Store") { onAssignStore(nil) }
                    Button("Cancel", role: .cancel) {}
                }
            }
        }
    }
}

struct StoreManagerView: View {
    @Binding var stores: [Store]
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var showAddStore = false
    @State private var newStoreName = ""
    @State private var newStoreEmoji = "🏬"

    var body: some View {
        NavigationView {
            List {
                ForEach(stores) { store in
                    HStack {
                        Text(store.emoji ?? "🏬").font(.title3)
                        Text(store.name)
                        Spacer()
                        if store.is_default == true {
                            Text("Default").font(.caption).foregroundColor(.orange)
                                .padding(.horizontal, 8).padding(.vertical, 2)
                                .background(Color.orange.opacity(0.1)).cornerRadius(6)
                        } else {
                            Button("Set Default") { Task { await setDefaultStore(store) } }
                                .font(.caption).foregroundColor(.blue)
                        }
                    }
                }
                .onDelete { indexSet in Task { await deleteStore(at: indexSet) } }

                if showAddStore {
                    VStack(spacing: 8) {
                        HStack {
                            TextField("Emoji", text: $newStoreEmoji).frame(width: 50).textFieldStyle(.roundedBorder)
                            TextField("Store name", text: $newStoreName).textFieldStyle(.roundedBorder)
                        }
                        HStack {
                            Button("Cancel") { showAddStore = false }.foregroundColor(.gray)
                            Spacer()
                            Button("Add") { Task { await addStore() } }
                                .fontWeight(.semibold).foregroundColor(.orange)
                                .disabled(newStoreName.trimmingCharacters(in: .whitespaces).isEmpty)
                        }
                    }
                }
            }
            .navigationTitle("My Stores")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Done") { dismiss() } }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { newStoreName = ""; newStoreEmoji = "🏬"; showAddStore = true } label: { Image(systemName: "plus") }
                }
            }
        }
    }

    func setDefaultStore(_ store: Store) async {
        guard let user = authManager.user else { return }
        do {
            // Clear all defaults first
            try await supabase.from("stores").update(["is_default": false])
                .eq("user_id", value: user.id).execute()
            // Set new default
            try await supabase.from("stores").update(["is_default": true])
                .eq("id", value: store.id).execute()
            await MainActor.run {
                for i in stores.indices { stores[i].is_default = false }
                if let idx = stores.firstIndex(where: { $0.id == store.id }) {
                    stores[idx].is_default = true
                }
            }
        } catch { print("setDefaultStore error:", error) }
    }

    func addStore() async {
        guard let user = authManager.user else { return }
        let name = newStoreName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        do {
            let newStore = Store(id: UUID(), user_id: user.id, name: name, emoji: newStoreEmoji,
                website_url: nil, sort_order: stores.count, is_default: stores.isEmpty, created_at: nil)
            try await supabase.from("stores").insert(newStore).execute()
            await MainActor.run { stores.append(newStore); showAddStore = false; newStoreName = "" }
        } catch { print("addStore error:", error) }
    }

    func deleteStore(at indexSet: IndexSet) async {
        for index in indexSet {
            try? await supabase.from("stores").delete().eq("id", value: stores[index].id).execute()
            await MainActor.run { stores.remove(at: index) }
        }
    }
}
