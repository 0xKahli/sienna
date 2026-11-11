# Sienna 🌾

> Personal image archive & photo sharing website with a companion native iOS uploader. Warm, editorial aesthetic.

- **Live Gallery**: [https://0xsienna.vercel.app](https://0xsienna.vercel.app)
- **Web Upload**: [https://0xsienna.vercel.app/0x](https://0xsienna.vercel.app/0x)

---

## Architecture

```
sienna/
├── web/                  # Next.js 14 web app & API backend
│   ├── app/              # App router (Gallery, Upload page, APIs)
│   ├── components/       # Gallery, Upload dropzone
│   ├── lib/              # Supabase clients & types
│   └── supabase/         # PostgreSQL schema & policies
│
└── SiennaApp/            # Native SwiftUI iOS app
    ├── Sienna.xcodeproj/ # Xcode project (open on Mac)
    └── SiennaApp/        # SwiftUI views, camera & photo picker, upload service
```

---

## Tech Stack

- **Web**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Sharp, Heic-Convert
- **Hosting**: Vercel
- **Database & Storage**: Supabase (PostgreSQL + S3-compatible Edge Storage)
- **iOS App**: Swift 5.9, SwiftUI, PhotosUI, AVFoundation (Camera)

---

## iOS App Installation (Mac)

1. Clone this repository on your Mac:
   ```bash
   git clone https://github.com/0xKahli/sienna.git
   ```
2. Open `SiennaApp/Sienna.xcodeproj` in Xcode 15+.
3. In **Signing & Capabilities**, choose your Apple ID development team.
4. Connect your iPhone via USB / Wi-Fi, select it as the build target.
5. Hit **▶ Run**.
6. On first launch on iPhone, enter your upload password to link with the live gallery.
