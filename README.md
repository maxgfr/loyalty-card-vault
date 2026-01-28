# 🎴 Loyalty Card Vault

A secure, offline-first Progressive Web App for managing loyalty cards with barcode scanning capabilities.

## ✨ Features

- 📸 **Barcode Scanning**: Scan loyalty cards using your device's camera (supports QR codes, EAN-13, UPC, CODE-128, and more)
- 🔒 **Security Options**: Choose between simple mode (no encryption) or secure mode (AES-GCM encryption)
- 💾 **Offline First**: Works completely offline after initial load
- 📱 **PWA**: Installable on mobile and desktop devices
- 💾 **Backup & Restore**: Export and import your cards as encrypted or plain JSON
- 🔗 **Share**: Share card links via Web Share API or clipboard
- 🎨 **Modern UI**: Dark mode by default with responsive design
- #️⃣ **Hash Navigation**: Direct links to individual cards

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## 📦 Tech Stack

- **Framework**: React 19 with React Compiler
- **Build Tool**: Vite 7 (rolldown-vite)
- **Language**: TypeScript 5.9
- **Storage**: IndexedDB via `idb`
- **Encryption**: Web Crypto API (AES-GCM + PBKDF2)
- **Scanner**: @zxing/browser
- **Barcode Rendering**: bwip-js
- **Validation**: Zod
- **PWA**: vite-plugin-pwa with Workbox

## 🏗️ Project Structure

```
src/
├── components/
│   ├── cards/          # Card-related components
│   ├── layout/         # Layout components (Header, BottomNav)
│   ├── scanner/        # Barcode scanner
│   ├── settings/       # Settings page
│   ├── setup/          # Initial setup flow
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utilities (crypto, storage, scanner, backup)
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

## 🔐 Security

### Encryption Mode

When encryption is enabled:
- All cards are encrypted using **AES-GCM** (256-bit key)
- Password is derived using **PBKDF2** (100,000 iterations, SHA-256)
- Each encryption uses a unique salt and IV
- ⚠️ **Important**: If you lose your password, your data cannot be recovered

### Simple Mode

When encryption is disabled:
- Cards are stored in IndexedDB without encryption
- Faster performance
- Suitable for non-sensitive data

## 📱 PWA Installation

### Desktop (Chrome/Edge)
1. Click the install icon in the address bar
2. Follow the prompts to install

### iOS Safari
1. Tap the Share button
2. Select "Add to Home Screen"
3. Confirm installation

### Android Chrome
1. Tap the three-dot menu
2. Select "Install app" or "Add to Home Screen"

## 🚀 Deployment

### GitHub Pages

This project is configured for automatic deployment to GitHub Pages via GitHub Actions.

1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: "GitHub Actions"

2. **Push to main branch**:
   ```bash
   git push origin main
   ```

3. **Access your app**:
   - `https://[username].github.io/loyalty-card-vault/`

### Manual Deployment

```bash
# Build
pnpm build

# Deploy the dist/ folder to your hosting provider
```

## 🎯 Supported Barcode Formats

- QR Code
- EAN-13 / EAN-8
- UPC-A / UPC-E
- CODE-128
- CODE-39
- ITF (Interleaved 2 of 5)
- Codabar
- Data Matrix

## 🔧 Configuration

### Base Path

Update `vite.config.ts` to change the base path:

```typescript
export default defineConfig({
  base: '/your-path/',
  // ...
})
```

### PWA Manifest

Edit `vite.config.ts` to customize PWA settings:

```typescript
VitePWA({
  manifest: {
    name: 'Your App Name',
    theme_color: '#yourcolor',
    // ...
  }
})
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🙏 Acknowledgments

- Built with React 19 and the new React Compiler
- Barcode scanning powered by ZXing
- Barcode rendering by bwip-js

---

Made with ❤️ for secure loyalty card management
