# Sienna — iOS Photo Uploader

A minimal native SwiftUI iOS app that uploads photos to your Sienna Next.js backend. Warm editorial UI matching the web app's sienna/terracotta palette.

---

## Requirements

- **Mac** with Xcode 15 or later
- **iPhone** running iOS 16 or later
- A running Sienna Next.js backend (e.g. deployed on Vercel)

---

## How to Open

1. Copy the entire `SiennaApp/` folder to your Mac.
2. In Finder, double-click **`Sienna.xcodeproj`** — Xcode will open the project.

---

## Configure Signing (required to run on a real device)

1. In Xcode, click the **Sienna** project in the Navigator (left sidebar).
2. Select the **Sienna** target.
3. Open the **Signing & Capabilities** tab.
4. Under **Team**, choose your personal Apple ID (add one via *Xcode → Settings → Accounts* if needed).
5. Xcode will automatically manage provisioning — no paid developer account required for personal use.

> **Note:** With a free Apple ID the certificate is valid for 7 days. You'll need to re-sign and reinstall after it expires.

---

## Install on Your iPhone

1. Plug your iPhone into the Mac via USB.
2. In Xcode's device toolbar (top-left), select your iPhone as the run destination.
3. Press **⌘R** (or click the ▶ Run button).
4. Xcode will build, sign, and install the app on your iPhone.

---

## Trust the Developer Certificate on Your iPhone

The first time you open an app signed with a personal (free) certificate, iOS will block it. To trust it:

1. On your iPhone, go to **Settings → General → VPN & Device Management**.
2. Under *Developer App*, tap your Apple ID email.
3. Tap **Trust "[Your Apple ID]"** and confirm.
4. Open Sienna again — it will now launch normally.

---

## First Launch

On first open, Sienna shows a setup screen:

| Field | What to enter |
|-------|---------------|
| **URL** | `https://0xsienna.vercel.app` (pre-filled by default) |
| **Password** | The upload password configured in your backend's `UPLOAD_PASSWORD` env var |

Tap **enter** to save and unlock the app. These settings are stored in `UserDefaults` on-device. You can update them anytime via the **⚙ gear icon** in the top-right of the upload screen.

---

## Usage

- **library** — Pick up to 20 photos from your photo library.
- **camera** — Take a new photo with the camera.
- Tap **upload all** to batch-upload all selected photos.
- Each thumbnail gets a ✓ or ✗ overlay after uploading.

Photos are compressed to JPEG at 85% quality and POSTed as `multipart/form-data` to `{BASE_URL}/api/upload` with the `x-upload-password` header.

---

## File Structure

```
SiennaApp/
├── Sienna.xcodeproj/
│   └── project.pbxproj
├── SiennaApp/
│   ├── SiennaApp.swift          # App entry point
│   ├── ContentView.swift        # Auth gate
│   ├── Info.plist               # Permissions + bundle config
│   ├── Views/
│   │   ├── LockView.swift       # URL + password setup screen
│   │   ├── UploadView.swift     # Main upload screen
│   │   ├── CameraView.swift     # UIKit camera wrapper
│   │   └── SettingsView.swift   # Settings sheet
│   ├── Services/
│   │   └── UploadService.swift  # Multipart upload logic
│   └── Extensions/
│       └── Color+Hex.swift      # Hex color initializer
└── README-iOS.md
```
