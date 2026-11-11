import SwiftUI

struct ContentView: View {
    @State private var isUnlocked: Bool = UserDefaults.standard.string(forKey: "sienna_password") != nil

    var body: some View {
        if isUnlocked {
            UploadView()
        } else {
            LockView(onUnlock: { isUnlocked = true })
        }
    }
}
