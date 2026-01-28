# Loyalty Card Vault 🎴

A secure, offline-first Progressive Web App (PWA) for managing your loyalty cards with barcode scanning and peer-to-peer device synchronization.

## 🌟 Features

### Core Features
- **📱 Barcode Scanning**: Scan loyalty cards using your device camera
- **🔒 Encryption**: Optional AES-256-GCM encryption for sensitive data
- **💾 Offline-First**: Works completely offline with IndexedDB storage
- **📤 Backup & Restore**: Export/import your cards as JSON files
- **🎨 Customization**: Color-code cards and add tags for organization
- **🔍 Smart Detection**: Auto-detect store names and suggest tags

### Device Synchronization (NEW!)
- **🔄 P2P Sync**: Synchronize cards between devices using WebRTC
- **🚫 No Server Required**: 100% peer-to-peer, no data sent to servers
- **🔐 Encrypted Transfer**: Optional session-level encryption
- **📷 QR Code Pairing**: Simple pairing via QR code scanning
- **⚡ Real-time**: Automatic sync once connected
- **🔀 Conflict Resolution**: Last-write-wins strategy

## 🚀 Live Demo

Visit the live app: **[Loyalty Card Vault](https://YOUR-USERNAME.github.io/loyalty-card-vault/)**

> Replace `YOUR-USERNAME` with your GitHub username

## 📦 Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite (Rolldown)  
- **Styling**: CSS with CSS Variables
- **Storage**: IndexedDB (via idb)
- **Encryption**: Web Crypto API
- **Barcode**: ZXing library
- **PWA**: Vite PWA plugin with Workbox
- **Validation**: Zod
- **P2P**: WebRTC with manual signaling
- **Testing**: Vitest (120+ tests)

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/loyalty-card-vault.git
cd loyalty-card-vault

# Install dependencies
pnpm install

# Start development server
pnpm dev
\`\`\`

### Available Scripts

\`\`\`bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm test         # Run unit tests
pnpm lint         # Lint code
\`\`\`

## 🔄 How to Sync Between Devices

1. **On Host Device**:
   - Go to Settings → Sync Devices
   - Choose "Host Session"
   - Display the QR code

2. **On Guest Device**:
   - Go to Settings → Sync Devices
   - Choose "Join Session"
   - Scan the host's QR code
   - Show your answer QR code

3. **Complete Pairing**:
   - Host scans the guest's answer QR code
   - Sync happens automatically!

## 🚀 Deployment to GitHub Pages

### Option 1: Automatic with GitHub Actions (Recommended)

1. Create `.github/workflows/deploy.yml`:

\`\`\`yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - uses: actions/deploy-pages@v4
\`\`\`

2. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Source: "GitHub Actions"
   - Save

3. Push to main branch - deployment happens automatically!

### Option 2: Manual Deployment

\`\`\`bash
# Build the project
pnpm build

# Deploy dist/ folder to your hosting provider
\`\`\`

## 📱 Install as PWA

### iOS (Safari)
1. Open app in Safari
2. Tap Share button
3. "Add to Home Screen"

### Android (Chrome)
1. Open app in Chrome
2. Tap menu (⋮)
3. "Add to Home screen"

### Desktop
1. Click install icon in address bar
2. Click "Install"

## 🧪 Testing

\`\`\`bash
# Run all tests (120+ tests)
pnpm test

# Run with UI
pnpm test:ui

# Coverage
pnpm test:coverage
\`\`\`

## 🏗️ Project Structure

\`\`\`
src/
├── components/           # React components
│   ├── sync/            # P2P sync UI (NEW!)
│   ├── cards/           # Card components
│   ├── scanner/         # Barcode scanner
│   └── ui/              # Reusable UI
├── hooks/               # Custom hooks
│   └── useSyncSession.ts # Sync hook (NEW!)
├── lib/
│   ├── sync/           # P2P sync logic (NEW!)
│   ├── crypto.ts       # Encryption
│   └── storage.ts      # IndexedDB
└── types/              # TypeScript types
\`\`\`

## 🔒 Security & Privacy

- ✅ **Local-First**: Data stays on your device
- ✅ **End-to-End**: P2P sync, no server access
- ✅ **Encryption**: AES-256-GCM when enabled
- ✅ **No Tracking**: Zero analytics or telemetry
- ✅ **Open Source**: Audit the code yourself

## 📝 License

MIT License - Free to use, modify, and distribute!

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

**Built with** ❤️ **using React, TypeScript, and WebRTC**
