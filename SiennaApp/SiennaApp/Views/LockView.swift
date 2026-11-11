import SwiftUI

struct LockView: View {
    var onUnlock: () -> Void

    @State private var baseURL: String = UserDefaults.standard.string(forKey: "sienna_base_url") ?? "https://0xsienna.vercel.app"
    @State private var password: String = ""
    @State private var errorMessage: String = ""
    @State private var isAuthenticatingBiometrics: Bool = false

    private var hasCredentials: Bool {
        return UserDefaults.standard.string(forKey: "sienna_password") != nil
    }

    private var biometricName: String {
        BiometricService.shared.biometricName()
    }

    private var biometricIcon: String {
        let name = biometricName
        if name == "Face ID" {
            return "faceid"
        } else if name == "Touch ID" {
            return "touchid"
        } else {
            return "lock.shield"
        }
    }

    var body: some View {
        ZStack {
            Color(hex: "#faf7f4").ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                // Header / Logo
                VStack(spacing: 8) {
                    Text("sienna")
                        .font(.system(size: 36, weight: .light, design: .serif))
                        .italic()
                        .foregroundColor(Color(hex: "#8b7355"))

                    Text("authenticate to access")
                        .font(.caption)
                        .foregroundColor(Color(hex: "#8b7355").opacity(0.8))
                        .tracking(1.5)
                }

                // Biometrics Button (if available & credentials saved)
                if hasCredentials && BiometricService.shared.canUseBiometrics() {
                    Button(action: handleBiometricUnlock) {
                        HStack(spacing: 12) {
                            Image(systemName: biometricIcon)
                                .font(.system(size: 20, weight: .regular))
                            Text("Unlock with \(biometricName)")
                                .font(.system(size: 16, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(hex: "#c17f52"))
                        .cornerRadius(10)
                        .shadow(color: Color(hex: "#c17f52").opacity(0.2), radius: 8, x: 0, y: 4)
                    }
                    .disabled(isAuthenticatingBiometrics)

                    HStack {
                        Rectangle()
                            .fill(Color(hex: "#c8b89a").opacity(0.4))
                            .frame(height: 1)
                        Text("or enter password")
                            .font(.system(size: 12, weight: .light))
                            .foregroundColor(Color(hex: "#8b7355").opacity(0.7))
                            .textCase(.uppercase)
                            .tracking(1)
                        Rectangle()
                            .fill(Color(hex: "#c8b89a").opacity(0.4))
                            .frame(height: 1)
                    }
                    .padding(.vertical, 4)
                }

                // Password Inputs
                VStack(spacing: 14) {
                    if !hasCredentials {
                        TextField("https://0xsienna.vercel.app", text: $baseURL)
                            .textFieldStyle(.plain)
                            .padding()
                            .background(Color.white.opacity(0.7))
                            .cornerRadius(8)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .keyboardType(.URL)
                    }

                    SecureField("upload password", text: $password)
                        .textFieldStyle(.plain)
                        .padding()
                        .background(Color.white.opacity(0.7))
                        .cornerRadius(8)
                }

                if !errorMessage.isEmpty {
                    Text(errorMessage)
                        .foregroundColor(.red.opacity(0.85))
                        .font(.caption)
                }

                // Submit button for password
                Button(action: handlePasswordUnlock) {
                    Text("enter")
                        .font(.system(size: 15, weight: .medium))
                        .tracking(1)
                        .foregroundColor(hasCredentials ? Color(hex: "#8b7355") : .white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(hasCredentials ? Color.white.opacity(0.8) : Color(hex: "#c17f52"))
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(hasCredentials ? Color(hex: "#c8b89a").opacity(0.6) : Color.clear, lineWidth: 1)
                        )
                }

                Spacer()
            }
            .padding(.horizontal, 32)
        }
    }

    private func handleBiometricUnlock() {
        errorMessage = ""
        isAuthenticatingBiometrics = true
        BiometricService.shared.authenticate { success in
            isAuthenticatingBiometrics = false
            if success {
                onUnlock()
            } else {
                errorMessage = "Authentication failed or cancelled"
            }
        }
    }

    private func handlePasswordUnlock() {
        guard !password.isEmpty else {
            errorMessage = "please enter the password"
            return
        }

        if let savedPassword = UserDefaults.standard.string(forKey: "sienna_password") {
            if password == savedPassword {
                onUnlock()
            } else {
                errorMessage = "incorrect password"
            }
            return
        }

        // First-time configuration
        guard !baseURL.isEmpty else {
            errorMessage = "please provide your site URL"
            return
        }

        UserDefaults.standard.set(baseURL.trimmingCharacters(in: .whitespaces), forKey: "sienna_base_url")
        UserDefaults.standard.set(password, forKey: "sienna_password")
        onUnlock()
    }
}
