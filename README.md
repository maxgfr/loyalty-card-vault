# 🎫 Loyalty Card Vault

A secure Progressive Web App (PWA) for managing loyalty cards with barcode scanning and encrypted URL sharing.

![PWA](https://img.shields.io/badge/PWA-Ready-brightgreen)
![React 19](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tests](https://img.shields.io/badge/Tests-159%20passing-success)

## ✨ Features

### 🔐 Security First
- **AES-256 Encryption**: Every card is encrypted at rest in IndexedDB
- **Passwordless Option**: On a device with Touch ID, Face ID or a fingerprint reader, create the vault with a passkey and no password (a password can be added later)
- **Password Protection**: Or a password, asked on every launch unless biometric unlock is on
- **Biometric Unlock**: Optionally open the app with Touch ID, Face ID or a fingerprint (a passkey) instead of typing the password
- **Don't Ask on This Device**: Optionally keep the vault unlocked on a device you trust (see the trade-off below)
- **No Cloud Storage**: Everything stored locally in IndexedDB
- **Lock/Unlock Vault**: Neither the password nor the key is ever stored (unless you choose "Don't ask on this device"); the key lives in memory until you lock or close the app
- **Forgotten password**: With biometric unlock on, "Forgot your password?" unlocks with it and lets you choose a new password, cards kept. Without it, the password cannot be recovered: the vault can only be erased to start over
- **Change Password**: Settings → Password re-encrypts every card under the new password, all at once

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
- **No password (optional)**: a vault created with a passkey has a random 256-bit key (the `vault` record says `kdf: "none"`), sealed under the passkey's PRF output only. Setting a password later re-encrypts every card under PBKDF2(password), in one transaction, as does changing it (the passkey record and the device key follow)
- **Upgrading**: cards saved unencrypted by earlier versions are encrypted when you set your password, in one transaction: if it fails, nothing changes
- **Shared origin**: the app is served from `maxgfr.github.io`, whose storage every site there can read. They see ciphertext only
- **Biometric unlock (optional)**: a passkey on the device's platform authenticator (Touch ID, Face ID, Android fingerprint, Windows Hello), used for its WebAuthn PRF output only (nothing goes to a server). The vault key's raw bytes are sealed (AES-256-GCM) under HKDF-SHA256(PRF output) and stored in the `passkey` settings record with the credential id and PRF salt; only the authenticator, after verifying you, can give that output back. Turning it on asks for the password, since the key in memory cannot be exported. Needs passkeys with PRF: Safari / iOS 18+, Chrome 132+, Firefox 135+. The password keeps working
- **Don't ask on this device (optional)**: the vault key itself (a non-extractable `CryptoKey`) is kept in the `deviceKey` settings record, and the app opens unlocked. Anyone who can use the device, and any script of the `maxgfr.github.io` origin, can then decrypt the cards. Lock Now turns it off

### Backup file format
```json
{ "version": 1, "exportedAt": 1730000000000, "encrypted": true,
  "cards": { "iv": "…", "data": "…", "salt": "…", "iterations": 600000 } }
```
`cards` decrypts (AES-256-GCM, key = PBKDF2-SHA256(password, salt, iterations)) to the JSON array of cards. The password is the master password, or, for a vault without one, a password chosen for that backup. Files without `iterations` were made with 100,000. Share links use the same payload, under their 6-character password.

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