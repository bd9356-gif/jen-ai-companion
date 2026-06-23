import SwiftUI
import Supabase

struct ShareQueueView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.horizontalSizeClass) var sizeClass
    @State private var recipes: [Recipe] = []
    @State private var isLoading = true
    @State private var showPaywall = false

    var body: some View {
        VStack(spacing: 0) {

            // ── Back + Banner ──
            ZStack(alignment: .bottomLeading) {
                Image("social-share-hero")
                    .resizable().scaledToFit()
                    .frame(maxWidth: .infinity, maxHeight: 100)
                Button { dismiss() } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.primary)
                        .padding(8)
                        .background(Color(.systemBackground).opacity(0.9))
                        .clipShape(Circle())
                }
                .padding(.leading, 12).padding(.bottom, 8)
            }
            .frame(maxWidth: .infinity)
            if !recipes.isEmpty {
                HStack {
                    Text("\(recipes.count) recipe\(recipes.count == 1 ? "" : "s") ready to share")
                        .font(.caption).foregroundColor(.secondary)
                    Spacer()
                    Button("Clear All") { Task { await clearAll() } }
                        .font(.caption).fontWeight(.semibold)
                        .foregroundColor(.red)
                }
                .padding(.horizontal, 16).padding(.vertical, 6)
            }

            Divider()

            if isLoading {
                Spacer(); ProgressView(); Spacer()
            } else if recipes.isEmpty {
                Spacer()
                VStack(spacing: 16) {
                    Text("📤").font(.system(size: 60))
                    Text("Nothing queued to share").font(.title3).fontWeight(.semibold)
                    Text("From any recipe tap \"Add to Share Box\" to queue recipes here")
                        .font(.subheadline).foregroundColor(.gray)
                        .multilineTextAlignment(.center).padding(.horizontal, 32)
                }
                Spacer()
            } else {
                List {
                    ForEach(recipes) { recipe in
                        HStack(spacing: 12) {
                            if let photoUrl = recipe.photo_url, !photoUrl.isEmpty {
                                AsyncImage(url: URL(string: photoUrl)) { image in
                                    image.resizable().scaledToFill()
                                } placeholder: { Color.orange.opacity(0.15) }
                                .frame(width: 64, height: 64).cornerRadius(10).clipped()
                            } else {
                                ZStack {
                                    Color.orange.opacity(0.1)
                                    Text("🍽️").font(.title3)
                                }
                                .frame(width: 64, height: 64).cornerRadius(10)
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                Text(recipe.title).font(.subheadline).fontWeight(.semibold).lineLimit(2)
                                if let category = recipe.category, !category.isEmpty {
                                    Text(category).font(.caption2).foregroundColor(.orange)
                                }
                            }

                            Spacer()

                            HStack(spacing: 8) {
                                Button {
                                    if authManager.subscriptionTier == .free { showPaywall = true }
                                    else { shareRecipe(recipe) }
                                } label: {
                                    HStack(spacing: 4) {
                                        Image(systemName: authManager.subscriptionTier == .free ? "lock.fill" : "square.and.arrow.up").font(.caption)
                                        Text("Share").font(.caption).fontWeight(.semibold)
                                    }
                                    .padding(.horizontal, 12).padding(.vertical, 8)
                                    .background(authManager.subscriptionTier == .free ? Color.gray : Color.orange)
                                    .foregroundColor(.white).cornerRadius(8)
                                }
                                .buttonStyle(.borderless)

                                Button { Task { await removeFromQueue(recipe) } } label: {
                                    Image(systemName: "xmark")
                                        .font(.caption).foregroundColor(.gray)
                                        .frame(width: 30, height: 30)
                                        .background(Color(.systemGray5))
                                        .clipShape(Circle())
                                }
                                .buttonStyle(.borderless)
                            }
                        }
                        .padding(.vertical, 6)
                    }
                }
                .listStyle(.plain)
            }
        }
        .ignoresSafeArea(edges: .top)
        .navigationBarHidden(sizeClass != .regular)
        .task { await loadQueue() }
        .sheet(isPresented: $showPaywall) { PaywallView().environmentObject(authManager) }
        .frame(maxWidth: sizeClass == .regular ? 700 : .infinity)
        .frame(maxWidth: .infinity)
    }

    func loadQueue() async {
        guard let user = authManager.user else { return }
        do {
            let result: [Recipe] = try await supabase
                .from("personal_recipes").select()
                .eq("user_id", value: user.id)
                .eq("is_in_share_queue", value: true)
                .is("deleted_at", value: nil)
                .order("created_at", ascending: false)
                .execute().value
            await MainActor.run { recipes = result; isLoading = false }
        } catch {
            print("loadQueue error:", error)
            await MainActor.run { isLoading = false }
        }
    }

    func shareRecipe(_ recipe: Recipe) {
        let shareURL = URL(string: "https://recipe.mycompanionapps.com/share/\(recipe.id)")!
        let title = recipe.title + " — shared from MyRecipe Companion 👩‍🍳"
        let av = UIActivityViewController(activityItems: [title, shareURL], applicationActivities: nil)
        av.excludedActivityTypes = [.addToReadingList, .assignToContact, .openInIBooks]
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            var topVC = window.rootViewController
            while let presented = topVC?.presentedViewController { topVC = presented }
            av.popoverPresentationController?.sourceView = window
            av.popoverPresentationController?.sourceRect = CGRect(x: window.bounds.midX, y: window.bounds.midY, width: 0, height: 0)
            topVC?.present(av, animated: true)
        }
    }

    func removeFromQueue(_ recipe: Recipe) async {
        do {
            try await supabase.from("personal_recipes")
                .update(["is_in_share_queue": false])
                .eq("id", value: recipe.id).execute()
            await MainActor.run { recipes.removeAll { $0.id == recipe.id } }
        } catch { print("removeFromQueue error:", error) }
    }

    func clearAll() async {
        do {
            for recipe in recipes {
                try await supabase.from("personal_recipes")
                    .update(["is_in_share_queue": false])
                    .eq("id", value: recipe.id).execute()
            }
            await MainActor.run { recipes = [] }
        } catch { print("clearAll error:", error) }
    }
}
