import SwiftUI
import Supabase

struct ChefJenHelpersView: View {
    let recipe: Recipe
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    var onRecipeUpdated: ((Recipe) -> Void)?

    @State private var selectedTab = 0
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var successMessage = ""
    @State private var showPaywall = false

    // Polish
    @State private var polishedRecipe: EnhancedRecipe? = nil

    // Resize
    @State private var targetServings = ""
    @State private var resizedIngredients: [APIIngredient]? = nil

    // Details
    @State private var recipeInfo: RecipeInfo? = nil

    // Adjust/Transform
    @State private var selectedPrefs: Set<String> = []
    @State private var transformResult: EnhancedRecipe? = nil

    // AI Photo
    @State private var generatingPhoto = false
    @State private var generatedPhotoUrl: String? = nil

    let preferences = [
        ("vegetarian", "🥦 Vegetarian"),
        ("gluten_friendly", "🌾 Gluten-friendly"),
        ("dairy_friendly", "🥛 Dairy-friendly"),
        ("low_sodium", "🧂 Low-sodium"),
        ("heart_healthy", "❤️ Heart-healthy"),
        ("carb_aware", "📊 Carb-aware"),
        ("portion_focused", "⚖️ Portion-focused"),
    ]

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // ── Back ──
                Button { dismiss() } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left").font(.system(size: 16, weight: .semibold))
                        Text("Back").font(.subheadline).fontWeight(.semibold)
                    }
                    .foregroundColor(.primary)
                    .padding(.horizontal, 16).padding(.vertical, 8)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // ── Banner ──
                Image("jen-sign")
                    .resizable().scaledToFit()
                    .frame(maxWidth: .infinity, maxHeight: 100)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(["✨ Polish", "📏 Resize", "📋 Details", "🔄 Adjust", "📸 Photo"].enumerated()), id: \.offset) { index, label in
                            Button {
                                selectedTab = index
                                errorMessage = ""
                                successMessage = ""
                            } label: {
                                Text(label)
                                    .font(.subheadline).fontWeight(.semibold)
                                    .padding(.horizontal, 16).padding(.vertical, 8)
                                    .background(selectedTab == index ? Color.orange : Color(.systemGray5))
                                    .foregroundColor(selectedTab == index ? .white : .primary)
                                    .cornerRadius(20)
                            }
                        }
                    }
                    .padding(.horizontal).padding(.vertical, 10)
                }
                Divider()

                ScrollView {
                    VStack(spacing: 20) {
                        if !errorMessage.isEmpty {
                            Text(errorMessage).font(.subheadline).foregroundColor(.red)
                                .multilineTextAlignment(.center).padding(.horizontal)
                        }
                        if !successMessage.isEmpty {
                            Text(successMessage).font(.subheadline).foregroundColor(.green)
                                .multilineTextAlignment(.center).padding(.horizontal)
                        }

                        switch selectedTab {
                        case 0: polishTab
                        case 1: resizeTab
                        case 2: detailsTab
                        case 3: adjustTab
                        case 4: photoTab
                        default: EmptyView()
                        }
                    }
                    .padding()
                }
            }
            .navigationBarHidden(true)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showPaywall) { PaywallView() }
        }
    }

    // MARK: - Polish Tab
    var polishTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Polish this recipe — Chef Jen will clean up the formatting and clarify each step without changing the dish.")
                .font(.subheadline).foregroundColor(.gray)

            if let polished = polishedRecipe {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Polished Instructions").font(.headline)
                    Text(polished.instructions ?? "").font(.subheadline).lineSpacing(4)
                    HStack(spacing: 12) {
                        Button("Save This Version") { Task { await savePolished(polished) } }
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .background(Color.orange).foregroundColor(.white).cornerRadius(12)
                        Button("Discard") { polishedRecipe = nil }
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .background(Color(.systemGray5)).foregroundColor(.primary).cornerRadius(12)
                    }
                }
            } else {
                Button { Task { await runPolish() } } label: {
                    HStack {
                        if isLoading { ProgressView().tint(.white) }
                        else { Image(systemName: "wand.and.stars") }
                        Text(isLoading ? "Polishing..." : "Polish Recipe").fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                    .background(Color.orange).foregroundColor(.white).cornerRadius(14)
                }
                .disabled(isLoading)
            }
        }
    }

    // MARK: - Resize Tab
    var resizeTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Scale ingredients to a different number of servings.")
                .font(.subheadline).foregroundColor(.gray)
            HStack {
                Text("Target servings:")
                TextField("e.g. 8", text: $targetServings)
                    .keyboardType(.numberPad).textFieldStyle(.roundedBorder).frame(width: 80)
            }

            if let resized = resizedIngredients {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Resized Ingredients").font(.headline)
                    ForEach(Array(resized.enumerated()), id: \.offset) { _, ing in
                        HStack(alignment: .top, spacing: 8) {
                            Circle().fill(Color.orange).frame(width: 6, height: 6).padding(.top, 6)
                            Text("\(ing.measure) \(ing.name)").font(.subheadline)
                        }
                    }
                    HStack(spacing: 12) {
                        Button("Save This Version") { Task { await saveResized(resized) } }
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .background(Color.orange).foregroundColor(.white).cornerRadius(12)
                        Button("Discard") { resizedIngredients = nil }
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .background(Color(.systemGray5)).foregroundColor(.primary).cornerRadius(12)
                    }
                }
            } else {
                Button { Task { await runResize() } } label: {
                    HStack {
                        if isLoading { ProgressView().tint(.white) }
                        else { Image(systemName: "scalemass") }
                        Text(isLoading ? "Resizing..." : "Resize Recipe").fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                    .background(Color.orange).foregroundColor(.white).cornerRadius(14)
                }
                .disabled(isLoading || targetServings.isEmpty)
            }
        }
    }

    // MARK: - Details Tab
    var detailsTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Chef Jen will estimate cook time, difficulty, equipment needed, and nutrition per serving.")
                .font(.subheadline).foregroundColor(.gray)

            if let info = recipeInfo {
                VStack(alignment: .leading, spacing: 12) {
                    if let prep = info.prep_time { InfoRow(label: "Prep Time", value: prep) }
                    if let cook = info.cooking_time { InfoRow(label: "Cook Time", value: cook) }
                    if let diff = info.difficulty { InfoRow(label: "Difficulty", value: diff.capitalized) }
                    if let equipment = info.equipment, !equipment.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Equipment").font(.subheadline).fontWeight(.semibold)
                            Text(equipment.joined(separator: ", ")).font(.subheadline).foregroundColor(.gray)
                        }
                    }
                    if let nutrition = info.nutrition_estimate {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Nutrition (per serving)").font(.subheadline).fontWeight(.semibold)
                            if let cal = nutrition.calories { InfoRow(label: "Calories", value: cal) }
                            if let protein = nutrition.protein { InfoRow(label: "Protein", value: protein) }
                            if let carbs = nutrition.carbs { InfoRow(label: "Carbs", value: carbs) }
                            if let fat = nutrition.fat { InfoRow(label: "Fat", value: fat) }
                        }
                    }
                    Button("Save Details to Recipe") { Task { await saveDetails(info) } }
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                        .background(Color.orange).foregroundColor(.white).cornerRadius(12)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            } else {
                Button { Task { await runGenerateInfo() } } label: {
                    HStack {
                        if isLoading { ProgressView().tint(.white) }
                        else { Image(systemName: "info.circle") }
                        Text(isLoading ? "Analyzing..." : "Get Recipe Details").fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                    .background(Color.orange).foregroundColor(.white).cornerRadius(14)
                }
                .disabled(isLoading)
            }
        }
    }

    // MARK: - Adjust Tab
    var adjustTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Make this recipe more...").font(.subheadline).foregroundColor(.gray)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(preferences, id: \.0) { key, label in
                    let selected = selectedPrefs.contains(key)
                    Button {
                        if selected { selectedPrefs.remove(key) } else { selectedPrefs.insert(key) }
                    } label: {
                        Text(label).font(.subheadline).fontWeight(.semibold)
                            .frame(maxWidth: .infinity).padding(.vertical, 10)
                            .background(selected ? Color.orange : Color(.systemGray5))
                            .foregroundColor(selected ? .white : .primary).cornerRadius(10)
                    }
                }
            }

            if let result = transformResult {
                VStack(alignment: .leading, spacing: 12) {
                    if let desc = result.description, !desc.isEmpty {
                        Text(desc).font(.subheadline).italic().foregroundColor(.secondary)
                            .padding(12).background(Color.orange.opacity(0.08)).cornerRadius(10)
                    }
                    HStack(spacing: 12) {
                        Button("Save as New") { Task { await saveTransformAsNew(result) } }
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .background(Color.orange).foregroundColor(.white).cornerRadius(12)
                        Button("Replace Original") { Task { await saveTransformReplace(result) } }
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .background(Color(.systemGray5)).foregroundColor(.primary).cornerRadius(12)
                    }
                    Button("Discard") { transformResult = nil }
                        .foregroundColor(.red).font(.subheadline)
                }
            } else {
                Button { Task { await runTransform() } } label: {
                    HStack {
                        if isLoading { ProgressView().tint(.white) }
                        else { Image(systemName: "slider.horizontal.3") }
                        Text(isLoading ? "Adjusting..." : "Adjust Recipe").fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                    .background(selectedPrefs.isEmpty ? Color.gray.opacity(0.3) : Color.orange)
                    .foregroundColor(.white).cornerRadius(14)
                }
                .disabled(isLoading || selectedPrefs.isEmpty)
            }
        }
    }

    // MARK: - Photo Tab
    var photoTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Generate a beautiful food photo for this recipe using AI.")
                .font(.subheadline).foregroundColor(.gray)

            // Premium gate indicator
            if authManager.subscriptionTier == .free {
                HStack(spacing: 8) {
                    Image(systemName: "lock.fill").foregroundColor(.orange).font(.caption)
                    Text("AI photo generation requires Premium or Pro")
                        .font(.caption).foregroundColor(.orange)
                    Spacer()
                    Button("Upgrade") { showPaywall = true }
                        .font(.caption).fontWeight(.semibold).foregroundColor(.white)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(Color.orange).cornerRadius(8)
                }
                .padding(10)
                .background(Color.orange.opacity(0.06))
                .cornerRadius(10)
            }

            if let photoUrl = generatedPhotoUrl ?? recipe.photo_url, !photoUrl.isEmpty {
                AsyncImage(url: URL(string: photoUrl)) { image in
                    image.resizable().scaledToFit()
                } placeholder: { ProgressView() }
                .frame(maxWidth: .infinity).cornerRadius(16)
            }

            if generatedPhotoUrl == nil {
                Button { Task { await generatePhoto() } } label: {
                    HStack {
                        if generatingPhoto { ProgressView().tint(.white) }
                        else { Image(systemName: "camera.fill") }
                        Text(generatingPhoto ? "Generating..." : "Generate Photo")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                    .background(authManager.subscriptionTier == .free ? Color.gray.opacity(0.3) : Color.orange)
                    .foregroundColor(.white).cornerRadius(14)
                }
                .disabled(generatingPhoto || authManager.subscriptionTier == .free)
            } else {
                Button { dismiss() } label: {
                    Text("Done — Photo Saved").fontWeight(.semibold)
                        .frame(maxWidth: .infinity).padding(.vertical, 14)
                        .background(Color.green).foregroundColor(.white).cornerRadius(14)
                }
            }
        }
    }

    // MARK: - API
    func callEnhanceAPI(action: String, extraParams: [String: Any] = [:]) async throws -> Data {
        guard let url = URL(string: "https://recipe.mycompanionapps.com/api/enhance-recipe") else {
            throw URLError(.badURL)
        }
        var body: [String: Any] = ["recipe": recipeDict(), "action": action]
        extraParams.forEach { body[$0.key] = $0.value }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 60
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, _) = try await URLSession.shared.data(for: request)
        return data
    }

    func recipeDict() -> [String: Any] {
        var dict: [String: Any] = ["title": recipe.title]
        if let desc = recipe.description { dict["description"] = desc }
        if let inst = recipe.instructions { dict["instructions"] = inst }
        if let servings = recipe.servings { dict["servings"] = servings }
        if let ingredients = recipe.ingredients {
            dict["ingredients"] = ingredients.map { ["name": $0.name ?? "", "measure": $0.measure ?? $0.amount ?? ""] }
        }
        return dict
    }

    func toIngredients(_ apiIngs: [APIIngredient]) -> [Ingredient] {
        apiIngs.map { Ingredient(name: $0.name, amount: $0.measure, measure: $0.measure) }
    }

    func toAnyJSON(_ apiIngs: [APIIngredient]) -> AnyJSON {
        .array(apiIngs.map { .object(["name": .string($0.name), "measure": .string($0.measure), "amount": .string($0.measure)]) })
    }

    func withDetails(_ base: Recipe,
                     title: String? = nil,
                     description: String? = nil,
                     ingredients: [Ingredient]? = nil,
                     instructions: String? = nil,
                     photo_url: String? = nil,
                     servings: Int? = nil,
                     prep_time: String? = nil,
                     cooking_time: String? = nil,
                     difficulty: String? = nil,
                     equipment: [String]? = nil,
                     nutrition: RecipeNutrition? = nil) -> Recipe {
        Recipe(
            id: base.id,
            title: title ?? base.title,
            description: description ?? base.description,
            ingredients: ingredients ?? base.ingredients,
            instructions: instructions ?? base.instructions,
            photo_url: photo_url ?? base.photo_url,
            source_url: base.source_url,
            family_notes: base.family_notes,
            created_at: base.created_at,
            user_id: base.user_id,
            deleted_at: base.deleted_at,
            is_favorite: base.is_favorite,
            is_in_share_queue: base.is_in_share_queue,
            category: base.category,
            prep_time_minutes: base.prep_time_minutes,
            cook_time_minutes: base.cook_time_minutes,
            servings: servings ?? base.servings,
            tags: base.tags,
            prep_time: prep_time ?? base.prep_time,
            cooking_time: cooking_time ?? base.cooking_time,
            difficulty: difficulty ?? base.difficulty,
            equipment: equipment ?? base.equipment,
            nutrition: nutrition ?? base.nutrition
        )
    }

    // MARK: - Run
    func runPolish() async {
        isLoading = true; errorMessage = ""
        do {
            let data = try await callEnhanceAPI(action: "enhance")
            let result = try JSONDecoder().decode(EnhancedRecipe.self, from: data)
            await MainActor.run { polishedRecipe = result }
        } catch {
            await MainActor.run { errorMessage = "Polish failed: \(error.localizedDescription)" }
        }
        await MainActor.run { isLoading = false }
    }

    func runResize() async {
        guard let servings = Int(targetServings) else { return }
        isLoading = true; errorMessage = ""
        do {
            let data = try await callEnhanceAPI(action: "resize", extraParams: ["servings": servings])
            let result = try JSONDecoder().decode(ResizeResult.self, from: data)
            await MainActor.run { resizedIngredients = result.ingredients }
        } catch {
            await MainActor.run { errorMessage = "Resize failed: \(error.localizedDescription)" }
        }
        await MainActor.run { isLoading = false }
    }

    func runGenerateInfo() async {
        isLoading = true; errorMessage = ""
        do {
            let data = try await callEnhanceAPI(action: "generate_info")
            let result = try JSONDecoder().decode(RecipeInfo.self, from: data)
            await MainActor.run { recipeInfo = result }
        } catch {
            await MainActor.run { errorMessage = "Details failed: \(error.localizedDescription)" }
        }
        await MainActor.run { isLoading = false }
    }

    func runTransform() async {
        isLoading = true; errorMessage = ""
        do {
            let data = try await callEnhanceAPI(action: "transform", extraParams: ["preferences": Array(selectedPrefs)])
            let result = try JSONDecoder().decode(EnhancedRecipe.self, from: data)
            await MainActor.run { transformResult = result }
        } catch {
            await MainActor.run { errorMessage = "Adjust failed: \(error.localizedDescription)" }
        }
        await MainActor.run { isLoading = false }
    }

    // MARK: - Save
    func savePolished(_ polished: EnhancedRecipe) async {
        let newIngs = polished.ingredients ?? []
        do {
            try await supabase.from("personal_recipes").update([
                "instructions": AnyJSON.string(polished.instructions ?? ""),
                "ingredients": toAnyJSON(newIngs)
            ]).eq("id", value: recipe.id).execute()
            let updated = withDetails(recipe, ingredients: toIngredients(newIngs), instructions: polished.instructions ?? recipe.instructions)
            await MainActor.run { onRecipeUpdated?(updated); successMessage = "Recipe polished and saved ✓"; polishedRecipe = nil }
        } catch {
            await MainActor.run { errorMessage = "Save failed: \(error.localizedDescription)" }
        }
    }

    func saveResized(_ ingredients: [APIIngredient]) async {
        let newServings = Int(targetServings) ?? recipe.servings ?? 0
        do {
            try await supabase.from("personal_recipes").update([
                "ingredients": toAnyJSON(ingredients),
                "servings": AnyJSON.double(Double(newServings))
            ]).eq("id", value: recipe.id).execute()
            let updated = withDetails(recipe, ingredients: toIngredients(ingredients), servings: newServings)
            await MainActor.run { onRecipeUpdated?(updated); successMessage = "Resized to \(newServings) servings ✓"; resizedIngredients = nil }
        } catch {
            await MainActor.run { errorMessage = "Save failed: \(error.localizedDescription)" }
        }
    }

    func saveDetails(_ info: RecipeInfo) async {
        do {
            var nutritionJSON: AnyJSON? = nil
            if let n = info.nutrition_estimate {
                nutritionJSON = .object(["calories": .string(n.calories ?? ""), "protein": .string(n.protein ?? ""), "carbs": .string(n.carbs ?? ""), "fat": .string(n.fat ?? "")])
            }
            var updateDict: [String: AnyJSON] = [:]
            if let prep = info.prep_time { updateDict["prep_time"] = .string(prep); if let mins = parseMinutes(prep) { updateDict["prep_time_minutes"] = .double(Double(mins)) } }
            if let cook = info.cooking_time { updateDict["cooking_time"] = .string(cook); if let mins = parseMinutes(cook) { updateDict["cook_time_minutes"] = .double(Double(mins)) } }
            if let diff = info.difficulty { updateDict["difficulty"] = .string(diff) }
            if let equip = info.equipment { updateDict["equipment"] = .array(equip.map { .string($0) }) }
            if let n = nutritionJSON { updateDict["nutrition"] = n }
            if let s = info.servings { updateDict["servings"] = .double(Double(s)) }
            if !updateDict.isEmpty { try await supabase.from("personal_recipes").update(updateDict).eq("id", value: recipe.id).execute() }
            let recipeNutrition: RecipeNutrition? = info.nutrition_estimate.map { RecipeNutrition(calories: $0.calories, protein: $0.protein, carbs: $0.carbs, fat: $0.fat) }
            let updated = withDetails(recipe, servings: info.servings ?? recipe.servings, prep_time: info.prep_time ?? recipe.prep_time, cooking_time: info.cooking_time ?? recipe.cooking_time, difficulty: info.difficulty ?? recipe.difficulty, equipment: info.equipment ?? recipe.equipment, nutrition: recipeNutrition ?? recipe.nutrition)
            await MainActor.run { onRecipeUpdated?(updated); successMessage = "Details saved ✓" }
        } catch {
            await MainActor.run { errorMessage = "Save failed: \(error.localizedDescription)" }
        }
    }

    func saveTransformAsNew(_ result: EnhancedRecipe) async {
        guard let user = authManager.user else { return }
        let newIngs = result.ingredients ?? []
        let newId = UUID()
        do {
            let insertData: [String: AnyJSON] = [
                "id": .string(newId.uuidString),
                "user_id": .string(user.id.uuidString),
                "title": .string(result.title ?? "\(recipe.title) (adjusted)"),
                "description": .string(result.description ?? ""),
                "instructions": .string(result.instructions ?? ""),
                "ingredients": toAnyJSON(newIngs),
                "photo_url": .string(recipe.photo_url ?? "")
            ]
            try await supabase.from("personal_recipes").insert(insertData).execute()
            await MainActor.run { successMessage = "Saved as new recipe ✓"; transformResult = nil }
        } catch {
            print("saveTransformAsNew error:", error)
            await MainActor.run { errorMessage = "Save as new failed: \(error.localizedDescription)" }
        }
    }

    func saveTransformReplace(_ result: EnhancedRecipe) async {
        let newIngs = result.ingredients ?? []
        do {
            try await supabase.from("personal_recipes").update(["title": AnyJSON.string(result.title ?? recipe.title), "description": AnyJSON.string(result.description ?? ""), "instructions": AnyJSON.string(result.instructions ?? ""), "ingredients": toAnyJSON(newIngs)]).eq("id", value: recipe.id).execute()
            let updated = withDetails(recipe, title: result.title ?? recipe.title, description: result.description ?? recipe.description, ingredients: toIngredients(newIngs), instructions: result.instructions ?? recipe.instructions)
            await MainActor.run { onRecipeUpdated?(updated); successMessage = "Recipe updated ✓"; transformResult = nil }
        } catch {
            await MainActor.run { errorMessage = "Save failed: \(error.localizedDescription)" }
        }
    }

    func generatePhoto() async {
        // Gate to premium+
        if authManager.subscriptionTier == .free {
            await MainActor.run { showPaywall = true }
            return
        }
        guard let user = authManager.user else { return }

        // Check premium monthly limit (5/month)
        if authManager.subscriptionTier == .premium {
            let month = monthKey()
            let usage: [[String: Int]] = (try? await supabase.from("user_usage")
                .select("photo_count").eq("user_id", value: user.id).eq("month", value: month)
                .execute().value) ?? []
            let count = usage.first?["photo_count"] ?? 0
            if count >= 5 {
                await MainActor.run { showPaywall = true }
                return
            }
        }
        generatingPhoto = true; errorMessage = ""
        do {
            guard let url = URL(string: "https://recipe.mycompanionapps.com/api/generate-photo") else { return }
            var request = URLRequest(url: url, timeoutInterval: 120)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: ["title": recipe.title, "description": recipe.description ?? "", "userId": user.id.uuidString])
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any], let photoUrl = json["url"] as? String {
                try await supabase.from("personal_recipes").update(["photo_url": photoUrl]).eq("id", value: recipe.id).execute()
                let updated = withDetails(recipe, photo_url: photoUrl)
                await MainActor.run { generatedPhotoUrl = photoUrl; onRecipeUpdated?(updated) }
                // Track usage
                let month = monthKey()
                try? await supabase.rpc("increment_photo_count", params: [
                    "p_user_id": user.id.uuidString, "p_month": month
                ]).execute()
            } else {
                await MainActor.run { errorMessage = "Photo generation failed. Try again." }
            }
        } catch {
            await MainActor.run { errorMessage = "Photo failed: \(error.localizedDescription)" }
        }
        await MainActor.run { generatingPhoto = false }
    }

    func monthKey() -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM"; return f.string(from: Date())
    }

    func parseMinutes(_ string: String) -> Int? {
        let s = string.lowercased()
        var total = 0; var found = false
        if let r = s.range(of: #"(\d+)\s*h"#, options: .regularExpression), let n = Int(s[r].filter { $0.isNumber }) { total += n * 60; found = true }
        if let r = s.range(of: #"(\d+)\s*m"#, options: .regularExpression), let n = Int(s[r].filter { $0.isNumber }) { total += n; found = true }
        return found ? total : nil
    }
}

// MARK: - Models
struct EnhancedRecipe: Codable {
    var title: String?
    var description: String?
    var ingredients: [APIIngredient]?
    var instructions: String?
}

struct APIIngredient: Codable {
    var name: String
    var measure: String
}

struct ResizeResult: Codable {
    var ingredients: [APIIngredient]
}

struct RecipeInfo: Codable {
    var cooking_time: String?
    var prep_time: String?
    var difficulty: String?
    var equipment: [String]?
    var nutrition_estimate: NutritionInfo?
    var servings: Int?
}

struct NutritionInfo: Codable {
    var calories: String?
    var protein: String?
    var carbs: String?
    var fat: String?
}

struct InfoRow: View {
    let label: String
    let value: String
    var body: some View {
        HStack {
            Text(label).font(.subheadline).foregroundColor(.gray)
            Spacer()
            Text(value).font(.subheadline).fontWeight(.semibold)
        }
    }
}
