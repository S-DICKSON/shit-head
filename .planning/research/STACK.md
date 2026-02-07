# Technology Stack

**Project:** Shithead Online
**Researched:** 2026-02-07
**Confidence:** MEDIUM (based on training data through January 2025, needs verification for 2026 versions)

## Recommended Stack

### Frontend Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.x | UI framework | Industry standard, excellent mobile support, rich ecosystem for card game UIs |
| TypeScript | 5.x | Type safety | Prevents runtime errors in complex game state, better DX for multiplayer logic |
| Vite | 5.x | Build tool | Fast dev server, optimized production builds, better than CRA for 2025+ |

**Rationale:** React dominates browser-based games. TypeScript is non-negotiable for managing complex game state (card positions, player turns, special rules). Vite replaced Create React App as the default choice in 2024.

**Confidence:** HIGH for React/TypeScript, MEDIUM for Vite version (verify latest)

### UI & Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 3.x | Styling | Rapid responsive design, mobile-first, no CSS-in-JS runtime cost |
| Framer Motion | 11.x | Animations | Best React animation library for card movements, drag-drop, transitions |
| React DnD | 16.x | Drag-and-drop | Optional: for card interactions if implementing drag-to-play |

**Rationale:** Tailwind is the modern standard for responsive UIs. Framer Motion handles card animations (deal, flip, move to pile) with declarative API. React DnD is optional - tap/click may be better for mobile-first.

**Confidence:** HIGH for Tailwind, MEDIUM for Framer Motion version (verify latest), LOW for React DnD necessity (may not need it)

### Backend Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 20.x LTS | Runtime | JavaScript across stack, excellent WebSocket support |
| Express | 4.x | HTTP server | Minimal, battle-tested, pairs with Socket.IO |
| Socket.IO | 4.x | WebSocket layer | Handles reconnections, room management, fallbacks automatically |

**Rationale:** Node.js enables full-stack TypeScript. Express is minimal for serving frontend + health endpoints. Socket.IO is the de facto standard for game rooms - handles reconnection, room management, and broadcasts out of the box.

**Alternative considered:** Fastify (faster than Express) - but Express + Socket.IO integration is more documented for game dev.

**Confidence:** HIGH for Node.js LTS, HIGH for Socket.IO approach, MEDIUM for specific versions

### State Management (Frontend)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | 4.x | Client state | Lightweight, no boilerplate, perfect for game state (hand, table, pile) |
| React Context | Built-in | WebSocket state | Share Socket.IO connection across components |

**Rationale:** NO Redux - overkill for this project. Zustand handles local game state with minimal code. React Context passes WebSocket connection down. Server is source of truth for game state, client just renders.

**Alternative considered:** Jotai, Valtio - all fine, Zustand has better DX for simple cases.

**Confidence:** MEDIUM (Zustand popularity high as of 2024, verify still preferred in 2026)

### State Management (Backend)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| In-memory objects | N/A | Game rooms | No database needed, rooms expire when game ends |
| Map/Set | Native | Room lookup | Fast O(1) lookups for room codes |

**Rationale:** NO DATABASE. Games are ephemeral. Store active rooms in memory as JavaScript objects. Room cleanup on disconnect/game end. If server restarts, games are lost - acceptable tradeoff for simplicity.

**Confidence:** HIGH (standard pattern for lobby-based games without persistence)

### Deployment
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Railway / Render | N/A | Hosting | WebSocket support, auto-deploy from git, free tier available |
| Vercel | N/A | Frontend (alternative) | Great for static frontend, but needs separate backend for WS |
| Cloudflare Pages | N/A | Frontend (alternative) | Fast global CDN, but needs separate backend |

**Rationale:** Railway or Render for single-service deployment (frontend + backend together). Supports WebSocket, persistent connections, simple deployment. Vercel/Cloudflare Pages only work if you separate frontend/backend, which adds complexity.

**Alternative architecture:** Frontend on Vercel/Cloudflare, backend on Railway - more complex but better global performance.

**Confidence:** LOW (deployment landscape changes fast, verify 2026 WebSocket hosting options)

### Development Tools
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ESLint | 8.x | Linting | Catch bugs, enforce patterns |
| Prettier | 3.x | Formatting | Consistent code style |
| Vitest | 1.x | Testing | Fast, Vite-native, better than Jest for 2025+ |

**Rationale:** Standard tooling. Vitest replaced Jest as the default choice for Vite projects in 2024.

**Confidence:** MEDIUM (verify Vitest is still preferred in 2026)

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Frontend | React | Vue, Svelte | React ecosystem for game UIs is larger, Framer Motion is React-specific |
| Backend | Node.js + Express | Bun, Deno | Less mature WebSocket ecosystem as of 2024 |
| WebSocket | Socket.IO | ws, uWebSockets.js | Socket.IO handles reconnection/rooms/fallbacks automatically |
| Styling | Tailwind | CSS Modules, Styled Components | Tailwind faster for responsive design, no runtime cost |
| Animations | Framer Motion | React Spring, GSAP | Framer Motion better DX for declarative animations |
| Deployment | Railway/Render | Heroku, AWS, DigitalOcean | Railway/Render simpler, free tier, auto-deploy |

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| Create React App | Deprecated in 2023, use Vite |
| Redux | Overkill for this project, Zustand is simpler |
| Database (Postgres, MongoDB) | No persistent data needed, adds complexity |
| REST API | WebSocket handles all game communication |
| Server-side rendering (Next.js) | No SEO need for game app, adds complexity |
| GraphQL | Overkill for real-time game state, use Socket.IO events |
| Docker (for dev) | Unnecessary complexity for Node.js dev |

## Installation

### Initialize Project

```bash
# Frontend (Vite + React + TypeScript)
npm create vite@latest shithead-client -- --template react-ts
cd shithead-client
npm install

# Install dependencies
npm install socket.io-client zustand framer-motion

# Install Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Dev dependencies
npm install -D prettier eslint vitest
```

### Backend

```bash
# Backend (Node.js + Express + Socket.IO)
mkdir shithead-server
cd shithead-server
npm init -y

# Install dependencies
npm install express socket.io cors

# TypeScript setup
npm install -D typescript @types/node @types/express
npx tsc --init

# Dev dependencies
npm install -D nodemon tsx
```

### Monorepo Structure (Recommended)

```
shithead-online/
├── client/          # Vite + React + TypeScript
├── server/          # Node.js + Express + Socket.IO
├── shared/          # Shared TypeScript types (game state, events)
└── package.json     # Workspace root
```

Use npm workspaces or pnpm workspaces to share types between client/server.

## Architecture Notes

### WebSocket Event Design

Use strongly-typed Socket.IO events:

```typescript
// shared/events.ts
export interface ServerToClientEvents {
  gameState: (state: GameState) => void;
  playerJoined: (player: Player) => void;
  cardPlayed: (card: Card, player: string) => void;
  turnChanged: (playerId: string) => void;
  gameEnded: (winner: string) => void;
}

export interface ClientToServerEvents {
  createRoom: (nickname: string, callback: (roomCode: string) => void) => void;
  joinRoom: (roomCode: string, nickname: string) => void;
  playCard: (card: Card) => void;
  swapCards: (handCard: Card, faceUpCard: Card) => void;
  pickupPile: () => void;
}
```

### State Synchronization

- Server is source of truth for ALL game state
- Client sends actions (playCard, swapCards)
- Server validates, updates state, broadcasts to room
- Client renders based on server state only
- Optimistic updates ONLY for animations, revert if server rejects

### Room Management

```typescript
// server/rooms.ts
interface Room {
  code: string;
  players: Map<string, Player>;
  gameState: GameState;
  createdAt: number;
}

const rooms = new Map<string, Room>();
```

Cleanup strategy:
- Remove room when all players disconnect
- Auto-cleanup rooms older than 24 hours (cron job)

## Performance Considerations

| Concern | Solution |
|---------|----------|
| Card animations on mobile | Use CSS transforms (GPU-accelerated), avoid layout thrashing |
| WebSocket reconnection | Socket.IO handles automatically, show "Reconnecting..." UI |
| Large game state broadcasts | Only broadcast state changes, not full state each turn |
| Memory leaks in long games | Clear intervals/timers, cleanup Socket.IO listeners on unmount |

## Security Considerations

| Risk | Mitigation |
|------|------------|
| Room code collision | Use 6-character alphanumeric codes (36^6 = 2B+ combinations) |
| Cheating (play invalid cards) | Server validates ALL moves, never trust client |
| DoS via room creation | Rate limit room creation per IP |
| XSS in nicknames | Sanitize/escape all user input |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Frontend framework (React + TypeScript) | HIGH | Industry standard, well-established |
| Build tool (Vite) | MEDIUM | Was standard in 2024, verify still preferred in 2026 |
| WebSocket library (Socket.IO) | HIGH | De facto standard for game rooms |
| State management (Zustand) | MEDIUM | Popular in 2024, verify vs newer alternatives |
| Animation library (Framer Motion) | MEDIUM | Verify latest version and alternatives |
| Deployment (Railway/Render) | LOW | Hosting landscape changes fast, research 2026 options |
| Testing (Vitest) | MEDIUM | Was replacing Jest in 2024, verify still preferred |

## Verification Needed (2026)

Since my training data is from January 2025, verify these before proceeding:

1. **Vite version** - Is 5.x still current or is 6.x out?
2. **Framer Motion** - Still the preferred animation library for React?
3. **Zustand vs alternatives** - Still preferred over Jotai/Valtio/XState?
4. **Vitest adoption** - Fully replaced Jest in the ecosystem?
5. **Deployment platforms** - Railway/Render still best for WebSocket hosting? New options?
6. **Node.js LTS** - Is 20.x still LTS or is 22.x the new LTS?
7. **Socket.IO v5** - Was there a major version bump with breaking changes?

## Sources

This research is based on:
- **Training data (January 2025):** General knowledge of web development stack trends through 2024
- **Confidence:** MEDIUM overall - versions and specific library preferences need verification for February 2026

**CRITICAL:** Before finalizing stack, verify all version numbers and library choices with:
1. Official npm registry for latest stable versions
2. Official documentation for each library
3. GitHub repos for recent release notes
4. Community discussions for 2026 best practices

## Recommendations for Next Steps

1. **Verify versions:** Check npm for latest stable versions of all listed packages
2. **Prototype WebSocket flow:** Test Socket.IO room management with 2-4 clients
3. **Test mobile animations:** Ensure Framer Motion performs well on mobile devices
4. **Research deployment:** Confirm Railway/Render still support WebSocket in 2026 free tier

## Final Stack Summary

**Frontend:** React 18 + TypeScript + Vite + Tailwind + Framer Motion + Zustand
**Backend:** Node.js 20 LTS + Express + Socket.IO
**Deployment:** Railway or Render (single-service deployment)
**Testing:** Vitest
**No database, no auth, no persistence**

This stack prioritizes:
- Fast development (Vite, Tailwind)
- Type safety (TypeScript across stack)
- Real-time multiplayer (Socket.IO)
- Mobile-first responsive design (Tailwind, Framer Motion)
- Simplicity (no database, no complex deployment)
