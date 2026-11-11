import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    @State private var baseURL: String = UserDefaults.standard.string(forKey: "sienna_base_url") ?? ""
    @State private var password: String = UserDefaults.standard.string(forKey: "sienna_password") ?? ""

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "#faf7f4").ignoresSafeArea()

                Form {
                    Section("connection") {
                        TextField("https://your-site.vercel.app", text: $baseURL)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .keyboardType(.URL)

                        SecureField("upload password", text: $password)
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("save") {
                        UserDefaults.standard.set(baseURL.trimmingCharacters(in: .whitespaces), forKey: "sienna_base_url")
                        UserDefaults.standard.set(password, forKey: "sienna_password")
                        dismiss()
                    }
                    .foregroundColor(Color(hex: "#c17f52"))
                }
            }
        }
    }
}
