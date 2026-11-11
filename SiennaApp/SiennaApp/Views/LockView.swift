import SwiftUI

struct LockView: View {
    var onUnlock: () -> Void

    @State private var baseURL: String = "https://sienna-gallery.vercel.app"
    @State private var password: String = ""
    @State private var errorMessage: String = ""

    var body: some View {
        ZStack {
            Color(hex: "#faf7f4").ignoresSafeArea()

            VStack(spacing: 32) {
                Text("sienna")
                    .font(.system(size: 28, weight: .light, design: .serif))
                    .italic()
                    .foregroundColor(Color(hex: "#8b7355"))

                VStack(spacing: 16) {
                    TextField("https://your-site.vercel.app", text: $baseURL)
                        .textFieldStyle(.plain)
                        .padding()
                        .background(Color.white.opacity(0.6))
                        .cornerRadius(8)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .keyboardType(.URL)

                    SecureField("upload password", text: $password)
                        .textFieldStyle(.plain)
                        .padding()
                        .background(Color.white.opacity(0.6))
                        .cornerRadius(8)
                }

                if !errorMessage.isEmpty {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                }

                Button(action: handleUnlock) {
                    Text("enter")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(hex: "#c17f52"))
                        .cornerRadius(8)
                }
            }
            .padding(32)
        }
    }

    func handleUnlock() {
        guard !baseURL.isEmpty, !password.isEmpty else {
            errorMessage = "please fill in both fields"
            return
        }
        UserDefaults.standard.set(baseURL.trimmingCharacters(in: .whitespaces), forKey: "sienna_base_url")
        UserDefaults.standard.set(password, forKey: "sienna_password")
        onUnlock()
    }
}
