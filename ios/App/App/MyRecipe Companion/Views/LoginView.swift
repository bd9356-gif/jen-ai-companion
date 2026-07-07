import SwiftUI
import Supabase

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var errorMessage = ""

    @Environment(\.horizontalSizeClass) var sizeClass
    var body: some View {
        ZStack {
            Color.orange.opacity(0.05).ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()
                VStack(spacing: 12) {
                    Text("👩‍🍳").font(.system(size: 80))
                    Text("MyRecipe Companion").font(.title).fontWeight(.bold)
                    Text("Your personal AI cooking assistant")
                        .font(.subheadline).foregroundColor(.gray)
                }

                Spacer()

                VStack(spacing: 12) {
                    if !errorMessage.isEmpty {
                        Text(errorMessage).font(.caption).foregroundColor(.red)
                            .multilineTextAlignment(.center).padding(.horizontal)
                    }

                    Button {
                        Task { await authManager.signInWithApple() }
                    } label: {
                        HStack {
                            Image(systemName: "apple.logo")
                            Text("Sign in with Apple").fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity).frame(height: 54)
                        .background(Color.black).foregroundColor(.white).cornerRadius(14)
                    }
                }
                .padding(.horizontal, 24).padding(.bottom, 40)
                .frame(maxWidth: sizeClass == .regular ? 480 : .infinity)
            }
        }
    }
}
