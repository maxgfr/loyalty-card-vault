# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project

Loyalty Card Vault - A Progressive Web App (PWA) for managing loyalty cards with barcode scanning and encrypted URL sharing. Built with React 19, TypeScript, Vite (Rolldown), and IndexedDB.

**Tech Stack**: React 19, TypeScript, Vite (Rolldown), IndexedDB (idb), ZXing (barcode), bwip-js (barcode rendering), Zod (validation), Vitest (testing)

## Development Commands

```bash
pnpm dev              # Start development server with hot reload
pnpm build            # TypeScript compilation + Vite production build
pnpm preview          # Preview production build locally
pnpm test             # Run unit tests with Vitest
pnpm test:ui          # Run tests with Vitest UI interface
pnpm test:coverage    # Run tests with coverage report
pnpm lint             # Lint code with ESLint
```

**Package Manager**: pnpm (with Rolldown override configured in package.json)

## Test Coverage

Current test coverage: **141 unit tests passing**, plus Playwright end-to-end tests (`e2e/`)
- Unit tests for hooks (useCards)
- Component tests (CardList)
- Library tests (crypto, validation, backup, share-url, storage with `fake-indexeddb`: vault, migration, backups)

## Architecture Overview

### Entry Point & Routing
- `src/App.tsx` - Main application component with hash-based routing
- `src/hooks/useHashRouter.ts` - Custom client-side router using window.location.hash
- Routes: `home`, `card/:id`, `scan`, `add`, `edit/:id`, `settings`, `help`, `share/:encodedData`

### Component Organization
Feature-based structure under `src/components/`:
- `ui/` - Reusable UI primitives (Button, Card, Input, Modal, Toast, etc.)
- `cards/` - Card management (CardList, CardItem, CardDetail, CardForm, AddCardPage, EditCardPage)
- `share/` - Encrypted URL sharing (SharePage, ShareURLModal)
- `scanner/` - Barcode scanner component
- `layout/` - Layout wrappers (Header, BottomNav, Layout)
- `settings/` - Settings page (theme, backup, reset)
- `setup/` - `SetupPage` (mandatory password on first launch, encrypts cards left in clear by earlier versions) and `UnlockPage` (password on every launch, "forgot password" erase)
- `help/` - Help/documentation page

### State Management Pattern
- Custom React hooks in `src/hooks/` handle domain logic
- `useCards(unlocked)` - CRUD operations for cards; empty while the vault is locked. `App` holds the vault state (`none` / `locked` / `unlocked`) from `getVaultState()`
- `useHashRouter()` - Hash-based routing
- `useScanner()` - Barcode scanning with camera
- All state updates use immutable patterns (spread operators, no mutation)

### Storage Layer (`src/lib/storage.ts`)
- IndexedDB via `idb` library for persistent storage
- **Mandatory** AES-256-GCM encryption: `createVault(password)` / `unlockVault(password)` derive the vault key (PBKDF2-SHA256, 600,000 rounds, salt in the `vault` settings record) and keep it in a module variable; `lockVault()` forgets it. Card reads and writes throw `VaultLockedError` while locked
- Each card is stored sealed (`{ v: 1, iv, data }`), its id as additional authenticated data
- `createVault` encrypts plain cards left by earlier versions in the same transaction that records the vault (all or nothing)
- Theme settings (light/dark/auto)
- `clearAllData()` for complete reset (also locks)
- Settings stored separately from card data

### Encrypted URL Sharing (`src/lib/share-url.ts`)
**Flow**: Create share URL → Generate 6-char password → Encrypt cards → Encode as base64 → URL format `#/share/{encoded}`

Key functions:
- `createShareURL(cards)` - Returns `{ url, password }`
- `decodeShareURL(encoded, password)` - Returns decrypted cards
- Uses `crypto.ts` for AES-256-GCM encryption
- Password contains only unambiguous characters (no 0/O, 1/I)

### Validation (`src/lib/validation.ts`)
- Zod schemas for runtime type checking
- Barcode format validation (QR_CODE, EAN_13, UPC_A, CODE_128, CODE_39, DATA_MATRIX, etc.)

### Barcode Scanning (`src/lib/scanner.ts`)
- ZXing browser library for camera-based scanning
- Multiple format support
- Auto-detection of store names from barcode data

### Barcode Rendering (`src/components/cards/CardBarcode.tsx`)
- bwip-js library for rendering barcodes on canvas
- Supports all major barcode formats
- Used in card detail view and export image

### Testing Setup
- Unit tests: Vitest with jsdom environment
- Test setup: `src/test/setup.ts` (auto-cleanup after each test, @testing-library/jest-dom)
- Component testing: React Testing Library
- Test utilities: mocks for IndexedDB and crypto
- All tests use immutable patterns and proper act() wrapping for async updates

## Important Implementation Notes

### Build Configuration
- Uses **Rolldown** (via `rolldown-vite` override) for faster builds
- Vite PWA plugin with Workbox for service worker
- Base path: `/loyalty-card-vault/` (GitHub Pages deployment)
- React Compiler enabled via Babel plugin

### Encryption Flow
1. Encryption is **mandatory** - all users must create a password during setup (no recovery if forgotten)
2. Neither the password nor the derived key is persisted; the key lives in memory while unlocked
3. Each card is sealed with AES-256-GCM under the vault key before IndexedDB storage
4. Every launch shows the unlock screen; "Lock Now" in Settings forgets the key
5. Backups are always exported encrypted (`BackupData` with an `EncryptedPayload` that the master password opens; see README). Import detects the format from the file: plain (earlier versions) or encrypted (asks for the password when it is not this vault's)

### Theme System
- Settings stored in IndexedDB (`theme` key, not encrypted: preferences only)
- Options: `light`, `dark`, `auto`
- `auto` mode respects `prefers-color-scheme` media query
- CSS classes applied to document root: `theme-light`, `theme-dark`, `theme-auto`

### Share URL Format
```
https://example.com/app#share/{base64-encoded-encrypted-data}
```
- URL contains encrypted card data (base64 encoded)
- Password (6 chars) shared separately via secure channel
- Recipient opens URL → enters password → cards imported

### Data Reset
- `clearAllData()` in storage.ts deletes all cards, settings and the vault record
- User must go through setup again after reset
- Confirmation modal required before reset

### Custom Hook Pattern
All custom hooks follow this structure:
- Accept config/params
- Return state + operations
- Use useCallback for operations to maintain referential equality
- Handle errors with try/catch, throw descriptive errors

### Type Definitions
Core types in `src/types/index.ts`:
- `LoyaltyCard` - Main card entity
- `Route` - Hash-based route types (includes `share` route)
- `ScanResult` - Barcode scan result
- `EncryptedPayload` - AES-256-GCM encrypted data structure
- Barcode format types

## Development Workflow Notes

- Barcode scanning requires HTTPS or localhost for camera access
- PWA testing requires serving over HTTPS (or localhost)
- IndexedDB data persists across sessions - clear browser storage for fresh testing
- A full page load locks the vault (the key is in memory only): in e2e tests navigate with `location.hash`, not `page.goto`, once unlocked
- When modifying share logic, test full cycle (create URL → decode → import)
- When modifying theme, test all three modes (light/dark/auto)
