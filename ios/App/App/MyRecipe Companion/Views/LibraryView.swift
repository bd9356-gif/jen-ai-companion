import SwiftUI
import Supabase

struct LibraryView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var notes: [LibraryNote] = []
    @State private var savedVideos: [ChefVideo] = []
    @State private var isLoading = true
    @State private var selectedNote: LibraryNote? = nil
    @State private var tab: LibraryTab = .lessons
    @State private var openMonths: Set<String> = []

    enum LibraryTab { case lessons, videos }

    var groupedNotes: [(month: String, notes: [LibraryNote])] {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        var dict: [String: [LibraryNote]] = [:]
        for note in notes {
            let key = note.created_at.map { formatter.string(from: $0) } ?? "Unknown"
            if dict[key] == nil { dict[key] = [] }
            dict[key]!.append(note)
        }
        // Sort months newest first
        let sorted = dict.keys.sorted { a, b in
            let da = formatter.date(from: a) ?? Date.distantPast
            let db = formatter.date(from: b) ?? Date.distantPast
            return da > db
        }
        return sorted.map { (month: $0, notes: dict[$0]!) }
    }

    var body: some View {
        VStack(spacing: 0) {

            Picker("Tab", selection: $tab) {
                Text("💡 Lessons").tag(LibraryTab.lessons)
                Text("🎬 Videos").tag(LibraryTab.videos)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16).padding(.vertical, 8)

            Divider()

            if isLoading {
                Spacer(); ProgressView(); Spacer()
            } else {
                switch tab {
                case .lessons:
                    if notes.isEmpty {
                        Spacer()
                        VStack(spacing: 14) {
                            Image("chef-logo")
                                .resizable().scaledToFit()
                                .frame(width: 80, height: 80).clipShape(Circle())
                            Text("No lessons saved yet")
                                .font(.subheadline).fontWeight(.semibold)
                            Text("Save answers from Chef Jennifer's Learn mode")
                                .font(.caption).foregroundColor(.gray)
                                .multilineTextAlignment(.center).padding(.horizontal, 32)
                        }
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 8) {
                                ForEach(groupedNotes, id: \.month) { group in
                                    VStack(spacing: 0) {
                                        // Month header
                                        Button {
                                            withAnimation(.easeInOut(duration: 0.2)) {
                                                if openMonths.contains(group.month) {
                                                    openMonths.remove(group.month)
                                                } else {
                                                    openMonths.insert(group.month)
                                                }
                                            }
                                        } label: {
                                            HStack(spacing: 10) {
                                                ZStack {
                                                    Circle().fill(Color.blue.opacity(0.1))
                                                        .frame(width: 32, height: 32)
                                                    Image(systemName: "calendar")
                                                        .font(.caption).foregroundColor(.blue)
                                                }
                                                Text(group.month)
                                                    .font(.subheadline).fontWeight(.bold)
                                                    .foregroundColor(.blue)
                                                Text("(\(group.notes.count))")
                                                    .font(.caption).foregroundColor(.gray)
                                                Spacer()
                                                Image(systemName: openMonths.contains(group.month) ? "chevron.up" : "chevron.down")
                                                    .font(.caption).foregroundColor(.gray)
                                            }
                                            .padding(.horizontal, 14).padding(.vertical, 12)
                                            .background(Color(.systemBackground))
                                            .cornerRadius(12)
                                            .overlay(RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.blue.opacity(0.2), lineWidth: 1))
                                        }
                                        .buttonStyle(.plain)

                                        // Notes in this month
                                        if openMonths.contains(group.month) {
                                            VStack(spacing: 6) {
                                                ForEach(group.notes) { note in
                                                    Button { selectedNote = note } label: {
                                                        HStack(alignment: .top, spacing: 12) {
                                                            ZStack {
                                                                Circle().fill(Color.blue.opacity(0.08))
                                                                    .frame(width: 32, height: 32)
                                                                Image(systemName: "lightbulb.fill")
                                                                    .font(.caption2).foregroundColor(.blue)
                                                            }
                                                            VStack(alignment: .leading, spacing: 3) {
                                                                Text(note.title)
                                                                    .font(.footnote).fontWeight(.semibold)
                                                                    .foregroundColor(.primary).lineLimit(2)
                                                                if let question = note.question, !question.isEmpty {
                                                                    Text(question)
                                                                        .font(.caption).foregroundColor(.gray).lineLimit(1)
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
                                                    .contextMenu {
                                                        Button(role: .destructive) {
                                                            Task { await deleteNote(note) }
                                                        } label: {
                                                            Label("Delete Note", systemImage: "trash")
                                                        }
                                                    }
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

                case .videos:
                    if savedVideos.isEmpty {
                        Spacer()
                        VStack(spacing: 14) {
                            Text("🎬").font(.system(size: 50))
                            Text("No videos saved yet")
                                .font(.subheadline).fontWeight(.semibold)
                            Text("Save videos from Class Videos")
                                .font(.caption).foregroundColor(.gray)
                                .multilineTextAlignment(.center).padding(.horizontal, 32)
                        }
                        Spacer()
                    } else {
                        List {
                                ForEach(savedVideos) { video in
                                    HStack(spacing: 12) {
                                        AsyncImage(url: URL(string: video.thumbnail_url ?? "")) { image in
                                            image.resizable().scaledToFill()
                                        } placeholder: { Color.orange.opacity(0.12) }
                                        .frame(width: 88, height: 58).cornerRadius(8).clipped()

                                        VStack(alignment: .leading, spacing: 3) {
                                            Text(video.title)
                                                .font(.footnote).fontWeight(.semibold)
                                                .lineLimit(2).foregroundColor(.primary)
                                            if let channel = video.channel {
                                                Text(channel).font(.caption2).foregroundColor(.gray)
                                            }
                                        }
                                        Spacer()
                                        Button {
                                            if let youtubeId = video.youtube_id,
                                               let url = URL(string: "https://www.youtube.com/watch?v=\(youtubeId)") {
                                                UIApplication.shared.open(url)
                                            }
                                        } label: {
                                            Image(systemName: "play.circle.fill")
                                                .font(.title2).foregroundColor(.orange)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                    .padding(12)
                                    .background(Color(.systemBackground))
                                    .cornerRadius(12)
                                    .overlay(RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color(.systemGray5), lineWidth: 0.5))
                                    .swipeActions(edge: .trailing) {
                                        Button(role: .destructive) {
                                            Task { await deleteVideo(video) }
                                        } label: {
                                            Label("Remove", systemImage: "trash")
                                        }
                                    }
                                }
                            .listStyle(.plain)
                        }
                    }
                }
            }
        }
        .sheet(item: $selectedNote) { note in NoteDetailView(note: note) }
        .task { await loadAll() }
    }

    func loadAll() async {
        guard let user = authManager.user else { return }
        do {
            async let notesResult: [LibraryNote] = supabase.from("notes").select()
                .eq("user_id", value: user.id).order("created_at", ascending: false).execute().value
            async let savedCookingIds: [SavedVideoEntry] = supabase.from("saved_videos")
                .select("video_id").eq("user_id", value: user.id).execute().value
            async let savedEduIds: [SavedVideoEntry] = supabase.from("saved_education_videos")
                .select("video_id").eq("user_id", value: user.id).execute().value
            let (notesList, cookingIds, eduIds) = try await (notesResult, savedCookingIds, savedEduIds)
            var allVideos: [ChefVideo] = []
            if !cookingIds.isEmpty {
                let ids = cookingIds.map { $0.video_id.uuidString }
                let v: [ChefVideo] = try await supabase.from("cooking_videos").select()
                    .in("id", values: ids).execute().value
                allVideos.append(contentsOf: v)
            }
            if !eduIds.isEmpty {
                let ids = eduIds.map { $0.video_id.uuidString }
                let v: [ChefVideo] = try await supabase.from("education_videos").select()
                    .in("id", values: ids).execute().value
                allVideos.append(contentsOf: v)
            }
            await MainActor.run { notes = notesList; savedVideos = allVideos; isLoading = false }
        } catch {
            print("LibraryView loadAll error:", error)
            await MainActor.run { isLoading = false }
        }
    }

    func deleteNote(_ note: LibraryNote) async {
        try? await supabase.from("notes").delete().eq("id", value: note.id).execute()
        await MainActor.run { notes.removeAll { $0.id == note.id } }
    }

    func deleteVideo(_ video: ChefVideo) async {
        guard let user = authManager.user else { return }
        try? await supabase.from("saved_videos")
            .delete().eq("video_id", value: video.id).eq("user_id", value: user.id).execute()
        try? await supabase.from("saved_education_videos")
            .delete().eq("video_id", value: video.id).eq("user_id", value: user.id).execute()
        await MainActor.run { savedVideos.removeAll { $0.id == video.id } }
    }
}

// MARK: - Note Detail
struct NoteDetailView: View {
    let note: LibraryNote
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let question = note.question, !question.isEmpty {
                        HStack(alignment: .top, spacing: 8) {
                            Image("chef-logo")
                                .resizable().scaledToFill()
                                .frame(width: 24, height: 24).clipShape(Circle())
                            Text(question)
                                .font(.footnote).foregroundColor(.orange)
                        }
                        .padding(12)
                        .background(Color.orange.opacity(0.06))
                        .cornerRadius(10)
                    }
                    if let content = note.content, !content.isEmpty {
                        Text(content).font(.footnote).lineSpacing(5)
                    }
                    if let source = note.source, !source.isEmpty {
                        Text("Source: \(source)").font(.caption2).foregroundColor(.gray)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading).padding(20)
            }
            .navigationTitle(note.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
