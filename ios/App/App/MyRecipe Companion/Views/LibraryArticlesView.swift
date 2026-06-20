import SwiftUI
import Supabase

struct RecipeArticle: Identifiable, Codable {
    let id: UUID
    var title: String
    var summary: String?
    var content: String?
    var topic: String?
    var read_time_minutes: Int?
    var created_at: Date?
}

struct LibraryArticlesView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var articles: [RecipeArticle] = []
    @State private var isLoading = true
    @State private var selectedTopic = "All"
    @State private var topics: [String] = ["All"]
    @State private var selectedArticle: RecipeArticle? = nil
    @State private var openTopics: Set<String> = []

    let topicEmojis: [String: String] = [
        "cooking_times": "⏱", "equipment": "🍳", "knife_skills": "🔪",
        "pantry": "🧂", "safety": "⚠️", "techniques": "👨‍🍳"
    ]

    let topicColors: [String: Color] = [
        "cooking_times": .orange, "equipment": .brown, "knife_skills": .red,
        "pantry": .green, "safety": .yellow, "techniques": .blue
    ]

    var filtered: [RecipeArticle] {
        if selectedTopic == "All" { return articles }
        return articles.filter { $0.topic == selectedTopic }
    }

    var body: some View {
        VStack(spacing: 0) {

            // ── Topic filter ──
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(topics, id: \.self) { topic in
                        Button { selectedTopic = topic } label: {
                            Text(topicLabel(topic))
                                .font(.caption).fontWeight(.semibold)
                                .padding(.horizontal, 12).padding(.vertical, 6)
                                .background(selectedTopic == topic
                                    ? (topicColors[topic] ?? .orange)
                                    : Color(.systemGray5))
                                .foregroundColor(selectedTopic == topic ? .white : .primary)
                                .cornerRadius(20)
                        }
                    }
                }
                .padding(.horizontal, 16).padding(.vertical, 8)
            }

            Divider()

            if isLoading {
                Spacer(); ProgressView(); Spacer()
            } else if filtered.isEmpty {
                Spacer()
                VStack(spacing: 12) {
                    Text("📖").font(.system(size: 50))
                    Text("No articles yet").font(.subheadline).foregroundColor(.gray)
                }
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        let groupedTopics = groupedByTopic()
                        ForEach(groupedTopics, id: \.topic) { group in
                            VStack(spacing: 0) {
                                // Section header
                                Button {
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        if openTopics.contains(group.topic) {
                                            openTopics.remove(group.topic)
                                        } else {
                                            openTopics.insert(group.topic)
                                        }
                                    }
                                } label: {
                                    HStack(spacing: 10) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: 8)
                                                .fill((topicColors[group.topic] ?? .orange).opacity(0.12))
                                                .frame(width: 34, height: 34)
                                            Text(topicEmojis[group.topic] ?? "📖").font(.subheadline)
                                        }
                                        Text(group.topic.replacingOccurrences(of: "_", with: " ").capitalized)
                                            .font(.subheadline).fontWeight(.bold)
                                            .foregroundColor(topicColors[group.topic] ?? .orange)
                                        Text("(\(group.articles.count))")
                                            .font(.caption).foregroundColor(.gray)
                                        Spacer()
                                        Image(systemName: openTopics.contains(group.topic) ? "chevron.up" : "chevron.down")
                                            .font(.caption).foregroundColor(.gray)
                                    }
                                    .padding(.horizontal, 14).padding(.vertical, 12)
                                    .background(Color(.systemBackground))
                                    .cornerRadius(12)
                                    .overlay(RoundedRectangle(cornerRadius: 12)
                                        .stroke((topicColors[group.topic] ?? .orange).opacity(0.2), lineWidth: 1))
                                }
                                .buttonStyle(.plain)

                                // Articles in this section
                                if openTopics.contains(group.topic) {
                                    VStack(spacing: 6) {
                                        ForEach(group.articles) { article in
                                            Button { selectedArticle = article } label: {
                                                HStack(alignment: .top, spacing: 12) {
                                                    VStack(alignment: .leading, spacing: 4) {
                                                        Text(article.title)
                                                            .font(.footnote).fontWeight(.semibold)
                                                            .foregroundColor(.primary).lineLimit(2)
                                                        if let summary = article.summary, !summary.isEmpty {
                                                            Text(summary)
                                                                .font(.caption).foregroundColor(.gray).lineLimit(2)
                                                        }
                                                        if let mins = article.read_time_minutes {
                                                            Text("\(mins) min read")
                                                                .font(.caption2).foregroundColor(.gray)
                                                        }
                                                    }
                                                    Spacer()
                                                    Image(systemName: "chevron.right")
                                                        .font(.caption2).foregroundColor(.gray)
                                                }
                                                .padding(12)
                                                .background(Color(.systemGray6).opacity(0.5))
                                                .cornerRadius(10)
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                    .padding(.top, 6)
                                }
                            }
                        }
                    }
                    .padding(16)
                }
            }
        }
        .sheet(item: $selectedArticle) { article in
            ArticleDetailView(article: article).environmentObject(authManager)
        }
        .task { await loadArticles() }
    }

    func topicLabel(_ topic: String) -> String {
        if topic == "All" { return "All" }
        return "\(topicEmojis[topic] ?? "📖") \(topic.replacingOccurrences(of: "_", with: " ").capitalized)"
    }

    struct TopicGroup { let topic: String; let articles: [RecipeArticle] }

    func groupedByTopic() -> [TopicGroup] {
        let source = selectedTopic == "All" ? articles : articles.filter { $0.topic == selectedTopic }
        var dict: [String: [RecipeArticle]] = [:]
        for article in source {
            let topic = article.topic ?? "other"
            if dict[topic] == nil { dict[topic] = [] }
            dict[topic]!.append(article)
        }
        return dict.keys.sorted().map { TopicGroup(topic: $0, articles: dict[$0]!) }
    }

    func loadArticles() async {
        do {
            let result: [RecipeArticle] = try await supabase
                .from("recipe_articles").select().order("topic", ascending: true).execute().value
            let uniqueTopics = ["All"] + Array(Set(result.compactMap { $0.topic })).sorted()
            await MainActor.run { articles = result; topics = uniqueTopics; openTopics = []; isLoading = false }
        } catch {
            print("loadArticles error:", error)
            await MainActor.run { isLoading = false }
        }
    }
}

// MARK: - Article Detail
struct ArticleDetailView: View {
    let article: RecipeArticle
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var showQuiz = false

    let topicColors: [String: Color] = [
        "cooking_times": .orange, "equipment": .brown, "knife_skills": .red,
        "pantry": .green, "safety": .yellow, "techniques": .blue
    ]

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {

                    // Topic + read time
                    HStack(spacing: 8) {
                        if let topic = article.topic {
                            Text(topic.replacingOccurrences(of: "_", with: " ").capitalized)
                                .font(.caption2).fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 8).padding(.vertical, 4)
                                .background(topicColors[topic] ?? .orange)
                                .cornerRadius(6)
                        }
                        if let mins = article.read_time_minutes {
                            Text("\(mins) min read").font(.caption2).foregroundColor(.gray)
                        }
                    }

                    if let summary = article.summary, !summary.isEmpty {
                        Text(summary)
                            .font(.subheadline).foregroundColor(.secondary).italic()
                            .padding(12)
                            .background(Color(.systemGray6))
                            .cornerRadius(10)
                    }

                    if let content = article.content, !content.isEmpty {
                        Text(content).font(.footnote).lineSpacing(5)
                    }

                    // Quiz button
                    Button { showQuiz = true } label: {
                        HStack(spacing: 8) {
                            Image("chef-logo")
                                .resizable().scaledToFill()
                                .frame(width: 24, height: 24).clipShape(Circle())
                            Text("Quiz Me on This Article").font(.footnote).fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                        .background(Color.orange).foregroundColor(.white).cornerRadius(12)
                    }
                    .padding(.top, 8)
                }
                .frame(maxWidth: .infinity, alignment: .leading).padding(20)
            }
            .navigationTitle(article.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showQuiz) {
                ArticleQuizView(article: article)
            }
        }
    }
}

// MARK: - Quiz
struct QuizQuestion: Codable {
    var question: String
    var options: [String]
    var correct: Int
    var explanation: String
}

struct ArticleQuizView: View {
    let article: RecipeArticle
    @Environment(\.dismiss) var dismiss
    @State private var questions: [QuizQuestion] = []
    @State private var isLoading = true
    @State private var currentIndex = 0
    @State private var selectedAnswer: Int? = nil
    @State private var showExplanation = false
    @State private var score = 0
    @State private var quizDone = false
    @State private var errorMessage = ""

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    VStack(spacing: 16) {
                        Image("chef-logo")
                            .resizable().scaledToFit()
                            .frame(width: 70, height: 70).clipShape(Circle())
                        ProgressView()
                        Text("Chef Jen is writing your quiz...")
                            .font(.footnote).foregroundColor(.gray)
                    }
                } else if !errorMessage.isEmpty {
                    VStack(spacing: 16) {
                        Text("😕").font(.system(size: 50))
                        Text(errorMessage).font(.footnote).foregroundColor(.gray)
                            .multilineTextAlignment(.center).padding(.horizontal)
                        Button("Try Again") { Task { await loadQuiz() } }
                            .buttonStyle(.borderedProminent).tint(.orange)
                    }
                } else if quizDone {
                    VStack(spacing: 20) {
                        Text(scoreEmoji).font(.system(size: 70))
                        Text("Quiz Complete!").font(.title3).fontWeight(.bold)
                        Text("\(score) of \(questions.count) correct")
                            .font(.headline).foregroundColor(.orange)
                        Text(scoreMessage).font(.footnote).foregroundColor(.gray)
                            .multilineTextAlignment(.center).padding(.horizontal, 32)
                        Button("Done") { dismiss() }
                            .buttonStyle(.borderedProminent).tint(.orange)
                    }
                    .padding()
                } else if !questions.isEmpty {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("Question \(currentIndex + 1) of \(questions.count)")
                                    .font(.caption).foregroundColor(.gray)
                                Spacer()
                                Text("Score: \(score)").font(.caption).foregroundColor(.orange)
                            }
                            ProgressView(value: Double(currentIndex), total: Double(questions.count))
                                .tint(.orange)

                            Text(questions[currentIndex].question)
                                .font(.subheadline).fontWeight(.semibold).lineSpacing(4)

                            VStack(spacing: 8) {
                                ForEach(Array(questions[currentIndex].options.enumerated()), id: \.offset) { index, option in
                                    Button {
                                        guard selectedAnswer == nil else { return }
                                        selectedAnswer = index
                                        showExplanation = true
                                        if index == questions[currentIndex].correct { score += 1 }
                                    } label: {
                                        HStack(spacing: 10) {
                                            Text(["A","B","C","D"][index])
                                                .font(.caption2).fontWeight(.bold)
                                                .frame(width: 22, height: 22)
                                                .background(optionColor(index).opacity(0.15))
                                                .foregroundColor(optionColor(index))
                                                .clipShape(Circle())
                                            Text(option).font(.footnote).foregroundColor(.primary)
                                                .multilineTextAlignment(.leading)
                                            Spacer()
                                            if selectedAnswer != nil {
                                                if index == questions[currentIndex].correct {
                                                    Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                                                } else if index == selectedAnswer {
                                                    Image(systemName: "xmark.circle.fill").foregroundColor(.red)
                                                }
                                            }
                                        }
                                        .padding(12)
                                        .background(optionBackground(index))
                                        .cornerRadius(10)
                                        .overlay(RoundedRectangle(cornerRadius: 10)
                                            .stroke(optionBorder(index), lineWidth: 1.5))
                                    }
                                    .disabled(selectedAnswer != nil)
                                }
                            }

                            if showExplanation {
                                HStack(alignment: .top, spacing: 8) {
                                    Image("chef-logo")
                                        .resizable().scaledToFill()
                                        .frame(width: 24, height: 24).clipShape(Circle())
                                    Text(questions[currentIndex].explanation)
                                        .font(.footnote).lineSpacing(4)
                                }
                                .padding(12)
                                .background(Color.orange.opacity(0.06))
                                .cornerRadius(10)

                                Button {
                                    if currentIndex + 1 < questions.count {
                                        currentIndex += 1
                                        selectedAnswer = nil
                                        showExplanation = false
                                    } else {
                                        quizDone = true
                                    }
                                } label: {
                                    Text(currentIndex + 1 < questions.count ? "Next Question →" : "See Results")
                                        .font(.footnote).fontWeight(.semibold)
                                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                                        .background(Color.orange).foregroundColor(.white).cornerRadius(12)
                                }
                            }
                        }
                        .padding(20)
                    }
                }
            }
            .navigationTitle("Study Hall")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .task { await loadQuiz() }
    }

    var scoreEmoji: String {
        let pct = questions.isEmpty ? 0 : (score * 100) / questions.count
        if pct == 100 { return "🏆" }
        if pct >= 70 { return "⭐" }
        if pct >= 50 { return "👍" }
        return "📚"
    }

    var scoreMessage: String {
        let pct = questions.isEmpty ? 0 : (score * 100) / questions.count
        if pct == 100 { return "Perfect score! You really know your stuff." }
        if pct >= 70 { return "Great job! Re-read the article to nail the rest." }
        if pct >= 50 { return "Good start! The article is worth another read." }
        return "Keep at it — every cook starts somewhere!"
    }

    func optionColor(_ index: Int) -> Color {
        guard let selected = selectedAnswer else { return .orange }
        if index == questions[currentIndex].correct { return .green }
        if index == selected { return .red }
        return .gray
    }

    func optionBackground(_ index: Int) -> Color {
        guard let selected = selectedAnswer else { return Color(.systemGray6) }
        if index == questions[currentIndex].correct { return Color.green.opacity(0.08) }
        if index == selected { return Color.red.opacity(0.08) }
        return Color(.systemGray6)
    }

    func optionBorder(_ index: Int) -> Color {
        guard let selected = selectedAnswer else { return Color.clear }
        if index == questions[currentIndex].correct { return .green }
        if index == selected { return .red }
        return Color.clear
    }

    func loadQuiz() async {
        isLoading = true; errorMessage = ""
        do {
            guard let apiUrl = URL(string: "https://recipe.mycompanionapps.com/api/study-hall") else { return }
            var request = URLRequest(url: apiUrl)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = 60
            request.httpBody = try JSONSerialization.data(withJSONObject: ["article_id": article.id.uuidString])
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let questionsData = json["questions"] {
                let questionsJson = try JSONSerialization.data(withJSONObject: questionsData)
                let decoded = try JSONDecoder().decode([QuizQuestion].self, from: questionsJson)
                await MainActor.run { questions = decoded; isLoading = false }
            } else {
                await MainActor.run { errorMessage = "Could not load quiz. Try again."; isLoading = false }
            }
        } catch {
            await MainActor.run { errorMessage = "Connection error: \(error.localizedDescription)"; isLoading = false }
        }
    }
}
