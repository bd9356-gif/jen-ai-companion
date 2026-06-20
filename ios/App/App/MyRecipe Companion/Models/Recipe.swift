import Foundation

struct Ingredient: Codable, Equatable {
    var name: String?
    var amount: String?
    var measure: String?
    var unit: String?
}

struct RecipeNutrition: Codable, Equatable {
    var calories: String?
    var protein: String?
    var carbs: String?
    var fat: String?
}

struct Recipe: Identifiable, Codable, Equatable {
    let id: UUID
    var title: String
    var description: String?
    var ingredients: [Ingredient]?
    var instructions: String?
    var photo_url: String?
    var source_url: String?
    var family_notes: String?
    var created_at: Date?
    var user_id: UUID?
    var deleted_at: Date?
    var is_favorite: Bool?
    var is_in_share_queue: Bool?
    var category: String?
    var prep_time_minutes: Int?
    var cook_time_minutes: Int?
    var servings: Int?
    var tags: [String]?
    // Detail fields
    var prep_time: String?
    var cooking_time: String?
    var difficulty: String?
    var equipment: [String]?
    var nutrition: RecipeNutrition?

    enum CodingKeys: String, CodingKey {
        case id, title, description, ingredients, instructions
        case photo_url, source_url, family_notes, created_at, user_id
        case deleted_at, is_favorite, is_in_share_queue, category, tags
        case prep_time_minutes, cook_time_minutes, servings
        case prep_time, cooking_time, difficulty, equipment, nutrition
    }

    init(id: UUID, title: String, description: String? = nil, ingredients: [Ingredient]? = nil,
         instructions: String? = nil, photo_url: String? = nil, source_url: String? = nil,
         family_notes: String? = nil, created_at: Date? = nil, user_id: UUID? = nil,
         deleted_at: Date? = nil, is_favorite: Bool? = nil, is_in_share_queue: Bool? = nil,
         category: String? = nil, prep_time_minutes: Int? = nil, cook_time_minutes: Int? = nil,
         servings: Int? = nil, tags: [String]? = nil,
         prep_time: String? = nil, cooking_time: String? = nil, difficulty: String? = nil,
         equipment: [String]? = nil, nutrition: RecipeNutrition? = nil) {
        self.id = id; self.title = title; self.description = description
        self.ingredients = ingredients; self.instructions = instructions
        self.photo_url = photo_url; self.source_url = source_url
        self.family_notes = family_notes; self.created_at = created_at
        self.user_id = user_id; self.deleted_at = deleted_at
        self.is_favorite = is_favorite; self.is_in_share_queue = is_in_share_queue
        self.category = category; self.prep_time_minutes = prep_time_minutes
        self.cook_time_minutes = cook_time_minutes; self.servings = servings; self.tags = tags
        self.prep_time = prep_time; self.cooking_time = cooking_time
        self.difficulty = difficulty; self.equipment = equipment; self.nutrition = nutrition
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        instructions = try container.decodeIfPresent(String.self, forKey: .instructions)
        photo_url = try container.decodeIfPresent(String.self, forKey: .photo_url)
        source_url = try container.decodeIfPresent(String.self, forKey: .source_url)
        family_notes = try container.decodeIfPresent(String.self, forKey: .family_notes)
        created_at = try container.decodeIfPresent(Date.self, forKey: .created_at)
        user_id = try container.decodeIfPresent(UUID.self, forKey: .user_id)
        deleted_at = try container.decodeIfPresent(Date.self, forKey: .deleted_at)
        is_favorite = try container.decodeIfPresent(Bool.self, forKey: .is_favorite)
        is_in_share_queue = try container.decodeIfPresent(Bool.self, forKey: .is_in_share_queue)
        category = try container.decodeIfPresent(String.self, forKey: .category)
        prep_time_minutes = try container.decodeIfPresent(Int.self, forKey: .prep_time_minutes)
        cook_time_minutes = try container.decodeIfPresent(Int.self, forKey: .cook_time_minutes)
        servings = try container.decodeIfPresent(Int.self, forKey: .servings)
        tags = try container.decodeIfPresent([String].self, forKey: .tags)
        prep_time = try container.decodeIfPresent(String.self, forKey: .prep_time)
        cooking_time = try container.decodeIfPresent(String.self, forKey: .cooking_time)
        difficulty = try container.decodeIfPresent(String.self, forKey: .difficulty)
        equipment = try container.decodeIfPresent([String].self, forKey: .equipment)
        nutrition = try container.decodeIfPresent(RecipeNutrition.self, forKey: .nutrition)
        if let arr = try? container.decode([Ingredient].self, forKey: .ingredients) {
            ingredients = arr
        } else if let str = try? container.decode(String.self, forKey: .ingredients),
                  let data = str.data(using: .utf8),
                  let decoded = try? JSONDecoder().decode([Ingredient].self, from: data) {
            ingredients = decoded
        } else {
            ingredients = nil
        }
    }
}
