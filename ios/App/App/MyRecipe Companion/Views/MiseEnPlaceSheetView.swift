import SwiftUI

struct MiseEnPlaceSheetView: View {
    let recipes: [Recipe]  // ordered by selection
    @Environment(\.dismiss) var dismiss
    @State private var checked: Set<String> = []

    // For single recipe backwards compat
    init(recipe: Recipe) {
        self.recipes = [recipe]
    }

    init(recipes: [Recipe]) {
        self.recipes = recipes
    }

    var allIngredients: [(recipeIndex: Int, recipeTitle: String, index: Int, ingredient: Ingredient)] {
        var result: [(recipeIndex: Int, recipeTitle: String, index: Int, ingredient: Ingredient)] = []
        for (ri, recipe) in recipes.enumerated() {
            for (ii, ingredient) in (recipe.ingredients ?? []).enumerated() {
                result.append((recipeIndex: ri, recipeTitle: recipe.title, index: ii, ingredient: ingredient))
            }
        }
        return result
    }

    var totalCount: Int { allIngredients.count }
    var checkedCount: Int { checked.count }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {

                // Progress bar
                if totalCount > 0 {
                    VStack(spacing: 4) {
                        ProgressView(value: Double(checkedCount) / Double(totalCount))
                            .tint(.orange).padding(.horizontal, 20)
                        Text("\(checkedCount) of \(totalCount) prepped")
                            .font(.caption2).foregroundColor(.gray)
                    }
                    .padding(.vertical, 8)
                    Divider()
                }

                ScrollView {
                    VStack(spacing: 0) {
                        ForEach(Array(recipes.enumerated()), id: \.offset) { recipeIndex, recipe in
                            let ingredients = recipe.ingredients ?? []
                            if !ingredients.isEmpty {

                                // Meal section header
                                HStack {
                                    ZStack {
                                        Circle().fill(Color.orange).frame(width: 24, height: 24)
                                        Text("\(recipeIndex + 1)")
                                            .font(.caption).fontWeight(.bold).foregroundColor(.white)
                                    }
                                    Text(recipe.title)
                                        .font(.subheadline).fontWeight(.semibold)
                                    Spacer()
                                    let recipeChecked = ingredients.indices.filter {
                                        checked.contains("\(recipeIndex)-\($0)")
                                    }.count
                                    Text("\(recipeChecked)/\(ingredients.count)")
                                        .font(.caption2).foregroundColor(.gray)
                                }
                                .padding(.horizontal, 20).padding(.vertical, 10)
                                .background(Color.orange.opacity(0.06))

                                // Ingredients
                                ForEach(Array(ingredients.enumerated()), id: \.offset) { index, ingredient in
                                    let key = "\(recipeIndex)-\(index)"
                                    let isDone = checked.contains(key)
                                    Button {
                                        withAnimation(.easeInOut(duration: 0.15)) {
                                            if isDone { checked.remove(key) }
                                            else { checked.insert(key) }
                                        }
                                    } label: {
                                        HStack(spacing: 14) {
                                            ZStack {
                                                Circle()
                                                    .stroke(isDone ? Color.orange : Color(.systemGray3), lineWidth: 2)
                                                    .frame(width: 26, height: 26)
                                                if isDone {
                                                    Circle().fill(Color.orange).frame(width: 26, height: 26)
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 12, weight: .bold))
                                                        .foregroundColor(.white)
                                                }
                                            }
                                            VStack(alignment: .leading, spacing: 2) {
                                                if let name = ingredient.name, !name.isEmpty {
                                                    Text(name)
                                                        .font(.subheadline).fontWeight(.medium)
                                                        .strikethrough(isDone)
                                                        .foregroundColor(isDone ? .gray : .primary)
                                                }
                                                if let qty = ingredient.amount ?? ingredient.measure, !qty.isEmpty {
                                                    Text(qty).font(.footnote)
                                                        .foregroundColor(isDone ? .gray.opacity(0.6) : .orange)
                                                }
                                            }
                                            Spacer()
                                            if isDone {
                                                Text("Ready ✓")
                                                    .font(.caption2).fontWeight(.semibold)
                                                    .foregroundColor(.orange)
                                                    .padding(.horizontal, 8).padding(.vertical, 3)
                                                    .background(Color.orange.opacity(0.1))
                                                    .cornerRadius(6)
                                            }
                                        }
                                        .padding(.horizontal, 20).padding(.vertical, 12)
                                        .background(isDone ? Color.orange.opacity(0.03) : Color(.systemBackground))
                                    }
                                    .buttonStyle(.plain)
                                    Divider().padding(.leading, 60)
                                }
                            }
                        }
                    }
                }

                // Bottom bar
                VStack(spacing: 0) {
                    Divider()
                    HStack(spacing: 12) {
                        Button { withAnimation { checked = [] } } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "arrow.counterclockwise")
                                Text("Reset")
                            }
                            .font(.footnote).fontWeight(.medium).foregroundColor(.gray)
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .background(Color(.systemGray6)).cornerRadius(10)
                        }
                        Button { printMiseEnPlace() } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "printer")
                                Text("Print")
                            }
                            .font(.footnote).fontWeight(.semibold).foregroundColor(.white)
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .background(Color.orange).cornerRadius(10)
                        }
                    }
                    .padding(.horizontal, 20).padding(.vertical, 12)
                }
                .background(Color(.systemBackground))
            }
            .navigationTitle("Mise en Place")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) { Button("Done") { dismiss() } }
            }
        }
    }

    func printMiseEnPlace() {
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: 612, height: 792))
        let data = renderer.pdfData { ctx in
            ctx.beginPage()
            let orange = UIColor(red: 0.93, green: 0.35, blue: 0.12, alpha: 1)
            let titleAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.boldSystemFont(ofSize: 22), .foregroundColor: orange]
            let sectionAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.boldSystemFont(ofSize: 14), .foregroundColor: orange]
            let itemAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 13), .foregroundColor: UIColor.black]
            let qtyAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.boldSystemFont(ofSize: 13), .foregroundColor: orange]

            var y: CGFloat = 40
            "Mise en Place".draw(at: CGPoint(x: 40, y: y), withAttributes: titleAttrs); y += 36

            for (ri, recipe) in recipes.enumerated() {
                let ingredients = recipe.ingredients ?? []
                guard !ingredients.isEmpty else { continue }

                // Section header
                let dividerPath = UIBezierPath()
                dividerPath.move(to: CGPoint(x: 40, y: y))
                dividerPath.addLine(to: CGPoint(x: 572, y: y))
                UIColor.lightGray.setStroke(); dividerPath.stroke(); y += 12

                "\(ri + 1). \(recipe.title)".draw(at: CGPoint(x: 40, y: y), withAttributes: sectionAttrs); y += 22

                for ingredient in ingredients {
                    if y > 740 { ctx.beginPage(); y = 40 }
                    let box = CGRect(x: 40, y: y + 2, width: 12, height: 12)
                    UIColor.lightGray.setStroke(); UIBezierPath(rect: box).stroke()
                    let qty = ingredient.amount ?? ingredient.measure ?? ""
                    if !qty.isEmpty { qty.draw(at: CGPoint(x: 62, y: y), withAttributes: qtyAttrs) }
                    let name = ingredient.name ?? ""
                    let nameX: CGFloat = qty.isEmpty ? 62 : 62 + (qty as NSString).size(withAttributes: qtyAttrs).width + 6
                    name.draw(at: CGPoint(x: nameX, y: y), withAttributes: itemAttrs)
                    y += 22
                }
                y += 8
            }
        }
        let av = UIActivityViewController(activityItems: [data], applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            var topVC = window.rootViewController
            while let presented = topVC?.presentedViewController { topVC = presented }
            av.popoverPresentationController?.sourceView = window
            av.popoverPresentationController?.sourceRect = CGRect(x: window.bounds.midX, y: window.bounds.midY, width: 0, height: 0)
            topVC?.present(av, animated: true)
        }
    }
}
