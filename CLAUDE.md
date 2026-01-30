# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Loyalty Card Vault - A Progressive Web App (PWA) for managing loyalty cards with barcode scanning and peer-to-peer device synchronization. Built with React 19, TypeScript, Vite (Rolldown), and WebRTC.

**Tech Stack**: React 19, TypeScript, Vite (Rolldown), IndexedDB (idb), ZXing (barcode), Zod (validation), WebRTC (P2P sync), Vitest + Playwright (testing)

## Development Commands

```bash
pnpm dev              # Start development server with hot reload
pnpm build            # TypeScript compilation + Vite production build
pnpm preview          # Preview production build locally
pnpm test             # Run unit tests with Vitest
pnpm test:ui          # Run tests with Vitest UI interface
pnpm test:coverage    # Run tests with coverage report (target: 80%+)
pnpm lint             # Lint code with ESLint
```

**Package Manager**: pnpm (with Rolldown override configured in package.json)

## Architecture Overview

### Entry Point & Routing
- `src/App.tsx` - Main application component with hash-based routing
- `src/hooks/useHashRouter.ts` - Custom client-side router using window.location.hash
- Routes: `home`, `card/:id`, `scan`, `add`, `edit/:id`, `settings`, `help`, `sync`

### Component Organization
Feature-based structure under `src/components/`:
- `ui/` - Reusable UI primitives (Button, Card, Input, Modal, Toast, etc.)
- `cards/` - Card management (CardList, CardItem, CardDetail, CardForm, AddCardPage, EditCardPage)
- `sync/` - P2P synchronization UI
- `scanner/` - Barcode scanner component
- `layout/` - Layout wrappers (Header, BottomNav, Layout)
- `settings/` - Settings page
- `setup/` - Initial setup wizard
- `help/` - Help/documentation page

### State Management Pattern
- Custom React hooks in `src/hooks/` handle domain logic
- `useCards()` - CRUD operations for cards, encryption lock/unlock state
- `useSyncSession()` - P2P sync session management
- `useScanner()` - Barcode scanning with camera
- `useShare()` - Web Share API integration
- All state updates use immutable patterns (spread operators, no mutation)

### Storage Layer (`src/lib/storage.ts`)
- IndexedDB via `idb` library for persistent storage
- Optional AES-256-GCM encryption (user chooses during setup)
- Raw data access for backup/restore functionality
- Settings stored separately from card data

### P2P Synchronization (`src/lib/sync/`)
**Protocol Flow**: Host creates session → displays QR → Guest scans → Guest responds with QR → Host scans → WebRTC connection established

Key modules:
- `sync-protocol.ts` - State machine orchestrating sync (hello → manifests → data → complete)
- `webrtc-manager.ts` - WebRTC connection management
- `signaling-codec.ts` - QR code encoding/decoding for session establishment
- `conflict-resolver.ts` - Last-write-wins conflict resolution
- `session-crypto.ts` - Optional session-level encryption
- `types.ts` - All sync-related type definitions

### Validation (`src/lib/validation.ts`)
- Zod schemas for runtime type checking
- Barcode format validation (QR_CODE, EAN_13, UPC_A, CODE_128, CODE_39, DATA_MATRIX, etc.)

### Barcode Scanning (`src/lib/scanner.ts`)
- ZXing browser library for camera-based scanning
- Multiple format support
- Auto-detection of store names from barcode data

### Testing Setup
- Unit tests: Vitest with jsdom environment
- Test setup: `src/test/setup.ts` (auto-cleanup after each test)
- Component testing: React Testing Library
- E2E testing: Playwright (critical user flows)
- Test utilities: mocks for IndexedDB, crypto, and WebRTC

## Important Implementation Notes

### Build Configuration
- Uses **Rolldown** (via `rolldown-vite` override) for faster builds
- Vite PWA plugin with Workbox for service worker
- Base path: `/loyalty-card-vault/` (GitHub Pages deployment)
- React Compiler enabled via Babel plugin

### State Synchronization
- Cards have `createdAt` and `updatedAt` timestamps for conflict resolution
- Sync protocol compares manifests, exchanges only changed cards
- Last-write-wins based on `updatedAt` timestamp

### Encryption Flow
1. User chooses encryption during initial setup
2. Password stored in memory only (never persisted)
3. Each card encrypted with AES-256-GCM before IndexedDB storage
4. Locking vault clears password from memory, requires re-entry

### Custom Hook Pattern
All custom hooks follow this structure:
- Accept config/params
- Return state + operations
- Use useCallback for operations to maintain referential equality
- Handle errors with try/catch, throw descriptive errors

### Type Definitions
Core types in `src/types/index.ts`:
- `LoyaltyCard` - Main card entity
- `Route` - Hash-based route types
- `ScanResult` - Barcode scan result
- Barcode format types

## Development Workflow Notes

- When modifying sync logic, test both host and guest flows
- Barcode scanning requires HTTPS or localhost for camera access
- PWA testing requires serving over HTTPS (or localhost)
- IndexedDB data persists across sessions - clear browser storage for fresh testing
- WebRTC requires both devices to be on same network for local testing
