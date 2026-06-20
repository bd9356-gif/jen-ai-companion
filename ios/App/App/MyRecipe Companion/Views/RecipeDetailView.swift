import SwiftUI
import Supabase

struct RecipeDetailView: View {
    @State var recipe: Recipe
    @Environment(\.horizontalSizeClass) var sizeClass
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var authManager: AuthManager
    var onUpdate: ((Recipe) -> Void)? = nil
    var onDelete: ((UUID) -> Void)? = nil
    @State private var showEdit = false
    @State private var showDeleteConfirm = false
    @State private var showChefJen = false
    @State private var isDeleting = false
    @State private var isFavorite: Bool = false
    @State private var isInShareQueue: Bool = false
    @State private var detailsOpen = false
    @State private var actionsOpen = false
    @State private var ingredientsOpen = false
    @State private var showMiseEnPlace = false
    @State private var mealIdeaAdded = false
    @State private var instructionsOpen = false
    @Environment(\.dismiss) var dismiss

    var hasDetailInfo: Bool {
        recipe.prep_time != nil || recipe.cooking_time != nil ||
        recipe.difficulty != nil || recipe.equipment != nil ||
        recipe.nutrition != nil
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // ── Hero Photo ──
                if let photoUrl = recipe.photo_url, !photoUrl.isEmpty,
                   let url = URL(string: photoUrl + "?t=\(Int(recipe.created_at?.timeIntervalSince1970 ?? 0))") {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFill()
                                .frame(maxWidth: .infinity).frame(height: 220).clipped()
                        case .failure, .empty:
                            Image("chef-logo")
                                .resizable().scaledToFit()
                                .frame(maxWidth: .infinity).frame(height: 160)
                                .background(Color.orange.opacity(0.06))
                        @unknown default:
                            Color.orange.opacity(0.15)
                                .frame(maxWidth: .infinity).frame(height: 220)
                        }
                    }
                } else {
                    Image("chef-logo")
                        .resizable().scaledToFit()
                        .frame(maxWidth: .infinity).frame(height: 160)
                        .background(Color.orange.opacity(0.06))
                }

                VStack(alignment: .leading, spacing: 20) {

                    // ── Title block ──
                    VStack(alignment: .leading, spacing: 6) {
                        Text(recipe.title)
                            .font(.title3).fontWeight(.semibold)
                            .fixedSize(horizontal: false, vertical: true)

                        HStack(spacing: 14) {
                            if let prep = recipe.prep_time {
                                StatPill(icon: "⏱", text: prep)
                            } else if let mins = recipe.prep_time_minutes {
                                StatPill(icon: "⏱", text: "\(mins) min")
                            }
                            if let cook = recipe.cooking_time {
                                StatPill(icon: "🕐", text: cook)
                            } else if let mins = recipe.cook_time_minutes {
                                StatPill(icon: "🕐", text: "\(mins) min")
                            }
                            if let servings = recipe.servings {
                                StatPill(icon: "👥", text: "\(servings) servings")
                            }
                        }

                        if let tags = recipe.tags, !tags.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    ForEach(tags, id: \.self) { tag in
                                        tagChip(tag)
                                    }
                                }
                            }
                        }
                    }

                    // ── Description ──
                    if let desc = recipe.description, !desc.isEmpty {
                        Text(desc)
                            .font(.footnote).foregroundColor(.secondary).lineSpacing(3)
                    }

                    // ── Recipe Info Card ──
                    if hasDetailInfo {
                        CollapsibleSection(
                            title: "📋 Recipe Details",
                            isOpen: detailsOpen,
                            onToggle: {
                                withAnimation(.easeInOut(duration: 0.2)) { detailsOpen.toggle() }
                            }
                        ) {
                            recipeInfoCard
                        }
                    }

                    // ── Ingredients (collapsible) ──
                    if let ingredients = recipe.ingredients, !ingredients.isEmpty {
                        VStack(alignment: .leading, spacing: 0) {
                            CollapsibleSection(
                                title: "Ingredients (\(ingredients.count))",
                                isOpen: ingredientsOpen,
                                onToggle: {
                                    withAnimation(.easeInOut(duration: 0.2)) { ingredientsOpen.toggle() }
                                }
                            ) {
                                VStack(alignment: .leading, spacing: 6) {
                                    ForEach(Array(ingredients.enumerated()), id: \.offset) { _, ing in
                                        ingredientRow(ing)
                                    }
                                }
                                .padding(.horizontal, 20).padding(.bottom, 12)
                            }
                        }
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.systemGray5), lineWidth: 1))
                    }

                    // ── Instructions (collapsible) ──
                    if let instructions = recipe.instructions, !instructions.isEmpty {
                        let steps = instructions
                            .components(separatedBy: "\n")
                            .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
                        VStack(alignment: .leading, spacing: 0) {
                            CollapsibleSection(
                                title: "Instructions (\(steps.count) steps)",
                                isOpen: instructionsOpen,
                                onToggle: {
                                    withAnimation(.easeInOut(duration: 0.2)) { instructionsOpen.toggle() }
                                }
                            ) {
                                VStack(alignment: .leading, spacing: 10) {
                                    ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                                        stepRow(index: index, text: step)
                                    }
                                }
                                .padding(.horizontal, 20).padding(.bottom, 12)
                            }
                        }
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.systemGray5), lineWidth: 1))
                    }

                    // ── Kitchen Actions ──
                    CollapsibleSection(
                        title: "🍳 Kitchen Actions",
                        isOpen: actionsOpen,
                        onToggle: {
                            withAnimation(.easeInOut(duration: 0.2)) { actionsOpen.toggle() }
                        }
                    ) {
                        actionButtons
                    }

                    // ── Notes ──
                    if let notes = recipe.family_notes, !notes.isEmpty {
                        HStack(alignment: .top, spacing: 8) {
                            Text("📝").font(.caption)
                            Text(notes)
                                .font(.footnote).foregroundColor(.secondary).lineSpacing(3)
                        }
                        .padding(12)
                        .background(Color.yellow.opacity(0.08))
                        .cornerRadius(10)
                    }
                }
                .padding(.horizontal, 16).padding(.top, 14).padding(.bottom, 32)
            }
        }
        .frame(maxWidth: sizeClass == .regular ? 700 : .infinity)
        .frame(maxWidth: .infinity)
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("")
        .onAppear {
            isFavorite = recipe.is_favorite ?? false
            isInShareQueue = recipe.is_in_share_queue ?? false
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                if sizeClass == .regular {
                    Button("Close") { dismiss() }
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 12) {
                    Button { Task { await toggleFavorite() } } label: {
                        Image(systemName: isFavorite ? "heart.fill" : "heart")
                            .foregroundColor(isFavorite ? .red : .gray)
                            .font(.system(size: 16))
                    }
                    Button { shareRecipe() } label: {
                        Image(systemName: "square.and.arrow.up").font(.system(size: 16))
                    }
                    Button("Edit") { showEdit = true }.font(.system(size: 15))
                }
            }
        }
        .sheet(isPresented: $showEdit) {
            RecipeEditView(recipe: recipe, onSave: { updated in
                recipe = updated
                onUpdate?(updated)
            }, onDelete: { id in
                onDelete?(id)
                dismiss()
            })
        }
        .sheet(isPresented: $showMiseEnPlace) {
            MiseEnPlaceSheetView(recipe: recipe)
        }
        .sheet(isPresented: $showChefJen) {
            ChefJenHelpersView(recipe: recipe, onRecipeUpdated: { updated in
                recipe = updated
                onUpdate?(updated)
            })
            .environmentObject(authManager)
        }
        .onChange(of: showChefJen) { _, isShowing in
            if !isShowing {
                Task { await reloadRecipe() }
            }
        }
        .confirmationDialog("Delete Recipe", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) { Task { await deleteRecipe() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This recipe will be moved to Recently Deleted.")
        }
    }

    // MARK: - Recipe Info Card
    var recipeInfoCard: some View {
        VStack(alignment: .leading, spacing: 10) {

            let hasPrepTime = recipe.prep_time != nil
            let hasCookTime = recipe.cooking_time != nil
            let hasDifficulty = recipe.difficulty != nil
            let hasServings = recipe.servings != nil

            if hasPrepTime || hasCookTime || hasDifficulty || hasServings {
                HStack(spacing: 8) {
                    if let prep = recipe.prep_time {
                        InfoTile(emoji: "⏱", value: prep, label: "Prep")
                    }
                    if let cook = recipe.cooking_time {
                        InfoTile(emoji: "🕐", value: cook, label: "Cook")
                    }
                    if let diff = recipe.difficulty {
                        InfoTile(emoji: "📊", value: diff.capitalized, label: "Level")
                    }
                    if let s = recipe.servings {
                        InfoTile(emoji: "👥", value: "\(s)", label: "Serves")
                    }
                }
            }

            if let equipment = recipe.equipment, !equipment.isEmpty {
                HStack(alignment: .top, spacing: 6) {
                    Text("🍳").font(.caption)
                    Text(equipment.joined(separator: "  •  "))
                        .font(.caption).foregroundColor(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 10).padding(.vertical, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
                .cornerRadius(10)
            }

            if let nutrition = recipe.nutrition {
                HStack(spacing: 0) {
                    ForEach([
                        ("Cal", nutrition.calories),
                        ("Protein", nutrition.protein),
                        ("Carbs", nutrition.carbs),
                        ("Fat", nutrition.fat)
                    ], id: \.0) { label, value in
                        if let value = value, !value.isEmpty {
                            VStack(spacing: 2) {
                                Text(value)
                                    .font(.caption).fontWeight(.bold)
                                    .foregroundColor(.orange)
                                    .minimumScaleFactor(0.7).lineLimit(1)
                                Text(label).font(.caption2).foregroundColor(.gray)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                }
                .padding(.horizontal, 10).padding(.vertical, 8)
                .background(Color(.systemBackground))
                .cornerRadius(10)
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(14)
    }

    // MARK: - Action Buttons
    @ViewBuilder func ingredientRow(_ ing: Ingredient) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Circle().fill(Color.orange)
                .frame(width: 5, height: 5).padding(.top, 5)
            VStack(alignment: .leading, spacing: 1) {
                if let name = ing.name, !name.isEmpty {
                    Text(name).font(.footnote)
                }
                if let qty = ing.amount ?? ing.measure, !qty.isEmpty {
                    Text(qty).font(.caption).foregroundColor(.gray)
                }
            }
        }
    }

    @ViewBuilder func tagChip(_ tag: String) -> some View {
        Text("#\(tag)")
            .font(.caption2).fontWeight(.semibold)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(Color.orange.opacity(0.08))
            .foregroundColor(.orange).cornerRadius(8)
    }

    @ViewBuilder func stepRow(index: Int, text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("\(index + 1)")
                .font(.caption2).fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(Color.orange)
                .clipShape(Circle())
                .padding(.top, 1)
            Text(text.trimmingCharacters(in: .whitespaces))
                .font(.footnote).lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    var actionButtons: some View {
        VStack(spacing: 8) {
            Button { showMiseEnPlace = true } label: {
                HStack {
                    Text("👨‍🍳").font(.subheadline)
                    Text("Mise en Place").font(.subheadline).fontWeight(.semibold)
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption2).foregroundColor(.gray)
                }
                .padding(.horizontal, 14).padding(.vertical, 11)
                .background(Color(.systemGray6))
                .foregroundColor(.primary)
                .cornerRadius(12)
            }

            Button { showChefJen = true } label: {
                HStack {
                    Text("👩‍🍳").font(.subheadline)
                    Text("Chef Jennifer Helpers").font(.subheadline).fontWeight(.semibold)
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption2).foregroundColor(.orange.opacity(0.6))
                }
                .padding(.horizontal, 14).padding(.vertical, 11)
                .background(Color.orange.opacity(0.08))
                .foregroundColor(.orange)
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.orange.opacity(0.2), lineWidth: 1))
            }

            Button { Task { await addToMealIdeas() } } label: {
                HStack {
                    Text(mealIdeaAdded ? "✓" : "🍽️").font(.subheadline)
                    Text(mealIdeaAdded ? "Added to My Meal Ideas" : "Add to My Meal Ideas").font(.subheadline).fontWeight(.semibold)
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption2).foregroundColor(.gray)
                }
                .padding(.horizontal, 14).padding(.vertical, 11)
                .background(Color(.systemGray6))
                .foregroundColor(.primary)
                .cornerRadius(12)
            }

            AddToRecipeBoxButton(recipeId: recipe.id).environmentObject(authManager)
            AddToShoppingListButton(recipe: recipe).environmentObject(authManager)

            Button { Task { await toggleShareQueue() } } label: {
                HStack {
                    Image(systemName: isInShareQueue ? "checkmark.circle.fill" : "square.and.arrow.up.circle")
                        .font(.subheadline)
                    Text(isInShareQueue ? "In Share Box" : "Add to Share Box")
                        .font(.subheadline).fontWeight(.semibold)
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption2).foregroundColor(.gray)
                }
                .padding(.horizontal, 14).padding(.vertical, 11)
                .background(isInShareQueue ? Color.green.opacity(0.08) : Color(.systemGray6))
                .foregroundColor(isInShareQueue ? .green : .primary)
                .cornerRadius(12)
            }

            .disabled(isDeleting)
        }
    }

    // MARK: - Actions
    func toggleFavorite() async {
        let newValue = !isFavorite
        await MainActor.run { isFavorite = newValue }
        do {
            try await supabase.from("personal_recipes").update(["is_favorite": newValue])
                .eq("id", value: recipe.id).execute()
        } catch {
            await MainActor.run { isFavorite = !newValue }
        }
    }

    func toggleShareQueue() async {
        let newValue = !isInShareQueue
        await MainActor.run { isInShareQueue = newValue }
        do {
            try await supabase.from("personal_recipes").update(["is_in_share_queue": newValue])
                .eq("id", value: recipe.id).execute()
        } catch {
            await MainActor.run { isInShareQueue = !newValue }
        }
    }

    func shareRecipe() {
        let shareURL = URL(string: "https://recipe.mycompanionapps.com/share/\(recipe.id)")!
        let items: [Any] = [recipe.title + " — Chef Jen approves ♥", shareURL]
        let av = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            av.popoverPresentationController?.sourceView = window
            av.popoverPresentationController?.sourceRect = CGRect(
                x: window.bounds.midX, y: window.bounds.midY, width: 0, height: 0)
            var topVC = window.rootViewController
            while let presented = topVC?.presentedViewController {
                topVC = presented
            }
            topVC?.present(av, animated: true)
        }
    }

    func addToMealIdeas() async {
        guard let user = authManager.user else { return }
        do {
            let existing: [MyPick] = try await supabase.from("my_picks").select()
                .eq("user_id", value: user.id)
                .eq("recipe_id", value: recipe.id)
                .execute().value
            guard existing.isEmpty else { return } // already in list
            let count: [MyPick] = try await supabase.from("my_picks").select()
                .eq("user_id", value: user.id).execute().value
            let nextOrder = (count.map { $0.sort_order ?? 0 }.max() ?? -1) + 1
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
            await MainActor.run { mealIdeaAdded = true }
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            await MainActor.run { mealIdeaAdded = false }
        } catch { print("addToMealIdeas error:", error) }
    }

    func reloadRecipe() async {
        do {
            let result: [Recipe] = try await supabase.from("personal_recipes")
                .select().eq("id", value: recipe.id).execute().value
            if let updated = result.first {
                await MainActor.run { recipe = updated }
            }
        } catch { print("reloadRecipe error:", error) }
    }

    func deleteRecipe() async {
        isDeleting = true
        do {
            try await supabase.from("personal_recipes")
                .update(["deleted_at": ISO8601DateFormatter().string(from: Date())])
                .eq("id", value: recipe.id).execute()
            onDelete?(recipe.id)
            dismiss()
        } catch {
            print("deleteRecipe error:", error)
            isDeleting = false
        }
    }
}

// MARK: - Supporting Views (local to this file only)

struct StatPill: View {
    let icon: String
    let text: String
    var body: some View {
        HStack(spacing: 3) {
            Text(icon).font(.caption2)
            Text(text).font(.caption).foregroundColor(.secondary)
        }
    }
}

struct InfoTile: View {
    let emoji: String
    let value: String
    let label: String
    var body: some View {
        VStack(spacing: 3) {
            Text(emoji).font(.subheadline)
            Text(value)
                .font(.caption).fontWeight(.bold)
                .multilineTextAlignment(.center)
                .minimumScaleFactor(0.7).lineLimit(2)
            Text(label).font(.caption2).foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10).padding(.horizontal, 4)
        .background(Color(.systemBackground))
        .cornerRadius(10)
    }
}
