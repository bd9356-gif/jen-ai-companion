import Foundation

struct ChefVideo: Identifiable, Codable {
    let id: UUID
    var title: String
    var description: String?
    var youtube_id: String?
    var thumbnail_url: String?
    var category: String?
    var channel: String?
    var is_hidden: Bool?
    var is_featured: Bool?
    var view_count: Int?
    var created_at: Date?
}
