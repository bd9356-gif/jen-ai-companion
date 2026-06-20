import SwiftUI

struct SplashView: View {
    var body: some View {
        ZStack {
            Color.orange.opacity(0.1)
                .ignoresSafeArea()
            VStack(spacing: 16) {
                Text("👩‍🍳")
                    .font(.system(size: 80))
                Text("MyRecipe Companion")
                    .font(.title2)
                    .fontWeight(.bold)
                ProgressView()
                    .padding(.top, 8)
            }
        }
    }
}
