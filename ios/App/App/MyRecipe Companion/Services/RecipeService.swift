import Foundation
import Combine
import Supabase

class RecipeService: ObservableObject {
    @Published var recipes: [Recipe] = []
    @Published var isLoading = false

    func fetchRecipes(userId: UUID) async {
        await MainActor.run { isLoading = true }
        do {
            let result: [Recipe] = try await supabase
                .from("personal_recipes")
                .select()
                .eq("user_id", value: userId)
                .is("deleted_at", value: nil)
                .order("created_at", ascending: false)
                .execute()
                .value
            await MainActor.run {
                self.recipes = result
                self.isLoading = false
            }
        } catch {
            print("fetchRecipes error:", error)
            await MainActor.run { isLoading = false }
        }
    }

    func deleteRecipe(id: UUID) async {
        do {
            try await supabase
                .from("personal_recipes")
                .update(["deleted_at": ISO8601DateFormatter().string(from: Date())])
                .eq("id", value: id)
                .execute()
        } catch {
            print("deleteRecipe error:", error)
        }
    }

    func updateRecipe(_ recipe: Recipe) {
        if let index = recipes.firstIndex(where: { $0.id == recipe.id }) {
            recipes[index] = recipe
        }
    }

    func removeRecipe(id: UUID) {
        recipes.removeAll { $0.id == id }
    }
}
