import SwiftUI

struct ClassroomView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.horizontalSizeClass) var sizeClass
    @EnvironmentObject var authManager: AuthManager
    var startingMode: ClassroomMode = .learn
    @State private var mode: ClassroomMode = .learn

    init(startingMode: ClassroomMode = .learn) {
        self.startingMode = startingMode
        _mode = State(initialValue: startingMode)
    }

    enum ClassroomMode: CaseIterable {
        case learn, practice, videos, notebook, library

        var label: String {
            switch self {
            case .learn: return "💡 Learn"
            case .practice: return "🍳 Practice"
            case .videos: return "🎬 Videos"
            case .notebook: return "📓 My Notebook"
            case .library: return "📚 Library"
            }
        }

        var tagline: String {
            switch self {
            case .learn: return "Learn the skill, not just the recipe."
            case .practice: return "Put learning into action."
            case .videos: return "Watch the skill. Learn the craft."
            case .notebook: return "Save lessons worth keeping."
            case .library: return "Your saved lessons and videos"
            }
        }

        var heroTitle: String {
            switch self {
            case .learn: return "Ask Chef Jennifer"
            case .practice: return "Let's Cook!"
            case .videos: return "Class Videos"
            case .notebook: return "My Notebook"
            case .library: return "Library"
            }
        }

        var iconName: String {
            switch self {
            case .learn: return "chef-logo"
            case .practice: return "chef-logo"
            case .videos: return "class-videos"
            case .notebook: return "my-notebook"
            case .library: return "library"
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {

            // ── Banner ──
            Image("cooking-school")
                .resizable().scaledToFit()
                .frame(maxWidth: .infinity, maxHeight: 100)


            // ── Mode strip ──
            HStack(spacing: 12) {
                Image(mode.iconName)
                    .resizable().scaledToFit()
                    .frame(width: 56, height: 56)
                    .cornerRadius(12)
                VStack(alignment: .leading, spacing: 2) {
                    Text(mode.heroTitle)
                        .font(.headline).fontWeight(.bold)
                    Text(mode.tagline)
                        .font(.caption).foregroundColor(.secondary)
                }
                Spacer()
            }
            .padding(.horizontal, 16).padding(.vertical, 8)

            Divider()

            // ── Mode tabs ──
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(ClassroomMode.allCases, id: \.self) { m in
                        Button { mode = m } label: {
                            Text(m.label)
                                .font(.subheadline).fontWeight(.semibold)
                                .padding(.horizontal, 18).padding(.vertical, 8)
                                .background(mode == m ? Color.orange : Color(.systemGray5))
                                .foregroundColor(mode == m ? .white : .primary)
                                .cornerRadius(20)
                        }
                    }
                }
                .padding(.horizontal, 16).padding(.vertical, 10)
            }

            Divider()

            // ── Content ──
            switch mode {
            case .learn:
                LearnView().environmentObject(authManager)
            case .practice:
                PracticeView().environmentObject(authManager)
            case .videos:
                ClassVideosView().environmentObject(authManager)
            case .notebook:
                LibraryView().environmentObject(authManager)
            case .library:
                LibraryArticlesView().environmentObject(authManager)
            }
        }
        .navigationBarHidden(sizeClass != .regular)
        .onAppear { mode = startingMode }
    }
}
