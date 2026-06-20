import SwiftUI
import Supabase

struct LearnView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var messages: [(role: String, content: String)] = []
    @State private var inputText = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var isSavingLesson = false
    @State private var savedLesson = false
    @State private var showPaywall = false
    @State private var monthlyCount = 0

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
        ["What can I make with chicken and pasta?",
         "How do I know when oil is hot enough to fry?",
         "What's a good substitute for buttermilk?",
         "How do I fix an over-salted dish?"]
    }

    var body: some View {
        VStack(spacing: 0) {

            // Usage banner
            if authManager.subscriptionTier != .pro {
                HStack(spacing: 8) {
                    Image(systemName: atLimit ? "lock.fill" : "sparkles")
                        .foregroundColor(atLimit ? .red : .orange).font(.caption)
                    Text(atLimit
                         ? "Monthly limit reached — upgrade for more Chef Jen"
                         : "\(remaining) Chef Jen question\(remaining == 1 ? "" : "s") left this month")
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

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {

                        if messages.isEmpty {
                            VStack(spacing: 14) {
                                VStack(spacing: 8) {
                                    ForEach(quickPrompts, id: \.self) { prompt in
                                        Button {
                                            inputText = prompt
                                            UIApplication.shared.sendAction(
                                                #selector(UIResponder.resignFirstResponder),
                                                to: nil, from: nil, for: nil)
                                            Task { await sendMessage() }
                                        } label: {
                                            HStack {
                                                Image(systemName: "sparkles")
                                                    .font(.caption).foregroundColor(.orange)
                                                Text(prompt)
                                                    .font(.footnote).foregroundColor(.primary)
                                                    .multilineTextAlignment(.leading)
                                                Spacer()
                                                Image(systemName: "chevron.right")
                                                    .font(.caption2).foregroundColor(.gray)
                                            }
                                            .padding(.horizontal, 14).padding(.vertical, 12)
                                            .background(Color(.systemBackground))
                                            .cornerRadius(12)
                                            .overlay(RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color(.systemGray4), lineWidth: 0.5))
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

                        if !messages.isEmpty && messages.last?.role == "assistant" {
                            if savedLesson {
                                HStack(spacing: 6) {
                                    Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                                    Text("Saved to My Notebook")
                                        .font(.footnote).fontWeight(.semibold).foregroundColor(.green)
                                }
                                .padding(12).frame(maxWidth: .infinity)
                                .background(Color.green.opacity(0.08)).cornerRadius(12)
                                .padding(.horizontal, 4)
                            } else {
                                Button { Task { await saveToLearningVault() } } label: {
                                    HStack(spacing: 6) {
                                        if isSavingLesson {
                                            ProgressView().scaleEffect(0.8).tint(.white)
                                        } else {
                                            Image(systemName: "books.vertical")
                                        }
                                        Text(isSavingLesson ? "Saving..." : "Save to My Notebook")
                                            .font(.footnote).fontWeight(.semibold)
                                    }
                                    .frame(maxWidth: .infinity).padding(.vertical, 12)
                                    .background(Color.blue).foregroundColor(.white).cornerRadius(12)
                                }
                                .disabled(isSavingLesson).padding(.horizontal, 4)
                            }
                        }

                        if isLoading {
                            HStack(spacing: 8) {
                                ProgressView().scaleEffect(0.8)
                                Text("Chef Jen is thinking...").font(.caption).foregroundColor(.gray)
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

            // Input bar
            VStack(spacing: 0) {
                Divider()
                HStack(spacing: 10) {
                    HStack(spacing: 8) {
                        Image(systemName: "sparkles").font(.caption).foregroundColor(.orange)
                        TextField("Ask Chef Jennifer anything...", text: $inputText, axis: .vertical)
                            .font(.footnote).lineLimit(1...4)
                    }
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .background(Color(.systemGray6)).cornerRadius(22)

                    Button {
                        UIApplication.shared.sendAction(
                            #selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                        Task { await sendMessage() }
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 14, weight: .bold)).foregroundColor(.white)
                            .frame(width: 34, height: 34)
                            .background(inputText.trimmingCharacters(in: .whitespaces).isEmpty || atLimit
                                ? Color.gray.opacity(0.4) : Color.orange)
                            .clipShape(Circle())
                    }
                    .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty || isLoading || atLimit)
                }
                .padding(.horizontal, 16).padding(.vertical, 10)
            }
            .background(Color(.systemBackground))
        }
        .sheet(isPresented: $showPaywall) { PaywallView().environmentObject(authManager).environmentObject(authManager) }
        .task { await loadMonthlyCount() }
    }

    func loadMonthlyCount() async {
        guard let user = authManager.user else { return }
        let month = monthKey()
        let result: [[String: Int]] = (try? await supabase.from("user_usage")
            .select("chef_jen_count").eq("user_id", value: user.id).eq("month", value: month)
            .execute().value) ?? []
        await MainActor.run { monthlyCount = result.first?["chef_jen_count"] ?? 0 }
    }

    func sendMessage() async {
        // Check limit
        if atLimit {
            showPaywall = true
            return
        }

        let text = inputText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        inputText = ""
        messages.append((role: "user", content: text))
        isLoading = true; errorMessage = ""; savedLesson = false

        do {
            guard let apiUrl = URL(string: "https://recipe.mycompanionapps.com/api/chef") else { return }
            var request = URLRequest(url: apiUrl)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = 60
            let payload: [String: Any] = [
                "messages": messages.map { ["role": $0.role, "content": $0.content] },
                "user_id": authManager.user?.id.uuidString ?? ""
            ]
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let reply = json["reply"] as? String {
                let clean = reply.components(separatedBy: "\n")
                    .filter { !$0.hasPrefix("🎯 Practice this:") }
                    .joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
                messages.append((role: "assistant", content: clean))

                // Increment count
                await MainActor.run { monthlyCount += 1 }
                try? await incrementChefJenCount()
            } else {
                errorMessage = "Chef Jen is unavailable right now. Try again."
            }
        } catch {
            errorMessage = "Connection error: \(error.localizedDescription)"
        }
        isLoading = false
    }

    func incrementChefJenCount() async throws {
        guard let user = authManager.user else { return }
        let month = monthKey()
        try await supabase.rpc("increment_chef_jen_count", params: [
            "p_user_id": user.id.uuidString,
            "p_month": month
        ]).execute()
    }

    func monthKey() -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM"; return f.string(from: Date())
    }

    func saveToLearningVault() async {
        guard let user = authManager.user,
              let lastAnswer = messages.last(where: { $0.role == "assistant" }),
              let question = messages.last(where: { $0.role == "user" }) else { return }
        isSavingLesson = true
        do {
            try await supabase.from("notes").insert([
                "user_id": user.id.uuidString,
                "title": String(question.content.prefix(60)),
                "content": lastAnswer.content,
                "question": question.content,
                "source": "Chef Jennifer"
            ]).execute()
            await MainActor.run { savedLesson = true }
        } catch {
            await MainActor.run { errorMessage = "Could not save: \(error.localizedDescription)" }
        }
        isSavingLesson = false
    }
}

// MARK: - Message Bubble
struct MessageBubble: View {
    let role: String
    let content: String
    var isUser: Bool { role == "user" }

    struct FormattedLine: Identifiable {
        let id = UUID()
        let text: String
        let isHeader: Bool
    }

    var formattedLines: [FormattedLine] {
        content.components(separatedBy: "\n").compactMap { line in
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.isEmpty { return nil }
            if trimmed.hasPrefix("**") && trimmed.hasSuffix("**") {
                return FormattedLine(text: trimmed.replacingOccurrences(of: "**", with: ""), isHeader: true)
            }
            return FormattedLine(text: trimmed, isHeader: false)
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if isUser { Spacer(minLength: 50) }
            if !isUser {
                Image("chef-logo")
                    .resizable().scaledToFill()
                    .frame(width: 26, height: 26).clipShape(Circle())
            }
            VStack(alignment: isUser ? .trailing : .leading, spacing: 3) {
                ForEach(formattedLines) { line in
                    Text(line.text)
                        .font(.footnote)
                        .fontWeight(line.isHeader ? .bold : .regular)
                        .frame(maxWidth: .infinity, alignment: isUser ? .trailing : .leading)
                }
            }
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(isUser ? Color.orange : Color(.systemGray6))
            .foregroundColor(isUser ? .white : .primary)
            .cornerRadius(16)
            .frame(maxWidth: UIScreen.main.bounds.width * 0.78, alignment: isUser ? .trailing : .leading)
            if !isUser { Spacer(minLength: 50) }
        }
    }
}
