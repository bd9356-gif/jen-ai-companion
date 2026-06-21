import SwiftUI
import Supabase
import PhotosUI

struct RecipeEditView: View {
    @Environment(\.horizontalSizeClass) var sizeClass
    let recipe: Recipe
    var onSave: (Recipe) -> Void
    var onDelete: ((UUID) -> Void)? = nil
    @Environment(\.dismiss) var dismiss
    @State private var showDeleteConfirm = false

    @State private var title: String
    @State private var description: String
    @State private var category: String
    @State private var instructions: String
    @State private var instructionSteps: [String]
    @State private var familyNotes: String
    @State private var prepMinutes: String
    @State private var cookMinutes: String
    @State private var servings: String
    @State private var ingredients: [EditableIngredient]
    @State private var tags: [String]
    @State private var newTag = ""
    @State private var isSaving = false
    @State private var errorMessage = ""

    // ── Photo ──
    @State private var selectedPhoto: PhotosPickerItem? = nil
    @State private var photoPreview: UIImage? = nil
    @State private var newPhotoUrl: String? = nil
    @State private var isUploadingPhoto = false

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

    init(recipe: Recipe, onSave: @escaping (Recipe) -> Void, onDelete: ((UUID) -> Void)? = nil) {
        self.recipe = recipe
        self.onSave = onSave
        self.onDelete = onDelete
        _title = State(initialValue: recipe.title)
        _description = State(initialValue: recipe.description ?? "")
        _category = State(initialValue: recipe.category ?? "")
        _instructions = State(initialValue: recipe.instructions ?? "")
        let steps = (recipe.instructions ?? "")
            .components(separatedBy: "\n")
            .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        _instructionSteps = State(initialValue: steps.isEmpty ? [""] : steps)
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

                // ── Photo Section ──
                Section("Recipe Photo") {
                    VStack(spacing: 10) {
                        // Preview
                        if let preview = photoPreview {
                            Image(uiImage: preview)
                                .resizable().scaledToFill()
                                .frame(maxWidth: .infinity).frame(height: 160)
                                .clipped().cornerRadius(10)
                        } else if let photoUrl = recipe.photo_url, !photoUrl.isEmpty, let url = URL(string: photoUrl) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image.resizable().scaledToFill()
                                        .frame(maxWidth: .infinity).frame(height: 160)
                                        .clipped().cornerRadius(10)
                                default:
                                    photoPlaceholder
                                }
                            }
                        } else {
                            photoPlaceholder
                        }

                        // Picker button
                        PhotosPicker(selection: $selectedPhoto, matching: .images) {
                            HStack(spacing: 6) {
                                if isUploadingPhoto {
                                    ProgressView().scaleEffect(0.8)
                                    Text("Uploading...").font(.subheadline)
                                } else {
                                    Image(systemName: "photo.badge.plus")
                                    Text(recipe.photo_url?.isEmpty == false || photoPreview != nil
                                         ? "Change Photo" : "Add Photo")
                                    .font(.subheadline).fontWeight(.semibold)
                                }
                            }
                            .foregroundColor(.orange)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.orange.opacity(0.08))
                            .cornerRadius(10)
                        }
                        .disabled(isUploadingPhoto)
                    }
                    .padding(.vertical, 4)
                }

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
                        HStack(spacing: 10) {
                            TextField("Amount", text: $ingredient.measure)
                                .frame(width: 90)
                                .padding(.vertical, 6).padding(.horizontal, 8)
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                                .font(.subheadline)
                            Rectangle().fill(Color(.systemGray4)).frame(width: 1, height: 28)
                            TextField("Ingredient name", text: $ingredient.name)
                                .font(.subheadline)
                        }
                        .padding(.vertical, 2)
                    }
                    .onDelete { indexSet in ingredients.remove(atOffsets: indexSet) }
                    .onMove { from, to in ingredients.move(fromOffsets: from, toOffset: to) }
                    Button {
                        ingredients.append(EditableIngredient(name: "", measure: ""))
                    } label: {
                        Label("Add Ingredient", systemImage: "plus.circle").foregroundColor(.orange)
                    }
                } header: { Text("Ingredients") }
                footer: { Text("Swipe left to delete · Hold to reorder").font(.caption).foregroundColor(.gray) }

                Section {
                    ForEach(Array(instructionSteps.enumerated()), id: \.offset) { index, _ in
                        HStack(alignment: .top, spacing: 10) {
                            Text("\(index + 1)")
                                .font(.caption2).fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(width: 22, height: 22)
                                .background(Color.orange)
                                .clipShape(Circle())
                                .padding(.top, 10)
                            TextField("Step \(index + 1)", text: $instructionSteps[index], axis: .vertical)
                                .lineLimit(3...8)
                                .font(.subheadline)
                                .padding(.vertical, 6)
                        }
                    }
                    .onDelete { indexSet in instructionSteps.remove(atOffsets: indexSet) }
                    .onMove { from, to in instructionSteps.move(fromOffsets: from, toOffset: to) }
                    Button {
                        instructionSteps.append("")
                    } label: {
                        Label("Add Step", systemImage: "plus.circle").foregroundColor(.orange)
                    }
                } header: { Text("Instructions") }
                footer: { Text("Swipe left to delete · Hold to reorder").font(.caption).foregroundColor(.gray) }

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
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isSaving || isUploadingPhoto)
                }
                if onDelete != nil {
                    ToolbarItem(placement: .bottomBar) {
                        Button(role: .destructive) { showDeleteConfirm = true } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "trash")
                                Text("Delete Recipe").fontWeight(.semibold)
                            }
                            .foregroundColor(.red)
                        }
                    }
                }
            }
            .confirmationDialog("Delete Recipe", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    Task {
                        do {
                            try await supabase.from("personal_recipes")
                                .update(["deleted_at": ISO8601DateFormatter().string(from: Date())])
                                .eq("id", value: recipe.id).execute()
                            onDelete?(recipe.id)
                            dismiss()
                        } catch {
                            errorMessage = "Delete failed: \(error.localizedDescription)"
                        }
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This recipe will be moved to Recently Deleted.")
            }
            .onChange(of: selectedPhoto) { _, newItem in
                guard let newItem else { return }
                Task { await handlePhotoPick(newItem) }
            }
            .frame(maxWidth: sizeClass == .regular ? 700 : .infinity)
            .frame(maxWidth: .infinity)
        }
    }

    // ── Photo placeholder ──
    var photoPlaceholder: some View {
        ZStack {
            Color.orange.opacity(0.06)
            VStack(spacing: 6) {
                Image(systemName: "photo").font(.system(size: 36)).foregroundColor(.orange.opacity(0.4))
                Text("No photo yet").font(.caption).foregroundColor(.gray)
            }
        }
        .frame(maxWidth: .infinity).frame(height: 160).cornerRadius(10)
    }

    // ── Handle photo pick ──
    func handlePhotoPick(_ item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data) else { return }

        await MainActor.run {
            photoPreview = image
            isUploadingPhoto = true
        }

        do {
            let compressed = image.jpegData(compressionQuality: 0.7) ?? data
            let path = "recipe-photos/\(recipe.id.uuidString)/cover.jpg"
            try await supabase.storage.from("personal_recipes").upload(path, data: compressed, options: .init(upsert: true))
            let url = try supabase.storage.from("personal_recipes").getPublicURL(path: path)
            await MainActor.run {
                newPhotoUrl = url.absoluteString
                isUploadingPhoto = false
            }
        } catch {
            await MainActor.run {
                errorMessage = "Photo upload failed: \(error.localizedDescription)"
                isUploadingPhoto = false
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
            let finalPhotoUrl = newPhotoUrl ?? recipe.photo_url ?? ""

            var updateData: [String: AnyJSON] = [
                "title": .string(title),
                "description": .string(description),
                "category": .string(category),
                "instructions": .string(instructionSteps.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }.joined(separator: "\n")),
                "family_notes": .string(familyNotes),
                "prep_time_minutes": .string(prepMinutes.isEmpty ? "0" : prepMinutes),
                "cook_time_minutes": .string(cookMinutes.isEmpty ? "0" : cookMinutes),
                "servings": .string(servings.isEmpty ? "0" : servings),
                "ingredients": ingredientsAnyJSON,
                "tags": tagsAnyJSON
            ]
            if newPhotoUrl != nil {
                updateData["photo_url"] = .string(finalPhotoUrl)
            }

            try await supabase.from("personal_recipes").update(updateData).eq("id", value: recipe.id).execute()

            let updatedIngredients = filteredIngredients.map {
                Ingredient(name: $0.name, amount: $0.measure, measure: $0.measure, unit: nil)
            }
            let updated = Recipe(
                id: recipe.id, title: title, description: description,
                ingredients: updatedIngredients, instructions: instructionSteps.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }.joined(separator: "\n"),
                photo_url: finalPhotoUrl, source_url: recipe.source_url,
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
