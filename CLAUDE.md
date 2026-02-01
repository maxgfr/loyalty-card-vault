# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Current test coverage: **72 tests passing**
- Unit tests for hooks (useCards)
- Component tests (CardList)
- Library tests (crypto, validation, backup, share-url)

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
- `setup/` - Initial setup wizard (mandatory password)
- `help/` - Help/documentation page

### State Management Pattern
- Custom React hooks in `src/hooks/` handle domain logic
- `useCards()` - CRUD operations for cards, encryption lock/unlock state
- `useHashRouter()` - Hash-based routing
- `useScanner()` - Barcode scanning with camera
- All state updates use immutable patterns (spread operators, no mutation)

### Storage Layer (`src/lib/storage.ts`)
- IndexedDB via `idb` library for persistent storage
- **Mandatory** AES-256-GCM encryption (all users must have password)
- Theme settings (light/dark/auto)
- `clearAllData()` for complete reset
- Raw data access for backup/restore functionality
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
1. Encryption is **mandatory** - all users must create a password during setup
2. Password stored in memory only (never persisted)
3. Each card encrypted with AES-256-GCM before IndexedDB storage
4. Locking vault clears password from memory, requires re-entry
5. Backup files detect encryption status from file content, not local settings

### Theme System
- Settings stored in IndexedDB (`theme` key)
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
- `clearAllData()` in storage.ts deletes all cards and settings
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
- When modifying share logic, test full cycle (create URL → decode → import)
- When modifying theme, test all three modes (light/dark/auto)
