import SwiftUI

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var isUnlocked: Bool = false
    @State private var hasAttemptedInitialAuth: Bool = false

    var body: some View {
        Group {
            if isUnlocked {
                UploadView(onLock: {
                    isUnlocked = false
                })
            } else {
                LockView(onUnlock: {
                    isUnlocked = true
                })
            }
        }
        .onChange(of: scenePhase) { newPhase in
            switch newPhase {
            case .active:
                // Auto-prompt Face ID if credentials are set and we're currently locked
                if !isUnlocked && hasSavedCredentials() && BiometricService.shared.canUseBiometrics() {
                    promptBiometrics()
                }
            case .inactive, .background:
                // Always lock when leaving the app so user must authenticate each time
                isUnlocked = false
            @unknown default:
                break
            }
        }
        .onAppear {
            if !hasAttemptedInitialAuth && !isUnlocked {
                hasAttemptedInitialAuth = true
                if hasSavedCredentials() && BiometricService.shared.canUseBiometrics() {
                    promptBiometrics()
                }
            }
        }
    }

    private func hasSavedCredentials() -> Bool {
        return UserDefaults.standard.string(forKey: "sienna_password") != nil
    }

    private func promptBiometrics() {
        BiometricService.shared.authenticate { success in
            if success {
                isUnlocked = true
            }
        }
    }
}
