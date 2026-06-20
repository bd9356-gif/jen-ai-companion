import Foundation

struct LibraryNote: Identifiable, Codable {
    let id: UUID
    var title: String
    var content: String?
    var question: String?
    var source: String?
    var created_at: Date?
}
