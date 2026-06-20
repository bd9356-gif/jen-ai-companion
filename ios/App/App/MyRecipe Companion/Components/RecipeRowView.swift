import SwiftUI

struct RecipeRowView: View {
    let recipe: Recipe

    var body: some View {
        HStack(spacing: 12) {
            if let photoUrl = recipe.photo_url, !photoUrl.isEmpty {
                AsyncImage(url: URL(string: photoUrl)) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Color.orange.opacity(0.15)
                }
                .frame(width: 56, height: 56)
                .cornerRadius(10)
                .clipped()
            } else {
                Image("chef-logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 56, height: 56)
                    .background(Color.orange.opacity(0.06))
                    .cornerRadius(10)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(recipe.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(2)
                if let category = recipe.category, !category.isEmpty {
                    Text(category)
                        .font(.caption2)
                        .foregroundColor(.orange)
                }
                if let mins = recipe.cook_time_minutes, mins > 0 {
                    Text("⏱ \(mins) min")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}
