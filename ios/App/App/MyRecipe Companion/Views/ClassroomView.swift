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

    @State private var iPadShowLanding: Bool = true

    var body: some View {
        VStack(spacing: 0) {

            // ── Banner ──
            Image("cooking-school")
                .resizable().scaledToFit()
                .frame(maxWidth: .infinity, maxHeight: 100)

            if sizeClass == .regular && iPadShowLanding {
                // ── iPad Landing Grid ──
                ScrollView {
                    VStack(spacing: 20) {
                        Text("What would you like to do today?")
                            .font(.headline).foregroundColor(.secondary)
                            .padding(.top, 8)

                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                            ForEach([ClassroomMode.learn, .practice, .videos, .library, .notebook], id: \.self) { m in
                                Button { mode = m; iPadShowLanding = false } label: {
                                    VStack(spacing: 12) {
                                        Image(m.iconName)
                                            .resizable().scaledToFit()
                                            .frame(width: 64, height: 64).cornerRadius(14)
                                        VStack(spacing: 4) {
                                            Text(m.heroTitle)
                                                .font(.headline).fontWeight(.bold).foregroundColor(.primary)
                                            Text(m.tagline)
                                                .font(.caption).foregroundColor(.secondary)
                                                .multilineTextAlignment(.center)
                                        }
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(20)
                                    .background(Color(.systemBackground))
                                    .cornerRadius(16)
                                    .overlay(RoundedRectangle(cornerRadius: 16)
                                        .stroke(Color(.systemGray4), lineWidth: 1))
                                    .shadow(color: .black.opacity(0.04), radius: 4, x: 0, y: 2)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 20)
                    }
                }

            } else {
                // ── Mode strip ──
                HStack(spacing: 12) {
                    if sizeClass == .regular {
                        Button { iPadShowLanding = true } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.orange)
                        }
                    }
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

                // ── Mode tabs (iPhone only) ──
                if sizeClass != .regular {
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
                }

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
        }
        .navigationBarHidden(sizeClass != .regular)
        .onAppear {
            mode = startingMode
            if sizeClass == .regular && startingMode == .learn {
                iPadShowLanding = true
            } else {
                iPadShowLanding = false
            }
        }
    }
}
