# replit.md

## Overview

SecureVault (V1wallet/VaultKey) is a portable cryptocurrency hardware wallet application that maintains consistent wallet configuration across multiple devices. It stores chain preferences, wallet addresses, and labels on a Raspberry Pi Pico hardware device, displaying identical addresses and chain preferences regardless of which computer connects.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (supports light/dark mode)
- **Build Tool**: Vite for development and production builds
- **Mobile**: Capacitor 7/8 for Android APK generation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with tsx for TypeScript execution
- **API Pattern**: RESTful API with `/api` prefix for all routes
- **WebSocket**: Bridge server for mobile-to-desktop Pico connection

### Hardware Integration
- **Raspberry Pi Pico H**: USB-connected hardware wallet via Web Serial API
- **Ledger**: Optional support via WebHID API
- **Simulated Wallet**: Software-based wallet option (Soft Wallet mode)

### Crypto Libraries (Pure JavaScript - NO WebAssembly)
- **ethers.js**: EVM chains, secp256k1 operations, BIP39/BIP44 derivation
- **tweetnacl**: Ed25519 for Solana
- **bitcoinjs-lib**: Bitcoin transaction support with manual Bech32/Bech32m
- **@solana/web3.js**: Solana transactions
- Custom TRON implementation using ethers for signing

### Project Structure
```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/ui/  # shadcn/ui components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Wallet services, crypto utilities
│   │   │   ├── hardware-wallet.ts  # Hardware wallet connection
│   │   │   ├── soft-wallet.ts      # Software wallet implementation
│   │   │   ├── pi-wallet.ts        # Pico USB communication
│   │   │   ├── non-evm-chains.ts   # Bitcoin, Solana, TRON support
│   │   │   └── wallet-context.tsx  # Global wallet state
│   │   └── pages/          # Page components
│   │       ├── bridge.tsx  # Mobile-Desktop bridge
│   │       ├── transfer.tsx # Send/Receive
│   │       └── dashboard.tsx
├── server/          # Express backend
│   ├── routes.ts    # API + WebSocket bridge
├── android/         # Capacitor Android project
├── pico_wallet/     # Raspberry Pi Pico firmware (MicroPython)
│   └── main.py      # Wallet storage on Pico flash
└── shared/          # Shared types
    └── schema.ts    # Chain definitions
```

### Mobile Bridge (for Pico H without WiFi/Bluetooth)
Since the Raspberry Pi Pico H lacks wireless connectivity, mobile apps connect through a bridge:
1. Desktop browser connects to Pico via USB (Web Serial API)
2. Desktop runs as bridge server (WebSocket at `/ws/bridge`)
3. Mobile app connects to desktop via network
4. Commands are relayed: Mobile → Desktop → Pico → Desktop → Mobile

API Endpoints:
- `POST /api/bridge/create` - Creates a new bridge session, returns `{ sessionId }`
- `GET /api/bridge/status/:sessionId` - Check session status
- WebSocket: `/ws/bridge?sessionId=XXX&role=desktop|mobile`

### Supported Chains
- **EVM**: Ethereum, BNB Chain, Polygon, Arbitrum, Avalanche
- **Non-EVM**: Bitcoin (all address types), Solana, TRON

### Build Commands
- `npm run dev` - Development server
- `npm run build` - Production build
- `npx cap sync android` - Sync web assets to Android
- `cd android && ./gradlew assembleDebug` - Build Android APK

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

## Important Constraints

1. **No WebAssembly**: All crypto must be pure JavaScript (Pico wallet requirement)
2. **No vite.config.ts changes**: Existing Vite setup must not be modified
3. **USB on Desktop only**: Mobile devices use bridge for Pico connection
4. **PIN Security**: 4-6 digit PIN required, session locks after 5 min idle
