import SwiftUI
import Supabase

struct PracticeView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var messages: [(role: String, content: String)] = []
    @State private var inputText = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var lastPracticeRecipe: [String: Any]? = nil
    @State private var isSavingRecipe = false
    @State private var savedSuccess = false
    @State private var showPaywall = false
    @State private var monthlyCount = 0
    @State private var totalRecipes = 0

    var limit: Int {
        switch authManager.subscriptionTier {
        case .free: return 2
        case .premium: return 5
        case .pro: return Int.max
        }
    }

    var atLimit: Bool { monthlyCount >= limit }
    var remaining: Int { max(0, limit - monthlyCount) }

    var quickPrompts: [String] {
        ["Make me a simple weeknight dinner",
         "Something quick with chicken",
         "A vegetarian meal under 30 minutes",
         "A comfort food recipe for the weekend"]
    }

    var body: some View {
        VStack(spacing: 0) {
            if authManager.subscriptionTier != .pro {
                HStack(spacing: 8) {
                    Image(systemName: atLimit ? "lock.fill" : "flame")
                        .foregroundColor(atLimit ? .red : .orange).font(.caption)
                    Text(atLimit
                         ? "Monthly limit reached — upgrade for more recipes"
                         : "\(remaining) Chef Jen use\(remaining == 1 ? "" : "s") left this month")
                        .font(.caption).foregroundColor(atLimit ? .red : .orange)
                    Spacer()
                    if atLimit {
                        Button("Upgrade") { showPaywall = true }
                            .font(.caption).fontWeight(.semibold).foregroundColor(.white)
                            .padding(.horizontal, 10).padding(.vertical, 4)
                            .background(Color.orange).cornerRadius(8)
                    }
                }
                .padding(.horizontal, 16).padding(.vertical, 8)
                .background(atLimit ? Color.red.opacity(0.06) : Color.orange.opacity(0.06))
            }

            // ── Input bar (top) ──
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    HStack(spacing: 8) {
                        Image(systemName: "flame").font(.caption).foregroundColor(.orange)
                        TextField("What do you want to make?", text: $inputText, axis: .vertical)
                            .font(.footnote).lineLimit(1...4)
                    }
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .background(Color(.systemGray6)).cornerRadius(22)

                    Button {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                        Task { await sendMessage() }
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 14, weight: .bold)).foregroundColor(.white)
                            .frame(width: 34, height: 34)
                            .background(inputText.trimmingCharacters(in: .whitespaces).isEmpty || atLimit ? Color.gray.opacity(0.4) : Color.orange)
                            .clipShape(Circle())
                    }
                    .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty || isLoading || atLimit)
                }
                .padding(.horizontal, 16).padding(.vertical, 10)
                Divider()
            }
            .background(Color(.systemBackground))
                ScrollView {
                    LazyVStack(spacing: 12) {
                        if messages.isEmpty {
                            VStack(spacing: 14) {
                                VStack(spacing: 8) {
                                    ForEach(quickPrompts, id: \.self) { prompt in
                                        Button {
                                            inputText = prompt
                                            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                                            Task { await sendMessage() }
                                        } label: {
                                            HStack {
                                                Image(systemName: "flame").font(.caption).foregroundColor(.orange)
                                                Text(prompt).font(.footnote).foregroundColor(.primary).multilineTextAlignment(.leading)
                                                Spacer()
                                                Image(systemName: "chevron.right").font(.caption2).foregroundColor(.gray)
                                            }
                                            .padding(.horizontal, 14).padding(.vertical, 12)
                                            .background(Color(.systemBackground)).cornerRadius(12)
                                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.systemGray4), lineWidth: 0.5))
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                                .padding(.horizontal, 4)
                            }
                            .padding(.top, 16).padding(.horizontal, 4)
                        }

                        ForEach(Array(messages.enumerated()), id: \.offset) { index, message in
                            MessageBubble(role: message.role, content: message.content).id(index)
                        }

                        if lastPracticeRecipe != nil && !messages.isEmpty {
                            if savedSuccess {
                                VStack(spacing: 8) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                                        Text("Saved to Recipe Vault!").font(.footnote).fontWeight(.semibold).foregroundColor(.green)
                                    }
                                    Button { messages = []; lastPracticeRecipe = nil; savedSuccess = false } label: {
                                        Text("Make another recipe →").font(.footnote).foregroundColor(.orange)
                                    }
                                }
                                .padding(12).frame(maxWidth: .infinity)
                                .background(Color.green.opacity(0.08)).cornerRadius(12)
                                .padding(.horizontal, 4)
                            } else {
                                Button { Task { await saveToVault() } } label: {
                                    HStack(spacing: 6) {
                                        if isSavingRecipe { ProgressView().scaleEffect(0.8).tint(.white) }
                                        else { Image(systemName: "square.and.arrow.down") }
                                        Text(isSavingRecipe ? "Saving..." : "Save to Recipe Vault").font(.footnote).fontWeight(.semibold)
                                    }
                                    .frame(maxWidth: .infinity).padding(.vertical, 12)
                                    .background(Color.orange).foregroundColor(.white).cornerRadius(12)
                                }
                                .disabled(isSavingRecipe).padding(.horizontal, 4)
                            }
                        }

                        if isLoading {
                            HStack(spacing: 8) {
                                ProgressView().scaleEffect(0.8)
                                Text("Chef Jen is creating your recipe...").font(.caption).foregroundColor(.gray)
                                Spacer()
                            }.padding(.horizontal, 4)
                        }

                        if !errorMessage.isEmpty {
                            Text(errorMessage).font(.caption).foregroundColor(.red).padding(.horizontal, 4)
                        }
                    }
                    .padding(.horizontal, 16).padding(.vertical, 12)
                }
                .onChange(of: messages.count) { _ in
                    withAnimation { proxy.scrollTo(messages.count - 1, anchor: .bottom) }
                }
            }

            // Input bar removed — moved to top
        }
        .sheet(isPresented: $showPaywall) { PaywallView().environmentObject(authManager) }
        .task { await loadCounts() }
    }

    func loadCounts() async {
        guard let user = authManager.user else { return }
        let month = monthKey()
        let usage: [[String: Int]] = (try? await supabase.from("user_usage")
            .select("chef_jen_count").eq("user_id", value: user.id).eq("month", value: month)
            .execute().value) ?? []
        let recipes: [[String: String]] = (try? await supabase.from("personal_recipes")
            .select("id").eq("user_id", value: user.id).is("deleted_at", value: nil)
            .execute().value) ?? []
        await MainActor.run {
            monthlyCount = usage.first?["chef_jen_count"] ?? 0
            totalRecipes = recipes.count
        }
    }

    func sendMessage() async {
        if atLimit { showPaywall = true; return }
        guard let user = authManager.user else { return }
        let month = monthKey()
        let text = inputText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        inputText = ""
        messages.append((role: "user", content: text))
        isLoading = true; errorMessage = ""
        lastPracticeRecipe = nil; savedSuccess = false
        do {
            guard let apiUrl = URL(string: "https://recipe.mycompanionapps.com/api/topchef") else { return }
            var request = URLRequest(url: apiUrl)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = 60
            let payload: [String: Any] = ["prompt": text, "difficulty": "Home Cook", "cuisine": "Any"]
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let recipe = json["recipe"] as? [String: Any],
               let title = recipe["title"] as? String {
                lastPracticeRecipe = recipe
                let desc = recipe["description"] as? String ?? ""
                let instructions = recipe["instructions"] as? String ?? ""
                var ingredientText = ""
                if let ingredients = recipe["ingredients"] as? [[String: Any]] {
                    ingredientText = ingredients.compactMap { ing -> String? in
                        let name = ing["name"] as? String ?? ""
                        let measure = ing["measure"] as? String ?? ""
                        if name.isEmpty { return nil }
                        return measure.isEmpty ? "• \(name)" : "• \(measure) \(name)"
                    }.joined(separator: "\n")
                }
                var reply = "**\(title)**"
                if !desc.isEmpty { reply += "\n\n\(desc)" }
                if !ingredientText.isEmpty { reply += "\n\n**Ingredients:**\n\(ingredientText)" }
                if !instructions.isEmpty { reply += "\n\n**Instructions:**\n\(instructions)" }
                messages.append((role: "assistant", content: reply))
                await MainActor.run { monthlyCount += 1 }
                try? await supabase.rpc("increment_chef_jen_count", params: [
                    "p_user_id": user.id.uuidString, "p_month": month
                ]).execute()
            } else {
                errorMessage = "Could not generate recipe. Try again."
            }
        } catch {
            errorMessage = "Connection error: \(error.localizedDescription)"
        }
        isLoading = false
    }

    func saveToVault() async {
        guard let recipe = lastPracticeRecipe,
              let user = authManager.user,
              let title = recipe["title"] as? String else { return }
        if authManager.subscriptionTier == .free && totalRecipes >= 15 {
            showPaywall = true; return
        }
        isSavingRecipe = true
        do {
            var ingredientsArray: [[String: String]] = []
            if let ingredients = recipe["ingredients"] as? [[String: Any]] {
                ingredientsArray = ingredients.compactMap { ing in
                    guard let name = ing["name"] as? String else { return nil }
                    return ["name": name, "amount": ing["measure"] as? String ?? ""]
                }
            }
            let insertData: [String: AnyJSON] = [
                "user_id": .string(user.id.uuidString),
                "title": .string(title),
                "description": .string(recipe["description"] as? String ?? ""),
                "instructions": .string(recipe["instructions"] as? String ?? ""),
                "family_notes": .string("Generated by Chef Jennifer"),
                "ingredients": .array(ingredientsArray.map { dict in .object(dict.mapValues { .string($0) }) })
            ]
            try await supabase.from("personal_recipes").insert(insertData).execute()
            await MainActor.run { savedSuccess = true; totalRecipes += 1 }
        } catch {
            await MainActor.run { errorMessage = "Could not save: \(error.localizedDescription)" }
        }
        isSavingRecipe = false
    }

    func monthKey() -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM"; return f.string(from: Date())
    }
}
