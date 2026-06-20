import Foundation

struct MealPlanEntry: Identifiable, Codable {
    let id: UUID
    var user_id: UUID
    var recipe_id: UUID
    var day_of_week: String
    var meal_type: String
    var week_start: String
    var created_at: Date?
}
