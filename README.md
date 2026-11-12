# 🎫 Loyalty Card Vault

A secure Progressive Web App (PWA) for managing loyalty cards with barcode scanning and encrypted URL sharing.

![PWA](https://img.shields.io/badge/PWA-Ready-brightgreen)
![React 19](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tests](https://img.shields.io/badge/Tests-142%20passing-success)

## ✨ Features

### 🔐 Security First
- **AES-256 Encryption**: Every card is encrypted at rest in IndexedDB
- **Password Protection**: Mandatory password setup on first launch, unlock on every launch
- **No Cloud Storage**: Everything stored locally in IndexedDB
- **Lock/Unlock Vault**: Neither the password nor the key is ever stored; the key lives in memory until you lock or close the app
- **No recovery**: A forgotten password cannot be recovered. "Forgot your password?" on the unlock screen erases the vault so you can start over

### 📱 Card Management
- **Barcode Scanning**: Camera-based scanning with ZXing (QR, EAN-13, UPC-A, CODE-128, etc.)
- **Smart Detection**: Auto-detects store names from barcode data
- **Visual Cards**: Beautiful card UI with customizable colors
- **Tags & Search**: Organize with tags and search by name/store
- **Flip Cards**: Front shows card info, back shows barcode
- **Reopens Your Last Card**: The card that was open when you closed the app opens again on the next launch (the list, if that was what you had open)

### 📤 Encrypted URL Sharing
- **Share via URL**: Generate encrypted URLs for sharing cards
- **Separate Password**: 6-character password shared separately
- **Easy Import**: Recipients enter password to import shared cards
- **One System**: Same mechanism for single card or multiple cards

### 💾 Backup & Restore
- **Export Backup**: Download a JSON backup file encrypted with your master password
- **Import Backup**: Restore a backup; one exported from another vault asks for the password it was exported with. Unencrypted backups from earlier versions still import
- **Theme Switcher**: Light / Dark / Auto theme options
- **Reset Data**: Complete data reset with confirmation

### 🖼️ Export
- **Export as Image**: Save card as PNG image
- **Clipboard Fallback**: Automatic fallback for unsupported browsers

## 🚀 Tech Stack

- **React 19** - UI framework with React Compiler
- **TypeScript** - Type safety
- **Vite (Rolldown)** - Lightning-fast build tool
- **IndexedDB** - Local encrypted storage
- **ZXing** - Barcode scanning
- **bwip-js** - Barcode rendering
- **Vitest** - Unit testing (141 tests), **Playwright** - end-to-end tests
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

## 📱 PWA Installation

The app can be installed on mobile devices and desktop:

1. Open the app in a browser
2. Look for "Install" or "Add to Home Screen" prompt
3. Follow browser-specific installation steps

## 🔒 Security Features

### Encryption
- **Algorithm**: AES-256-GCM, a fresh random IV for every write; each card's id is authenticated with it
- **Key Derivation**: PBKDF2-SHA256, 600,000 iterations, random 16-byte salt per vault
- **Password Requirements**: Minimum 8 characters with letter + number
- **Storage**: IndexedDB (`loyalty-card-vault`) holds the sealed cards and the vault record (salt, iteration count and a sealed check value to recognise the right password). Neither the password nor the key is stored: the key stays in memory (non-extractable) while unlocked
- **Upgrading**: cards saved unencrypted by earlier versions are encrypted when you set your password, in one transaction: if it fails, nothing changes
- **Shared origin**: the app is served from `maxgfr.github.io`, whose storage every site there can read. They see ciphertext only

### Backup file format
```json
{ "version": 1, "exportedAt": 1730000000000, "encrypted": true,
  "cards": { "iv": "…", "data": "…", "salt": "…", "iterations": 600000 } }
```
`cards` decrypts (AES-256-GCM, key = PBKDF2-SHA256(password, salt, iterations)) to the JSON array of cards. Files without `iterations` were made with 100,000. Share links use the same payload, under their 6-character password.

### Privacy
- ✅ No telemetry or analytics
- ✅ No cloud storage
- ✅ No third-party services
- ✅ Fully offline-capable
- ✅ Data never leaves your device (except manual backup/share)

## 🎨 UI Features

- **Theme Options**: Light / Dark / Auto (system preference)
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Touch-Optimized**: Swipe gestures and touch interactions
- **Smooth Animations**: Card flips, transitions, and hover effects
- **Accessible**: Semantic HTML and ARIA labels

## 📤 Share Protocol

The encrypted URL sharing works as follows:

1. **Sender** selects card(s) to share
2. App generates encrypted URL + 6-character password
3. Sender shares URL via any channel (email, messaging, QR)
4. Sender shares password separately (secure channel)
5. **Recipient** opens URL, enters password
6. Cards are decrypted and imported into recipient's vault


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