import SwiftUI
import Supabase

struct ImportView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.horizontalSizeClass) var sizeClass
    @EnvironmentObject var authManager: AuthManager
    @State private var importUrl = ""
    @State private var importText = ""
    @State private var importHtml = ""
    @State private var selectedTab = 0
    @State private var isImporting = false
    @State private var statusMessage = ""
    @State private var errorMessage = ""
    @State private var showSuccess = false
    @State private var showPaywall = false
    @State private var monthlyImports = 0
    @State private var totalRecipes = 0

    var body: some View {
        VStack(spacing: 0) {
            // ── Banner ──
            Image("bring-in-hero")
                .resizable().scaledToFit()
                .frame(maxWidth: .infinity, maxHeight: 100)

            Picker("Import Type", selection: $selectedTab) {
                Text("URL").tag(0)
                Text("Paste Text").tag(1)
                Text("Paste HTML").tag(2)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)

            // Free tier limit banner
            if authManager.subscriptionTier == .free {
                let importsRemaining = max(0, 3 - monthlyImports)
                let atLimit = importsRemaining == 0
                HStack(spacing: 8) {
                    Image(systemName: atLimit ? "lock.fill" : "info.circle")
                        .foregroundColor(atLimit ? .red : .orange).font(.caption)
                    Text(atLimit
                         ? "Monthly import limit reached — upgrade for more"
                         : "\(importsRemaining) free import\(importsRemaining == 1 ? "" : "s") left this month")
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

            ScrollView {
                VStack(spacing: 20) {
                    if selectedTab == 0 {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Recipe URL")
                                .font(.subheadline).fontWeight(.semibold).foregroundColor(.gray)
                            TextField("https://...", text: $importUrl)
                                .textFieldStyle(.roundedBorder)
                                .keyboardType(.URL)
                                .autocapitalization(.none)
                                .autocorrectionDisabled()
                                .submitLabel(.done)
                                .onSubmit {
                                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                                }
                        }
                        .padding(.horizontal)
                    } else if selectedTab == 1 {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Paste Recipe Text")
                                .font(.subheadline).fontWeight(.semibold).foregroundColor(.gray)
                            TextEditor(text: $importText)
                                .frame(minHeight: 200).padding(8)
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.gray.opacity(0.3)))
                        }
                        .padding(.horizontal)
                    } else {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Paste HTML Source")
                                .font(.subheadline).fontWeight(.semibold).foregroundColor(.gray)
                            Text("In Safari, tap Share → Copy → paste the page source here.")
                                .font(.caption).foregroundColor(.gray)
                            Button {
                                if let string = UIPasteboard.general.string {
                                    importHtml = string
                                }
                            } label: {
                                HStack {
                                    Image(systemName: "doc.on.clipboard")
                                    Text(importHtml.isEmpty ? "Paste from Clipboard" : "Replace with Clipboard")
                                }
                                .frame(maxWidth: .infinity).padding(.vertical, 10)
                                .background(Color(.systemGray5)).foregroundColor(.primary).cornerRadius(10)
                            }
                            if !importHtml.isEmpty {
                                HStack {
                                    Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                                    Text("\(importHtml.count) characters pasted")
                                        .font(.caption).foregroundColor(.gray)
                                    Spacer()
                                    Button("Clear") { importHtml = "" }
                                        .font(.caption).foregroundColor(.red)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    if !statusMessage.isEmpty {
                        Text(statusMessage).font(.subheadline).foregroundColor(.orange)
                            .multilineTextAlignment(.center).padding(.horizontal)
                    }
                    if !errorMessage.isEmpty {
                        Text(errorMessage).font(.subheadline).foregroundColor(.red)
                            .multilineTextAlignment(.center).padding(.horizontal)
                    }
                    if showSuccess {
                        VStack(spacing: 8) {
                            Text("✅ Recipe imported!").font(.headline).foregroundColor(.green)
                            Text("Check your Recipe Vault").font(.subheadline).foregroundColor(.gray)
                        }
                    }

                    Button {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                        Task { await handleImport() }
                    } label: {
                        HStack {
                            if isImporting {
                                ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white)).scaleEffect(0.8)
                            } else {
                                Image(systemName: "square.and.arrow.down")
                            }
                            Text(isImporting ? "Importing..." : "Import Recipe").fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity).frame(height: 56)
                        .background(canImport ? Color.orange : Color.gray.opacity(0.3))
                        .foregroundColor(.white).cornerRadius(14)
                    }
                    .disabled(!canImport || isImporting)
                    .padding(.horizontal)
                }
                .padding(.top)
            }
            // Dismiss keyboard on tap outside
            .onTapGesture {
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            }
        }
        .onAppear {
            checkPendingImport()
            Task { await loadRecipeCount() }
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView().environmentObject(authManager).environmentObject(authManager)
        }
        .onChange(of: authManager.pendingImportURL) { _, url in
            if let url = url {
                importUrl = url
                selectedTab = 0
                authManager.pendingImportURL = nil
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
            checkPendingImport()
        }
        .frame(maxWidth: sizeClass == .regular ? 700 : .infinity)
        .frame(maxWidth: .infinity)
    }

    func checkPendingImport() {
        let defaults = UserDefaults(suiteName: "group.com.mycompanionapps.recipe")
        if let url = defaults?.string(forKey: "pendingImportURL") {
            importUrl = url
            selectedTab = 0
            defaults?.removeObject(forKey: "pendingImportURL")
            defaults?.synchronize()
        }
        if let url = authManager.pendingImportURL {
            importUrl = url
            selectedTab = 0
            authManager.pendingImportURL = nil
        }
    }

    var canImport: Bool {
        switch selectedTab {
        case 0: return !importUrl.trimmingCharacters(in: .whitespaces).isEmpty
        case 1: return !importText.trimmingCharacters(in: .whitespaces).isEmpty
        case 2: return !importHtml.trimmingCharacters(in: .whitespaces).isEmpty
        default: return false
        }
    }

    func fetchHTML(_ urlString: String) async -> String? {
        guard let url = URL(string: urlString) else { return nil }
        var request = URLRequest(url: url, timeoutInterval: 10)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", forHTTPHeaderField: "Accept")
        request.setValue("en-US,en;q=0.9", forHTTPHeaderField: "Accept-Language")
        request.setValue("gzip, deflate, br", forHTTPHeaderField: "Accept-Encoding")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return nil }
            return String(data: data, encoding: .utf8) ?? String(data: data, encoding: .isoLatin1)
        } catch {
            return nil
        }
    }

    func loadRecipeCount() async {
        guard let user = authManager.user else { return }
        let month = monthKeyString()
        let counts: [[String: Int]] = (try? await supabase.from("user_usage")
            .select("import_count").eq("user_id", value: user.id).eq("month", value: month)
            .execute().value) ?? []
        await MainActor.run { monthlyImports = counts.first?["import_count"] ?? 0 }
    }

    func handleImport() async {
        guard let user = authManager.user else { return }

        // Check free tier monthly import limit
        if authManager.subscriptionTier == .free && monthlyImports >= 3 {
            await MainActor.run { showPaywall = true }
            return
        }

        isImporting = true
        errorMessage = ""
        showSuccess = false
        statusMessage = "Extracting recipe..."

        do {
            let defaults = UserDefaults(suiteName: "group.com.mycompanionapps.recipe")
            let extensionHtml = defaults?.string(forKey: "pendingImportHTML")
            defaults?.removeObject(forKey: "pendingImportHTML")
            defaults?.synchronize()

            var payload: [String: String] = [:]
            switch selectedTab {
            case 0:
                let urlString = importUrl.trimmingCharacters(in: .whitespaces)
                payload["url"] = urlString
                statusMessage = "Fetching page content..."
                if let fetchedHtml = await fetchHTML(urlString) {
                    payload["html"] = fetchedHtml
                } else if let html = extensionHtml {
                    payload["html"] = html
                }
            case 1:
                payload["text"] = importText.trimmingCharacters(in: .whitespaces)
            case 2:
                payload["html"] = importHtml.trimmingCharacters(in: .whitespaces)
            default: break
            }

            guard let apiUrl = URL(string: "https://recipe.mycompanionapps.com/api/import-recipe") else { return }
            var request = URLRequest(url: apiUrl)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)

            statusMessage = "Chef Jen is reading the recipe..."
            let (data, _) = try await URLSession.shared.data(for: request)

            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let title = json["title"] as? String else {
                errorMessage = "Could not extract recipe. Try pasting the text instead."
                isImporting = false
                statusMessage = ""
                return
            }

            statusMessage = "Saving to your vault..."

            // Explicitly refresh the session before writing to the database.
            // The Supabase token can appear valid on authManager's side while
            // quietly expired underneath — the RLS policy then sees no auth
            // and blocks the insert. A refresh here forces a live, valid token
            // before we ever touch personal_recipes.
            _ = try? await supabase.auth.refreshSession()

            var ingredientsArray: [[String: String]] = []
            if let ingredients = json["ingredients"] as? [[String: Any]] {
                ingredientsArray = ingredients.compactMap { ing in
                    guard let name = ing["name"] as? String else { return nil }
                    return ["name": name, "amount": ing["measure"] as? String ?? ""]
                }
            }

            // Extract tags from API response
            let tagsArray: [AnyJSON] = (json["tags"] as? [String] ?? []).map { .string($0) }

            var insertData: [String: AnyJSON] = [
                "user_id": .string(user.id.uuidString),
                "title": .string(title),
                "description": .string(json["description"] as? String ?? ""),
                "instructions": .string(json["instructions"] as? String ?? ""),
                "family_notes": .string(json["source_url"] as? String ?? ""),
                "photo_url": .string(json["image"] as? String ?? ""),
                "ingredients": .array(ingredientsArray.map { dict in
                    .object(dict.mapValues { .string($0) })
                })
            ]
            if !tagsArray.isEmpty { insertData["tags"] = .array(tagsArray) }

            try await supabase.from("personal_recipes").insert(insertData).execute()
            try await supabase.rpc("increment_import_count", params: [
                "p_user_id": user.id.uuidString,
                "p_month": monthKeyString()
            ]).execute()

            showSuccess = true
            statusMessage = ""
            importUrl = ""
            importText = ""
            importHtml = ""
            monthlyImports += 1

        } catch {
            errorMessage = "Import failed: \(error.localizedDescription)"
            statusMessage = ""
        }
        isImporting = false
    }

    func monthKeyString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: Date())
    }
}
