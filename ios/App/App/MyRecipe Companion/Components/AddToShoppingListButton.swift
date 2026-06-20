import SwiftUI
import Supabase

struct AddToShoppingListButton: View {
    let recipe: Recipe
    @EnvironmentObject var authManager: AuthManager
    @State private var showPicker = false

    var body: some View {
        Button { showPicker = true } label: {
            HStack {
                Image(systemName: "cart.badge.plus")
                    .font(.subheadline).foregroundColor(.blue)
                Text("Add to Shopping List")
                    .font(.subheadline).fontWeight(.semibold).foregroundColor(.primary)
                Spacer()
                Image(systemName: "chevron.right").font(.caption2).foregroundColor(.gray)
            }
            .padding(.horizontal, 14).padding(.vertical, 11)
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
        .sheet(isPresented: $showPicker) {
            ShoppingIngredientPickerView(recipe: recipe).environmentObject(authManager)
        }
    }
}

struct ShoppingIngredientPickerView: View {
    let recipe: Recipe
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var selected: Set<Int> = []
    @State private var isAdding = false
    @State private var added = false
    @State private var defaultStoreId: UUID? = nil

    var ingredients: [Ingredient] { recipe.ingredients ?? [] }

    var body: some View {
        NavigationView {
            List {
                Section {
                    Button {
                        if selected.count == ingredients.count {
                            selected = []
                        } else {
                            selected = Set(0..<ingredients.count)
                        }
                    } label: {
                        HStack {
                            Image(systemName: selected.count == ingredients.count ? "checkmark.circle.fill" : "circle")
                                .foregroundColor(.orange)
                            Text(selected.count == ingredients.count ? "Deselect All" : "Select All")
                                .foregroundColor(.orange)
                        }
                    }
                    .buttonStyle(.plain)
                }

                Section("Ingredients") {
                    ForEach(Array(ingredients.enumerated()), id: \.offset) { index, ingredient in
                        Button {
                            if selected.contains(index) { selected.remove(index) }
                            else { selected.insert(index) }
                        } label: {
                            HStack {
                                Image(systemName: selected.contains(index) ? "checkmark.circle.fill" : "circle")
                                    .foregroundColor(selected.contains(index) ? .orange : .gray)
                                VStack(alignment: .leading, spacing: 2) {
                                    if let name = ingredient.name, !name.isEmpty {
                                        Text(name).font(.subheadline).foregroundColor(.primary)
                                    }
                                    if let qty = ingredient.amount ?? ingredient.measure, !qty.isEmpty {
                                        Text(qty).font(.caption).foregroundColor(.gray)
                                    }
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle("Add to Shopping List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { Task { await addToList() } } label: {
                        if isAdding { ProgressView().scaleEffect(0.8) }
                        else if added { Text("Added ✓").foregroundColor(.green) }
                        else {
                            Text("Add \(selected.count)").fontWeight(.semibold)
                                .foregroundColor(selected.isEmpty ? .gray : .orange)
                        }
                    }
                    .disabled(selected.isEmpty || isAdding || added)
                }
            }
            .onAppear {
                selected = Set(0..<ingredients.count)
                Task { await loadDefaultStore() }
            }
        }
    }

    func loadDefaultStore() async {
        guard let user = authManager.user else { return }
        do {
            let stores: [Store] = try await supabase.from("stores").select()
                .eq("user_id", value: user.id).eq("is_default", value: true)
                .limit(1).execute().value
            await MainActor.run { defaultStoreId = stores.first?.id }
        } catch { print("loadDefaultStore error:", error) }
    }

    func addToList() async {
        guard let user = authManager.user, !selected.isEmpty else { return }
        isAdding = true
        do {
            let itemsToAdd: [AnyJSON] = selected.sorted().compactMap { index -> AnyJSON? in
                guard index < ingredients.count else { return nil }
                let ingredient = ingredients[index]
                guard let name = ingredient.name, !name.isEmpty else { return nil }
                let qty = ingredient.amount ?? ingredient.measure ?? ""
                let fullText = qty.isEmpty ? name : "\(qty) \(name)"
                var obj: [String: AnyJSON] = [
                    "user_id": .string(user.id.uuidString),
                    "ingredient": .string(fullText),
                    "recipe_title": .string(recipe.title),
                    "checked": .bool(false)
                ]
                if let storeId = defaultStoreId { obj["store_id"] = .string(storeId.uuidString) }
                return .object(obj)
            }
            try await supabase.from("shopping_list").insert(itemsToAdd).execute()
            await MainActor.run { isAdding = false; added = true }
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            dismiss()
        } catch {
            print("addToList error:", error)
            await MainActor.run { isAdding = false }
        }
    }
}
