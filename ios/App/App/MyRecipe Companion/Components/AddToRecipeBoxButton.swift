import SwiftUI
import Supabase

struct AddToRecipeBoxButton: View {
    let recipeId: UUID
    @EnvironmentObject var authManager: AuthManager
    @State private var isInBox = false
    @State private var isLoading = true
    @State private var isWorking = false
    @State private var boxCount = 0
    @State private var showPaywall = false

    let freeBoxLimit = 3

    var isAtFreeLimit: Bool {
        authManager.subscriptionTier == .free && !isInBox && boxCount >= freeBoxLimit
    }

    var body: some View {
        Button {
            if isAtFreeLimit {
                showPaywall = true
            } else {
                Task { await toggleBox() }
            }
        } label: {
            HStack {
                Image(systemName: isAtFreeLimit ? "lock.fill" : isInBox ? "checkmark.circle.fill" : "plus.circle")
                    .font(.subheadline)
                    .foregroundColor(isAtFreeLimit ? .gray : isInBox ? .green : .orange)
                Text(isAtFreeLimit ? "Recipe Box full — upgrade to add more" : isInBox ? "In Your Recipe Box" : "Add to Recipe Box")
                    .font(.subheadline).fontWeight(.semibold)
                    .foregroundColor(isAtFreeLimit ? .gray : isInBox ? .green : .primary)
                Spacer()
                Image(systemName: "chevron.right").font(.caption2).foregroundColor(.gray)
            }
            .padding(.horizontal, 14).padding(.vertical, 11)
            .background(isAtFreeLimit ? Color(.systemGray6) : isInBox ? Color.green.opacity(0.06) : Color(.systemGray6))
            .cornerRadius(12)
        }
        .disabled(isWorking || isLoading)
        .task { await checkBox() }
        .sheet(isPresented: $showPaywall) {
            PaywallView().environmentObject(authManager)
        }
    }

    func checkBox() async {
        guard let user = authManager.user else { return }
        do {
            let result: [[String: String]] = try await supabase
                .from("recipe_cards").select("id")
                .eq("user_id", value: user.id)
                .eq("recipe_id", value: recipeId)
                .execute().value
            // Also get total box count for free tier limit
            let allCards: [[String: String]] = try await supabase
                .from("recipe_cards").select("id")
                .eq("user_id", value: user.id)
                .execute().value
            await MainActor.run {
                isInBox = !result.isEmpty
                boxCount = allCards.count
                isLoading = false
            }
        } catch { await MainActor.run { isLoading = false } }
    }

    func toggleBox() async {
        guard let user = authManager.user else { return }
        isWorking = true
        do {
            if isInBox {
                try await supabase.from("recipe_cards").delete()
                    .eq("user_id", value: user.id).eq("recipe_id", value: recipeId).execute()
                await MainActor.run { isInBox = false; boxCount = max(0, boxCount - 1) }
            } else {
                try await supabase.from("recipe_cards")
                    .insert(["user_id": user.id.uuidString, "recipe_id": recipeId.uuidString]).execute()
                await MainActor.run { isInBox = true; boxCount += 1 }
            }
        } catch { print("toggleBox error:", error) }
        isWorking = false
    }
}
