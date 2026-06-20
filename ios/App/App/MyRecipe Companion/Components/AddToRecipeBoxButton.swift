import SwiftUI
import Supabase

struct AddToRecipeBoxButton: View {
    let recipeId: UUID
    @EnvironmentObject var authManager: AuthManager
    @State private var isInBox = false
    @State private var isLoading = true
    @State private var isWorking = false

    var body: some View {
        Button {
            Task { await toggleBox() }
        } label: {
            HStack {
                Image(systemName: isInBox ? "checkmark.circle.fill" : "plus.circle")
                    .font(.subheadline).foregroundColor(isInBox ? .green : .orange)
                Text(isInBox ? "In Your Recipe Box" : "Add to Recipe Box")
                    .font(.subheadline).fontWeight(.semibold)
                    .foregroundColor(isInBox ? .green : .primary)
                Spacer()
                Image(systemName: "chevron.right").font(.caption2).foregroundColor(.gray)
            }
            .padding(.horizontal, 14).padding(.vertical, 11)
            .background(isInBox ? Color.green.opacity(0.06) : Color(.systemGray6))
            .cornerRadius(12)
        }
        .disabled(isWorking || isLoading)
        .task { await checkBox() }
    }

    func checkBox() async {
        guard let user = authManager.user else { return }
        do {
            let result: [[String: String]] = try await supabase
                .from("recipe_cards").select("id")
                .eq("user_id", value: user.id)
                .eq("recipe_id", value: recipeId)
                .execute().value
            await MainActor.run { isInBox = !result.isEmpty; isLoading = false }
        } catch { await MainActor.run { isLoading = false } }
    }

    func toggleBox() async {
        guard let user = authManager.user else { return }
        isWorking = true
        do {
            if isInBox {
                try await supabase.from("recipe_cards").delete()
                    .eq("user_id", value: user.id).eq("recipe_id", value: recipeId).execute()
                await MainActor.run { isInBox = false }
            } else {
                try await supabase.from("recipe_cards")
                    .insert(["user_id": user.id.uuidString, "recipe_id": recipeId.uuidString]).execute()
                await MainActor.run { isInBox = true }
            }
        } catch { print("toggleBox error:", error) }
        isWorking = false
    }
}
