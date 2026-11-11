import SwiftUI
import PhotosUI

struct MediaItem: Identifiable {
    let id = UUID()
    let image: UIImage
    let rawData: Data?
    let isHEIC: Bool
}

struct UploadView: View {
    var onLock: (() -> Void)? = nil
    @StateObject private var uploadService = UploadService()
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var selectedMedia: [MediaItem] = []
    @State private var showingCamera = false
    @State private var cameraImage: UIImage?
    @State private var isUploading = false
    @State private var uploadResults: [UploadResult] = []
    @State private var showSettings = false

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "#faf7f4").ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Action buttons
                        HStack(spacing: 12) {
                            // Photo library picker
                            PhotosPicker(
                                selection: $selectedItems,
                                maxSelectionCount: 20,
                                matching: .images
                            ) {
                                ActionButton(icon: "photo.on.rectangle", label: "library")
                            }
                            .onChange(of: selectedItems) { items in
                                loadImages(from: items)
                            }

                            // Camera button
                            Button(action: { showingCamera = true }) {
                                ActionButton(icon: "camera", label: "camera")
                            }
                        }
                        .padding(.horizontal)

                        // Selected images preview grid
                        if !selectedMedia.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("\(selectedMedia.count) photo\(selectedMedia.count == 1 ? "" : "s") selected")
                                        .font(.caption)
                                        .foregroundColor(Color(hex: "#8b7355"))
                                    Spacer()
                                    Button("clear") {
                                        selectedMedia = []
                                        selectedItems = []
                                        uploadResults = []
                                    }
                                    .font(.caption)
                                    .foregroundColor(Color(hex: "#c17f52"))
                                }
                                .padding(.horizontal)

                                LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 4) {
                                    ForEach(Array(selectedMedia.enumerated()), id: \.element.id) { index, item in
                                        ZStack(alignment: .topTrailing) {
                                            Image(uiImage: item.image)
                                                .resizable()
                                                .aspectRatio(contentMode: .fill)
                                                .frame(width: 100, height: 100)
                                                .clipped()
                                                .cornerRadius(4)

                                            // Status overlay
                                            if !uploadResults.isEmpty && index < uploadResults.count {
                                                let result = uploadResults[index]
                                                Image(systemName: result.success ? "checkmark.circle.fill" : "xmark.circle.fill")
                                                    .foregroundColor(result.success ? .green : .red)
                                                    .background(Color.white.clipShape(Circle()))
                                                    .padding(4)
                                            } else if item.isHEIC {
                                                // HEIC Badge
                                                Text("HEIC")
                                                    .font(.system(size: 8, weight: .bold))
                                                    .foregroundColor(.white)
                                                    .padding(.horizontal, 4)
                                                    .padding(.vertical, 2)
                                                    .background(Color.black.opacity(0.6))
                                                    .cornerRadius(3)
                                                    .padding(4)
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }

                            // Upload button
                            Button(action: uploadAll) {
                                HStack {
                                    if isUploading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                            .scaleEffect(0.8)
                                    }
                                    Text(isUploading ? "uploading..." : "upload all")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(.white)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(isUploading ? Color(hex: "#c17f52").opacity(0.6) : Color(hex: "#c17f52"))
                                .cornerRadius(8)
                            }
                            .disabled(isUploading)
                            .padding(.horizontal)
                        }

                        // Upload progress
                        if isUploading && uploadService.progress > 0 {
                            VStack(spacing: 8) {
                                ProgressView(value: uploadService.progress)
                                    .tint(Color(hex: "#c17f52"))
                                Text("\(Int(uploadService.progress * 100))%")
                                    .font(.caption)
                                    .foregroundColor(Color(hex: "#8b7355"))
                            }
                            .padding(.horizontal)
                        }

                        // Success/error messages
                        if !uploadResults.isEmpty && !isUploading {
                            let successCount = uploadResults.filter { $0.success }.count
                            let total = uploadResults.count
                            Text("\(successCount)/\(total) uploaded successfully")
                                .font(.caption)
                                .foregroundColor(successCount == total ? Color(hex: "#8b7355") : .red)
                        }

                        Spacer(minLength: 40)
                    }
                    .padding(.top, 16)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if let onLock = onLock {
                        Button(action: onLock) {
                            Image(systemName: "lock")
                                .foregroundColor(Color(hex: "#8b7355"))
                        }
                    }
                }
                ToolbarItem(placement: .principal) {
                    Text("sienna")
                        .font(.system(size: 20, weight: .light, design: .serif))
                        .italic()
                        .foregroundColor(Color(hex: "#8b7355"))
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showSettings = true }) {
                        Image(systemName: "gearshape")
                            .foregroundColor(Color(hex: "#8b7355"))
                    }
                }
            }
            .sheet(isPresented: $showingCamera) {
                CameraView(image: $cameraImage, isPresented: $showingCamera)
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .onChange(of: cameraImage) { image in
                if let image = image {
                    selectedMedia.append(MediaItem(image: image, rawData: nil, isHEIC: false))
                    cameraImage = nil
                }
            }
        }
    }

    func isHEICData(_ data: Data) -> Bool {
        guard data.count >= 12 else { return false }
        let subdata = data.subdata(in: 4..<12)
        guard let string = String(data: subdata, encoding: .ascii) else { return false }
        return string.contains("heic") || string.contains("mif1") || string.contains("msf1") || string.contains("heix")
    }

    func loadImages(from items: [PhotosPickerItem]) {
        selectedMedia = []
        uploadResults = []
        Task {
            for item in items {
                if let data = try? await item.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    let isHEIC = isHEICData(data)
                    await MainActor.run {
                        selectedMedia.append(MediaItem(image: image, rawData: data, isHEIC: isHEIC))
                    }
                }
            }
        }
    }

    func uploadAll() {
        guard !selectedMedia.isEmpty else { return }
        isUploading = true
        uploadResults = []

        Task {
            var results: [UploadResult] = []
            let total = selectedMedia.count

            for (index, item) in selectedMedia.enumerated() {
                let result: UploadResult
                if let rawData = item.rawData, item.isHEIC {
                    result = await uploadService.upload(data: rawData, isHEIC: true)
                } else {
                    result = await uploadService.upload(image: item.image)
                }
                results.append(result)
                await MainActor.run {
                    uploadService.progress = Double(index + 1) / Double(total)
                    uploadResults = results
                }
            }

            await MainActor.run {
                isUploading = false
            }
        }
    }
}

struct ActionButton: View {
    let icon: String
    let label: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 24))
            Text(label)
                .font(.caption)
        }
        .foregroundColor(Color(hex: "#8b7355"))
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color.white.opacity(0.6))
        .cornerRadius(12)
    }
}
