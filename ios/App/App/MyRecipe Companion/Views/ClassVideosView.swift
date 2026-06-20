import SwiftUI
import Supabase

struct ClassVideosView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var videos: [ChefVideo] = []
    @State private var savedVideoIds: Set<UUID> = []
    @State private var isLoading = true
    @State private var selectedChannel = "All"
    @State private var channels: [String] = ["All"]

    @Environment(\.horizontalSizeClass) var sizeClass
    var columns: [GridItem] {
        let count = sizeClass == .regular ? 4 : 2
        return Array(repeating: GridItem(.flexible(), spacing: 12), count: count)
    }

    var filtered: [ChefVideo] {
        if selectedChannel == "All" { return videos }
        return videos.filter { $0.channel == selectedChannel }
    }

    var body: some View {
        VStack(spacing: 0) {

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(channels, id: \.self) { channel in
                        Button { selectedChannel = channel } label: {
                            Text(channel)
                                .font(.caption).fontWeight(.semibold)
                                .padding(.horizontal, 12).padding(.vertical, 6)
                                .background(selectedChannel == channel ? Color.orange : Color(.systemGray5))
                                .foregroundColor(selectedChannel == channel ? .white : .primary)
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
                    Text("🎬").font(.system(size: 50))
                    Text("No videos yet").font(.subheadline).foregroundColor(.gray)
                }
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(filtered) { video in
                            VideoCard(
                                video: video,
                                isSaved: savedVideoIds.contains(video.id),
                                onWatch: {
                                    if let youtubeId = video.youtube_id,
                                       let url = URL(string: "https://www.youtube.com/watch?v=\(youtubeId)") {
                                        UIApplication.shared.open(url)
                                    }
                                },
                                onToggleSave: { Task { await toggleSave(video) } }
                            )
                        }
                    }
                    .padding(16)
                }
            }
        }
        .task { await loadAll() }
    }

    func loadAll() async {
        guard let user = authManager.user else { return }
        do {
            async let cookingResult: [ChefVideo] = supabase
                .from("cooking_videos").select().eq("is_hidden", value: false)
                .order("view_count", ascending: false).execute().value
            async let educationResult: [ChefVideo] = supabase
                .from("education_videos").select().eq("is_hidden", value: false)
                .order("view_count", ascending: false).execute().value
            async let savedResult: [SavedVideoEntry] = supabase
                .from("saved_videos").select("video_id").eq("user_id", value: user.id).execute().value
            async let savedEduResult: [SavedVideoEntry] = supabase
                .from("saved_education_videos").select("video_id").eq("user_id", value: user.id).execute().value
            let (cooking, education, saved, savedEdu) = try await (cookingResult, educationResult, savedResult, savedEduResult)
            var all = cooking + education
            all.sort { ($0.view_count ?? 0) > ($1.view_count ?? 0) }
            var channelSet = ["All"]
            channelSet.append(contentsOf: Array(Set(all.compactMap { $0.channel })).sorted())
            let savedIds = Set(saved.map { $0.video_id } + savedEdu.map { $0.video_id })
            await MainActor.run {
                videos = all; channels = channelSet
                savedVideoIds = savedIds; isLoading = false
            }
        } catch {
            print("loadAll error:", error)
            await MainActor.run { isLoading = false }
        }
    }

    func toggleSave(_ video: ChefVideo) async {
        guard let user = authManager.user else { return }
        let isSaved = savedVideoIds.contains(video.id)

        if isSaved {
            // Unsave — remove from both tables
            try? await supabase.from("saved_videos")
                .delete().eq("video_id", value: video.id).eq("user_id", value: user.id).execute()
            try? await supabase.from("saved_education_videos")
                .delete().eq("video_id", value: video.id).eq("user_id", value: user.id).execute()
            await MainActor.run { savedVideoIds.remove(video.id) }
        } else {
            // Save — try cooking first, fall back to education
            do {
                try await supabase.from("saved_videos")
                    .insert(["user_id": user.id.uuidString, "video_id": video.id.uuidString]).execute()
                await MainActor.run { savedVideoIds.insert(video.id) }
            } catch {
                do {
                    try await supabase.from("saved_education_videos")
                        .insert(["user_id": user.id.uuidString, "video_id": video.id.uuidString]).execute()
                    await MainActor.run { savedVideoIds.insert(video.id) }
                } catch { print("toggleSave error:", error) }
            }
        }
    }
}

struct SavedVideoEntry: Codable {
    var video_id: UUID
}

// MARK: - Video Card
struct VideoCard: View {
    let video: ChefVideo
    let isSaved: Bool
    let onWatch: () -> Void
    let onToggleSave: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {

            ZStack(alignment: .bottomTrailing) {
                AsyncImage(url: URL(string: video.thumbnail_url ?? "")) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    ZStack {
                        Color.orange.opacity(0.12)
                        Image(systemName: "play.rectangle.fill")
                            .font(.largeTitle).foregroundColor(.orange.opacity(0.4))
                    }
                }
                .frame(height: 100).clipped()

                Button(action: onWatch) {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.white)
                        .shadow(color: .black.opacity(0.4), radius: 4)
                }
                .padding(6)
            }
            .cornerRadius(10)

            VStack(alignment: .leading, spacing: 4) {
                Text(video.title)
                    .font(.caption2).fontWeight(.semibold)
                    .lineLimit(2).foregroundColor(.primary)

                if let channel = video.channel {
                    Text(channel).font(.caption2).foregroundColor(.gray)
                }

                // Toggle save/unsave button
                Button(action: onToggleSave) {
                    HStack(spacing: 4) {
                        Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                            .font(.caption2)
                        Text(isSaved ? "Saved" : "Save")
                            .font(.caption2).fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 5)
                    .background(isSaved ? Color.orange.opacity(0.1) : Color(.systemGray5))
                    .foregroundColor(isSaved ? .orange : .primary)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 8).padding(.vertical, 8)
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.06), radius: 6, x: 0, y: 2)
    }
}
