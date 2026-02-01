# 🎫 Loyalty Card Vault

A secure Progressive Web App (PWA) for managing loyalty cards with barcode scanning and peer-to-peer device synchronization.

![PWA](https://img.shields.io/badge/PWA-Ready-brightgreen)
![React 19](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tests](https://img.shields.io/badge/Tests-132%20passing-success)

## ✨ Features

### 🔐 Security First
- **AES-256 Encryption**: All cards encrypted by default
- **Password Protection**: Mandatory password setup on first launch
- **No Cloud Storage**: Everything stored locally in IndexedDB
- **Lock/Unlock Vault**: Password never persisted, only in memory

### 📱 Card Management
- **Barcode Scanning**: Camera-based scanning with ZXing (QR, EAN-13, UPC-A, CODE-128, etc.)
- **Smart Detection**: Auto-detects store names from barcode data
- **Visual Cards**: Beautiful card UI with customizable colors
- **Tags & Search**: Organize with tags and search by name/store
- **Flip Cards**: Front shows card info, back shows barcode

### 🔄 Sync & Backup
- **P2P Device Sync**: WebRTC-based sync (no server required)
- **QR Code Pairing**: Simple device-to-device pairing via QR codes
- **Backup/Restore**: Export/import encrypted JSON backups
- **Conflict Resolution**: Last-write-wins based on timestamps

### 📤 Sharing
- **Share Links**: Share card URLs via Web Share API
- **Export as Image**: Save card as PNG image
- **Clipboard Fallback**: Automatic fallback for unsupported browsers

## 🚀 Tech Stack

- **React 19** - UI framework with React Compiler
- **TypeScript** - Type safety
- **Vite (Rolldown)** - Lightning-fast build tool
- **IndexedDB** - Local encrypted storage
- **ZXing** - Barcode scanning
- **WebRTC** - P2P synchronization
- **Vitest** - Unit testing (132 tests)
- **PWA** - Installable with offline support

## 📦 Installation

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

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint
```

**Test Coverage**: 132 tests passing
- Unit tests for hooks (useCards, useShare)
- Component tests (CardList, CardItem)
- Library tests (crypto, validation, backup, sync)

## 📱 PWA Installation

The app can be installed on mobile devices and desktop:

1. Open the app in a browser
2. Look for "Install" or "Add to Home Screen" prompt
3. Follow browser-specific installation steps

## 🔒 Security Features

### Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations)
- **Password Requirements**: Minimum 8 characters with letter + number
- **Storage**: Encrypted data in IndexedDB, password in memory only

### Privacy
- ✅ No telemetry or analytics
- ✅ No cloud storage
- ✅ No third-party services
- ✅ Fully offline-capable
- ✅ Data never leaves your device (except manual backup/sync)

## 🎨 UI Features

- **Dark Mode Ready**: Respects system theme preferences
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Touch-Optimized**: Swipe gestures and touch interactions
- **Smooth Animations**: Card flips, transitions, and hover effects
- **Accessible**: Semantic HTML and ARIA labels

## 🔄 Sync Protocol

The P2P sync uses WebRTC for direct device-to-device communication:

1. **Host** creates session and displays QR code
2. **Guest** scans QR code and responds with own QR code
3. **Host** scans guest QR to establish WebRTC connection
4. Both devices exchange card manifests
5. Only changed cards are synced
6. Conflicts resolved by last-write-wins (updatedAt timestamp)
7. Optional session-level encryption

## 📄 Project Structure

```
src/
├── components/         # React components
│   ├── cards/         # Card management UI
│   ├── layout/        # Layout components (Header, BottomNav)
│   ├── scanner/       # Barcode scanner
│   ├── settings/      # Settings page
│   ├── setup/         # Initial setup wizard
│   ├── sync/          # P2P sync UI
│   └── ui/            # Reusable UI components
├── hooks/             # Custom React hooks
│   ├── useCards.ts    # Card CRUD operations
│   ├── useScanner.ts  # Barcode scanning
│   └── useShare.ts    # Web Share API
├── lib/               # Core libraries
│   ├── backup.ts      # Backup/restore
│   ├── crypto.ts      # Encryption
│   ├── scanner.ts     # ZXing integration
│   ├── storage.ts     # IndexedDB
│   ├── sync/          # P2P sync protocol
│   └── validation.ts  # Zod schemas
└── test/              # Test setup and utilities
```

## 🛠️ Development

### Build Configuration
- **Vite with Rolldown**: Faster builds via Rolldown bundler
- **React Compiler**: Automatic optimization with babel-plugin-react-compiler
- **PWA Plugin**: Service worker generation with Workbox
- **Base Path**: `/loyalty-card-vault/` for GitHub Pages deployment

### Code Quality
- **ESLint**: Code linting with React hooks rules
- **TypeScript**: Strict type checking
- **Immutability**: All state updates use immutable patterns
- **Testing**: Comprehensive test suite with Vitest

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please follow these guidelines:

1. Follow immutability patterns (no mutations)
2. Add tests for new features
3. Update documentation
4. Use conventional commit messages
5. Ensure all tests pass (`pnpm test`)

## 🐛 Known Issues

None currently. All major bugs fixed in recent updates:
- ✅ Encryption now mandatory by default
- ✅ Headers span full width consistently
- ✅ Backup import detects encryption from file
- ✅ Share functionality with multiple fallbacks

## 🙏 Acknowledgments

- Built with ❤️ using Claude Code
- Icons: Unicode emoji
- Barcode scanning: ZXing library
- Encryption: Web Crypto API
