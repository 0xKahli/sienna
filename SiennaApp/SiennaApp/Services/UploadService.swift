import Foundation
import UIKit

struct UploadResult {
    let success: Bool
    let error: String?
}

@MainActor
class UploadService: ObservableObject {
    @Published var progress: Double = 0

    func upload(image: UIImage) async -> UploadResult {
        guard let baseURL = UserDefaults.standard.string(forKey: "sienna_base_url"),
              let password = UserDefaults.standard.string(forKey: "sienna_password"),
              let url = URL(string: "\(baseURL)/api/upload") else {
            return UploadResult(success: false, error: "Missing configuration")
        }

        // Compress image to JPEG at 95% high fidelity
        guard let imageData = image.jpegData(compressionQuality: 0.95) else {
            return UploadResult(success: false, error: "Failed to encode image")
        }

        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue(password, forHTTPHeaderField: "x-upload-password")

        let filename = "\(Int(Date().timeIntervalSince1970)).jpg"

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                return UploadResult(success: true, error: nil)
            } else {
                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
                return UploadResult(success: false, error: "Server error (HTTP \(statusCode))")
            }
        } catch {
            return UploadResult(success: false, error: error.localizedDescription)
        }
    }
}
