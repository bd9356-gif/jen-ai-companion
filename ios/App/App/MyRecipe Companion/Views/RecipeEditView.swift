import SwiftUI
import Supabase

struct RecipeEditView: View {
    let recipe: Recipe
    var onSave: (Recipe) -> Void
    @Environment(\.dismiss) var dismiss

    @State private var title: String
    @State private var description: String
    @State private var category: String
    @State private var instructions: String
    @State private var familyNotes: String
    @State private var prepMinutes: String
    @State private var cookMinutes: String
    @State private var servings: String
    @State private var ingredients: [EditableIngredient]
    @State private var tags: [String]
    @State private var newTag = ""
    @State private var isSaving = false
    @State private var errorMessage = ""

    struct EditableIngredient: Identifiable {
        let id = UUID()
        var name: String
        var measure: String
    }

    let curatedTags = [
        ("🍽 Meal", ["breakfast", "lunch", "dinner", "dessert", "side", "snack"]),
        ("🥩 Protein", ["chicken", "beef", "seafood", "pasta", "vegetarian"]),
        ("✨ Style", ["quick", "comfort", "healthy", "baking", "holiday"])
    ]

    init(recipe: Recipe, onSave: @escaping (Recipe) -> Void) {
        self.recipe = recipe
        self.onSave = onSave
        _title = State(initialValue: recipe.title)
        _description = State(initialValue: recipe.description ?? "")
        _category = State(initialValue: recipe.category ?? "")
        _instructions = State(initialValue: recipe.instructions ?? "")
        _familyNotes = State(initialValue: recipe.family_notes ?? "")
        _prepMinutes = State(initialValue: recipe.prep_time_minutes.map { String($0) } ?? "")
        _cookMinutes = State(initialValue: recipe.cook_time_minutes.map { String($0) } ?? "")
        _servings = State(initialValue: recipe.servings.map { String($0) } ?? "")
        _tags = State(initialValue: recipe.tags ?? [])
        _ingredients = State(initialValue: (recipe.ingredients ?? []).map {
            EditableIngredient(name: $0.name ?? "", measure: $0.measure ?? $0.amount ?? "")
        })
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Recipe Details") {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Title").font(.caption).foregroundColor(.gray)
                        TextField("Recipe title", text: $title)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Description").font(.caption).foregroundColor(.gray)
                        TextField("Short description", text: $description, axis: .vertical).lineLimit(3)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Category").font(.caption).foregroundColor(.gray)
                        TextField("e.g. Dinner, Dessert", text: $category)
                    }
                }

                Section {
                    ForEach(curatedTags, id: \.0) { group, groupTags in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(group).font(.caption).foregroundColor(.gray)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    ForEach(groupTags, id: \.self) { tag in
                                        let selected = tags.contains(tag)
                                        Button {
                                            if selected { tags.removeAll { $0 == tag } }
                                            else { tags.append(tag) }
                                        } label: {
                                            Text(tag)
                                                .font(.caption).fontWeight(.semibold)
                                                .padding(.horizontal, 10).padding(.vertical, 5)
                                                .background(selected ? Color.orange : Color(.systemGray5))
                                                .foregroundColor(selected ? .white : .primary)
                                                .cornerRadius(12)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    // Custom tags
                    if !tags.filter({ !curatedTags.flatMap(\.1).contains($0) }).isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Custom").font(.caption).foregroundColor(.gray)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    ForEach(tags.filter { !curatedTags.flatMap(\.1).contains($0) }, id: \.self) { tag in
                                        HStack(spacing: 4) {
                                            Text(tag).font(.caption).fontWeight(.semibold)
                                            Button { tags.removeAll { $0 == tag } } label: {
                                                Image(systemName: "xmark").font(.caption2)
                                            }
                                        }
                                        .padding(.horizontal, 10).padding(.vertical, 5)
                                        .background(Color.orange)
                                        .foregroundColor(.white)
                                        .cornerRadius(12)
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    HStack {
                        TextField("Add custom tag...", text: $newTag)
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                            .onSubmit { addCustomTag() }
                        Button("Add") { addCustomTag() }
                            .foregroundColor(.orange)
                            .disabled(newTag.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                } header: {
                    Text("Tags")
                }

                Section {
                    ForEach($ingredients) { $ingredient in
                        HStack(spacing: 8) {
                            TextField("Qty", text: $ingredient.measure).frame(width: 80).foregroundColor(.gray)
                            TextField("Ingredient", text: $ingredient.name)
                        }
                    }
                    .onDelete { indexSet in ingredients.remove(atOffsets: indexSet) }
                    .onMove { from, to in ingredients.move(fromOffsets: from, toOffset: to) }
                    Button { ingredients.append(EditableIngredient(name: "", measure: "")) } label: {
                        Label("Add Ingredient", systemImage: "plus.circle").foregroundColor(.orange)
                    }
                } header: { Text("Ingredients") }
                footer: { Text("Swipe left to delete, drag to reorder").font(.caption) }

                Section("Instructions") {
                    TextEditor(text: $instructions).frame(minHeight: 150)
                }

                Section("Notes") {
                    TextEditor(text: $familyNotes).frame(minHeight: 80)
                }

                Section("Time & Servings") {
                    HStack {
                        Text("Prep (min)"); Spacer()
                        TextField("0", text: $prepMinutes).keyboardType(.numberPad).multilineTextAlignment(.trailing).frame(width: 60)
                    }
                    HStack {
                        Text("Cook (min)"); Spacer()
                        TextField("0", text: $cookMinutes).keyboardType(.numberPad).multilineTextAlignment(.trailing).frame(width: 60)
                    }
                    HStack {
                        Text("Servings"); Spacer()
                        TextField("0", text: $servings).keyboardType(.numberPad).multilineTextAlignment(.trailing).frame(width: 60)
                    }
                }

                if !errorMessage.isEmpty {
                    Section { Text(errorMessage).foregroundColor(.red).font(.caption) }
                }
            }
            .navigationTitle("Edit Recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") { Task { await saveRecipe() } }
                        .fontWeight(.semibold)
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                }
            }
        }
    }

    func addCustomTag() {
        let tag = newTag.trimmingCharacters(in: .whitespaces).lowercased()
        if !tag.isEmpty && !tags.contains(tag) { tags.append(tag) }
        newTag = ""
    }

    func saveRecipe() async {
        isSaving = true
        do {
            let filteredIngredients = ingredients.filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }
            let ingredientsAnyJSON: AnyJSON = .array(filteredIngredients.map { ing in
                .object(["name": .string(ing.name), "measure": .string(ing.measure), "amount": .string(ing.measure)])
            })
            let tagsAnyJSON: AnyJSON = .array(tags.map { .string($0) })

            let updateData: [String: AnyJSON] = [
                "title": .string(title),
                "description": .string(description),
                "category": .string(category),
                "instructions": .string(instructions),
                "family_notes": .string(familyNotes),
                "prep_time_minutes": .string(prepMinutes.isEmpty ? "0" : prepMinutes),
                "cook_time_minutes": .string(cookMinutes.isEmpty ? "0" : cookMinutes),
                "servings": .string(servings.isEmpty ? "0" : servings),
                "ingredients": ingredientsAnyJSON,
                "tags": tagsAnyJSON
            ]

            try await supabase.from("personal_recipes").update(updateData).eq("id", value: recipe.id).execute()

            let updatedIngredients = filteredIngredients.map {
                Ingredient(name: $0.name, amount: $0.measure, measure: $0.measure, unit: nil)
            }
            let updated = Recipe(
                id: recipe.id, title: title, description: description,
                ingredients: updatedIngredients, instructions: instructions,
                photo_url: recipe.photo_url, source_url: recipe.source_url,
                family_notes: familyNotes, created_at: recipe.created_at,
                user_id: recipe.user_id, deleted_at: recipe.deleted_at,
                is_favorite: recipe.is_favorite, category: category,
                prep_time_minutes: Int(prepMinutes), cook_time_minutes: Int(cookMinutes),
                servings: Int(servings), tags: tags
            )
            onSave(updated)
            dismiss()
        } catch {
            errorMessage = "Save failed: \(error.localizedDescription)"
        }
        isSaving = false
    }
}
