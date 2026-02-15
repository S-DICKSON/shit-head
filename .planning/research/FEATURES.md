# Feature Landscape: v2.0 UI + Discord Activity

**Domain:** Mobile card game UX + Discord Activity integration
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

This research focuses on v2.0 milestone features for an existing multiplayer Shithead card game. The v1.0 foundation (room system, full game rules, WebSocket multiplayer, mobile UI) is **already built and working**. This milestone adds:

1. **Discord Activity integration** — Embed game in Discord voice channels via iframe + SDK
2. **Mobile card UI improvements** — Category navigation for large hands (>5 cards)
3. **Card playability highlights** — Visual indicators showing which cards can be played
4. **Sound mute toggle** — Player control over audio
5. **Host settings** — Configurable round time

**Key insight:** These are UX refinements and platform expansion, not core game features. The game engine, rules, and multiplayer infrastructure remain unchanged. Focus is on **accessibility (mobile UX), discoverability (Discord platform), and polish (playability indicators, sound control)**.

## Table Stakes

Features users expect in v2.0 based on domain research. Missing = incomplete milestone.

| Feature | Why Expected | Complexity | Phase Timing |
|---------|--------------|------------|--------------|
| **Card playability highlights** | Standard in digital card games (Hearthstone, MTG Arena, Marvel Snap). Players expect visual cues showing valid plays without trial-and-error. | **Medium** — Compute valid cards from game state, apply visual treatment (glow/border), update on state change. | Phase 2 (after game state integration) |
| **Mobile card categorization (>5 cards)** | Mobile card games use grouping when screen space is limited. Direct display breaks down beyond 5-7 cards. | **Medium** — Threshold detection, category buttons, grid modal, play confirmation. | Phase 3 (mobile UI redesign) |
| **Sound mute toggle** | Mobile game standard. Players in public settings need audio control. | **Low** — Boolean state + localStorage + conditional sound playback. | Phase 1 (quick win) |
| **Host settings for round time** | Multiplayer games need configurable pacing. Host controls match Discord Activity UX patterns. | **Medium** — Settings UI, validation, state sync to all clients, server enforcement. | Phase 4 (after Discord integration) |
| **Discord Activity iframe integration** | Discord Activities run in iframe with SDK. Must use Embedded App SDK for participant tracking, OAuth2, proxy networking. | **High** — SDK initialization, OAuth2 flow, token exchange, URL mappings, proxy compatibility, dual-mode detection. | Phase 5 (new platform integration) |

**Why these are table stakes:**
- **Playability highlights**: Shithead has complex rules (7s, 8s, pile state). New players struggle without visual guidance. Existing games all provide this.
- **Mobile categorization**: V1.0 groups cards by rank. When hand has 10+ cards (mid-game common), mobile screen becomes unusable. Pattern is proven (Hearthstone mobile uses different UI for large hands).
- **Sound mute**: V1.0 has sound notifications. Without mute, players can't use app in public. Mute is MVP for sound features.
- **Host settings**: V1.0 has fixed 30-60s turn time. Different playgroups want different pacing. Host settings enable customization without code changes.
- **Discord Activity**: Milestone goal is "play in Discord voice channels." SDK integration is mandatory, not optional.

## Differentiators

Features that elevate this implementation beyond minimum viable. Competitive advantages.

| Feature | Value Proposition | Complexity | Recommendation |
|---------|-------------------|------------|----------------|
| **Smart category threshold** | Only show categories when hand > 5 cards. Avoids unnecessary taps for small hands. | **Low** — Single conditional: `if (hand.length > 5) showCategories()` | Include — trivial to implement, big UX win |
| **Power card visual distinction** | Special cards (2, 8, 10) styled distinctly in category view. Faster recognition. | **Low** — CSS classes per card type, conditional styling | Include — aligns with Shithead's special card mechanics |
| **Dual-mode architecture** | Standalone web AND Discord Activity from same codebase. Players choose platform. | **High** — Platform detection, adapters for auth/connection/rooms, conditional initialization | Required for milestone — document as differentiator for competitive analysis |
| **Card category play confirmation** | Grid view has "Play Selected" button. Prevents accidental plays from mis-taps. | **Low** — Modal with confirmation button vs direct tap-to-play | Include — mobile safety pattern, prevents frustration |
| **Progressive disclosure in settings** | Host settings only visible to host. Mute only appears when sounds enabled. | **Low** — Conditional rendering based on role/state | Include — reduces UI clutter |

**Why these are differentiators:**
- **Smart threshold**: Most mobile card games always use category view (extra taps) OR always use direct view (unusable with many cards). Dynamic threshold is rare.
- **Power card visual distinction**: Aligns perfectly with Shithead's game mechanics (2s, 8s, 10s are special). Reduces cognitive load.
- **Dual-mode architecture**: Rare pattern. Most Discord games are Discord-only OR web-only. Supporting both expands player base without fragmenting codebase.
- **Play confirmation**: Prevents "oops, didn't mean to play that" which ruins games. Safety net for touch interactions.
- **Progressive disclosure**: Reduces visual noise for non-hosts, focuses attention on relevant controls.

## Anti-Features

Features to explicitly NOT build. Common mistakes to avoid.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Single "mute all" button** | Players want selective control (music off, SFX on). Single toggle is inflexible. | Separate music/SFX toggles. If only one audio type exists (SFX only for v2.0), single toggle is acceptable but label clearly ("Mute sound effects" not "Mute all"). |
| **Always-on category view** | Forces extra taps even with 2-3 cards in hand. Annoying for small hands. | **Threshold-based**: show cards directly until hand > 5, then switch to categories. |
| **Hover-based playability indicators** | Mobile has no hover. Highlights must be always-visible. | Always show glow/border on playable cards. No hover required. |
| **Complex host permission systems** | Discord tracks participants. Overbuilding permissions adds friction. | Simple: whoever creates room (web) or launches activity (Discord) is host. Use existing participant tracking. |
| **Custom state sync from scratch** | Multiplayer state sync is hard, bug-prone, race conditions galore. | **V2.0 keeps existing WebSocket multiplayer**. No new state sync needed. Discord proxies WebSocket, game logic unchanged. |
| **Separate Discord and web codebases** | Maintaining two implementations doubles maintenance burden, feature drift inevitable. | **Dual-mode with abstraction layer**: platform detection, adapters for auth/connection, shared game engine. |
| **Icon-only settings without labels** | "Gear icon" isn't universal, especially for non-gamers. | Icon + label, or text button in accessible location (top-right standard). |
| **Forcing room codes in Discord Activity** | Discord's model is "implicit join" (in voice channel = in activity). Room codes fight the platform. | Use Discord's instance ID for auto-join in voice channel. Keep room codes for standalone web only. |

**Critical anti-features for v2.0:**

### Anti-Feature Deep Dive: Custom State Sync

**The trap:** "Discord Activities need multiplayer state sync, let's add Colyseus/Playroom/Y.js."

**Why this is wrong for v2.0:**
- V1.0 already has **working WebSocket multiplayer** with server-authoritative game state
- Discord's proxy routes WebSocket connections transparently
- Game server doesn't need to know client is in Discord
- Adding new state sync = rewriting multiplayer = high risk, no benefit

**Correct approach:**
- Keep existing WebSocket multiplayer
- Discord Activity client connects via `/.proxy/game-ws` (relative URL)
- Server sees normal WebSocket connection
- Zero changes to game engine, room management, state synchronization

**When new state sync WOULD be needed:**
- If v1.0 had no multiplayer (adding from scratch)
- If migrating away from WebSocket to different protocol
- If adding guild-scoped persistence (leaderboards, player stats)

**For v2.0:** Don't add state sync libraries. Use existing infrastructure.

### Anti-Feature Deep Dive: Separate Codebases

**The trap:** "Discord Activity is different enough, let's make discord-client/ and web-client/ folders."

**Why this leads to pain:**
- Bug fixes must be applied twice
- Features drift between versions
- Testing doubles
- New developers confused which version is canonical
- Eventually forced to merge or choose one (rewrite)

**Correct approach:**
- Single codebase with platform detection layer
- Shared game components (>80% of code)
- Adapter pattern for platform differences (auth, connection, room creation)
- Conditional initialization at entry point
- Same game engine, different wrappers

**Example structure:**
```
packages/client/
├── src/
│   ├── platform/           # NEW for v2.0
│   │   ├── detector.ts     # Detect web vs Discord
│   │   ├── web/            # Web adapters
│   │   └── discord/        # Discord adapters
│   ├── game/               # UNCHANGED from v1.0
│   │   ├── components/
│   │   ├── composables/
│   │   └── stores/
│   └── main.ts             # Platform-aware initialization
```

## Feature Dependencies

```
Existing v1.0 Foundation (VALIDATED, WORKING):
├── Room system with shareable codes (web mode)
├── Full Shithead game rules engine
├── Real-time WebSocket multiplayer
├── Turn timer countdown
├── Card hand display with mobile grouping by rank
├── Sound notifications
└── Server-authoritative game state

New v2.0 Features (THIS MILESTONE):
│
├── 1. Sound Mute Toggle
│   ├── Depends on: existing sound notification system
│   ├── Complexity: LOW
│   └── Blocks: nothing (independent feature)
│
├── 2. Card Playability Highlights
│   ├── Depends on: game state (pile, turn player, hand)
│   ├── Complexity: MEDIUM (compute valid plays from rules engine)
│   └── Blocks: nothing (visual enhancement, doesn't block other features)
│
├── 3. Mobile Card Category UI
│   ├── Depends on: existing card hand component
│   ├── Complexity: MEDIUM (threshold logic, grid view, modal)
│   └── Blocks: nothing (mobile UX improvement, doesn't block other features)
│
├── 4. Host Settings (Round Time)
│   ├── Depends on: room system, host detection
│   ├── Complexity: MEDIUM (settings UI, validation, state sync)
│   └── Blocks: nothing (configuration feature, doesn't block core gameplay)
│
└── 5. Discord Activity Integration
    ├── Depends on: ALL existing game features
    ├── Complexity: HIGH (SDK, OAuth2, proxy, dual-mode)
    ├── Blocks: nothing (new platform, standalone web continues working)
    └── Sub-dependencies:
        ├── Platform detection (must be first)
        ├── Authentication adapter (web: nickname, Discord: OAuth2)
        ├── Connection adapter (web: direct WS, Discord: /.proxy/ WS)
        ├── Room adapter (web: manual codes, Discord: instance ID auto-join)
        └── Networking foundation (URL mappings, CSP compliance)
```

**Dependency insights:**

1. **Features 1-4 are independent** — Can be built in parallel or any order. No blocking dependencies between them.

2. **Feature 5 (Discord) depends on 1-4 being stable** — Discord Activity mode must support all v2.0 features (mute, playability, categories, settings). Build Discord integration last.

3. **All features share game engine** — No changes to rules, game state, or multiplayer protocol. Purely client-side UI and platform integration.

4. **Discord Activity is additive** — Standalone web mode continues working unchanged. Discord mode is new platform, not replacement.

## Implementation Patterns

### Pattern 1: Threshold-Based Mobile Card Categorization

**When to use:** Hand size > 5 cards (configurable threshold)

**How it works:**
```typescript
// Reactive threshold detection
const shouldShowCategories = computed(() => hand.value.length > 5)

// Category definition
const categories = {
  power: hand.value.filter(c => ['2', '8', '10'].includes(c.value)),
  normal: hand.value.filter(c => !['2', '8', '10'].includes(c.value))
}

// UI rendering
if (shouldShowCategories) {
  // Show category buttons: "Power Cards (3)" | "Normal Cards (5)"
} else {
  // Show cards directly (existing v1.0 behavior)
}
```

**Visual treatment:**
- Power cards: gold/purple border (distinct from normal cards)
- Normal cards: standard blue/gray styling
- Category buttons: Badge count, tap to open grid modal
- Grid modal: 3-column grid, large tap targets (min 60px), "Play Selected" button

**Why this pattern:**
- **Threshold prevents over-categorization** — Small hands don't need categories
- **Power vs Normal aligns with game mechanics** — Shithead's special cards (2, 8, 10) are conceptually different
- **Grid modal with confirmation** — Prevents accidental plays from scrolling/swiping

**Source:** Hearthstone mobile uses different card layouts based on hand size. Magic Arena mobile uses category filtering for large collections.

### Pattern 2: Always-Visible Card Playability Highlights

**When to use:** During player's turn, always (no hover required)

**How it works:**
```typescript
// Compute playable cards from game state
const playableCards = computed(() => {
  if (!isMyTurn.value) return []
  return hand.value.filter(card =>
    gameEngine.isValidPlay(card, pileState.value)
  )
})

// Apply visual indicator
function getCardClass(card: Card): string {
  const isPlayable = playableCards.value.includes(card)
  return isPlayable ? 'card-playable' : 'card-disabled'
}
```

**Visual treatment:**
```css
.card-playable {
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.6); /* green glow */
  border: 2px solid rgb(34, 197, 94);
}

.card-disabled {
  opacity: 0.5;
  filter: grayscale(50%);
}
```

**Why this pattern:**
- **Always-visible (no hover)** — Mobile has no hover state. Highlights must be persistent.
- **Green for playable** — Universal "go" signal. Red/gray for blocked.
- **Dark background enhances glow** — Tailwind dark mode or `bg-gray-900` makes highlights pop.
- **Updates on state change** — Pile state changes (burn, special card) trigger recompute.

**Source:** Hearthstone uses green glow for playable cards. MTG Arena uses similar highlight pattern. Marvel Snap uses pulsing glow (more aggressive but potentially distracting).

### Pattern 3: Discord Activity Platform Detection

**When to use:** App initialization, before any platform-specific code runs

**How it works:**
```typescript
// Detect Discord iframe environment
function detectPlatform(): 'web' | 'discord' {
  // Check if in iframe
  if (typeof window !== 'undefined' && window.parent !== window) {
    // Check for Discord-specific URL params
    const params = new URLSearchParams(window.location.search)
    if (params.has('frame_id') || params.has('instance_id')) {
      return 'discord'
    }
  }
  return 'web'
}

// Initialize platform-specific adapters
async function initializePlatform() {
  const platform = detectPlatform()

  if (platform === 'discord') {
    // Initialize Discord SDK, OAuth2, proxy networking
    const authAdapter = new DiscordAuthAdapter()
    const connAdapter = new DiscordConnectionAdapter()
    const roomAdapter = new DiscordRoomAdapter()
  } else {
    // Use existing web adapters (nickname, direct WS)
    const authAdapter = new WebAuthAdapter()
    const connAdapter = new WebConnectionAdapter()
    const roomAdapter = new WebRoomAdapter()
  }

  // Rest of app initialization uses adapters
}
```

**Why this pattern:**
- **Single detection point** — Detect once at bootstrap, store in global state. Prevents race conditions.
- **Adapter pattern** — Platform differences abstracted behind interfaces. Game code doesn't know about Discord.
- **Fail-safe to web** — If detection fails or ambiguous, default to standalone web mode.

**Source:** Discord Embedded App SDK docs, Robo.js dual-mode patterns, Colyseus Discord Activity templates.

### Pattern 4: Progressive Disclosure for Settings

**When to use:** Settings UI rendering

**How it works:**
```typescript
// Host detection
const isHost = computed(() =>
  player.value.id === room.value.hostId
)

// Settings visibility
<template>
  <div v-if="isHost" class="host-settings">
    <label>Round Time</label>
    <select v-model="roundTime">
      <option value="30">30 seconds</option>
      <option value="60">60 seconds (default)</option>
      <option value="90">90 seconds</option>
    </select>
  </div>
</template>
```

**Why this pattern:**
- **Reduces clutter** — Non-hosts don't see host-only controls
- **Clear affordance** — When you ARE host, controls appear naturally
- **No permission confusion** — If you see it, you can use it

**Source:** Standard UX pattern, Discord Activity examples (host controls common in multiplayer activities).

### Pattern 5: Sound Mute with Persistence

**When to use:** Composable for sound playback

**How it works:**
```typescript
// Composable with localStorage persistence
import { useSound } from '@vueuse/sound'
import { useLocalStorage } from '@vueuse/core'

export function useGameSounds() {
  const isMuted = useLocalStorage('sound-muted', false)

  const [playCard] = useSound('/sounds/card-play.mp3', {
    volume: computed(() => isMuted.value ? 0 : 0.5)
  })

  const [playBurn] = useSound('/sounds/burn.mp3', {
    volume: computed(() => isMuted.value ? 0 : 0.7)
  })

  function toggleMute() {
    isMuted.value = !isMuted.value
  }

  return { isMuted, toggleMute, playCard, playBurn }
}
```

**UI treatment:**
- Icon button in top-right corner
- Speaker icon with slash when muted
- Single tap to toggle
- State persists across sessions

**Why this pattern:**
- **localStorage persistence** — User preference survives page refresh
- **Composable pattern** — Centralized sound management, easy to extend
- **Volume 0 vs not playing** — Simpler than conditional logic everywhere

**Source:** @vueuse/sound documentation, mobile game UX patterns.

## MVP Recommendation for v2.0

**Must have (table stakes) — in priority order:**

1. **Sound mute toggle** — Quick win, unblocks public use of app. Phase 1.
2. **Card playability highlights** — High impact on UX, reduces rule confusion. Phase 2.
3. **Mobile card category UI** — Fixes v1.0 pain point with large hands. Phase 3.
4. **Host settings (round time)** — Enables playgroup customization. Phase 4.
5. **Discord Activity integration** — Milestone goal, expands platform reach. Phase 5.

**Defer to v2.1 if time-constrained:**
- Separate music vs SFX controls (v2.0 only has SFX, single toggle sufficient)
- Advanced host settings beyond round time (house rules, game variants)
- Spectator mode for Discord Activity (not in v1.0, adds complexity)

**Explicitly out of scope for v2.0:**
- Animated playability highlights (pulse effect) — static glow is sufficient
- Smart card recommendations (AI suggesting best play) — high complexity, unclear value
- Voice chat integration — Discord already provides this
- Card animation improvements — v1.0 animations work, not priority
- Accessibility features (screen reader, keyboard nav) — important but defer to dedicated phase

## Research Gaps and Validation Needs

**MEDIUM confidence areas (need phase-specific research or prototyping):**

1. **Discord Activity proxy networking** — Multiple approaches exist (Discord built-in proxy, server relay, same-origin hosting). V1.0 uses direct WebSocket to server. Discord Activity must use `/.proxy/` prefix. Need to test:
   - Does existing Bun WebSocket server work through Discord proxy unchanged?
   - Do URL mappings in Discord Developer Portal work as expected?
   - Does localhost testing with cloudflared accurately reflect production behavior?

2. **Mobile card grid layout** — Optimal grid size (2x3? 3x3?) depends on card design and screen size. Need testing:
   - Test on real iOS and Android devices (not just DevTools)
   - Validate 60px tap targets work with 10+ cards
   - Check portrait mode on various screen sizes (375px to 428px wide)

3. **Playability highlight colors** — Need to validate colors work in light/dark mode:
   - Green glow visibility on dark background (current Tailwind theme)
   - Grayscale filter on disabled cards (does it look disabled or broken?)
   - Color blindness considerations (green/red is bad combo, use shapes too?)

**HIGH confidence areas (no additional research needed):**

- **Sound mute toggle** — Standard pattern, @vueuse/sound handles complexity
- **Category threshold logic** — Trivial conditional, no unknowns
- **Host settings UI** — Standard form with validation, well-understood
- **Discord SDK initialization** — Official SDK, clear documentation
- **Platform detection** — Straightforward iframe + URL param check

**Validation approach:**

1. **Phase 1 (Sound Mute)** — Build and test, no research needed
2. **Phase 2 (Playability Highlights)** — Prototype color scheme with mock game state, test on mobile devices for visibility
3. **Phase 3 (Mobile Categories)** — Build with configurable threshold (5, 7, 10), test with friends to find sweet spot
4. **Phase 4 (Host Settings)** — Straightforward, no unknowns
5. **Phase 5 (Discord Activity)** — Prototype minimal example (SDK ready() + OAuth2 + WebSocket via proxy) BEFORE building full integration. Validates proxy networking assumptions early.

## Sources

### Mobile Card Game UX Patterns
- [Patterns of Card UI Design (Chris Tse)](https://talks.ui-patterns.com/videos/patterns-of-card-ui-design-chris-tse) — Visual hierarchy, interactivity patterns
- [The Card Games UI Design of Fairtravel Battle](https://gdkeys.com/the-card-games-ui-design-of-fairtravel-battle/) — Category systems, large hand management
- [5 UX/UI Lessons from Designing a Card Game](https://medium.com/@acbassettone/5-ux-ui-lessons-from-designing-a-card-game-b689d3f3187) — Touch interactions, mobile constraints
- [Game UI Database - Hearthstone](https://www.gameuidatabase.com/gameData.php?id=628) — Mobile layout differences, playability indicators
- [MTG Arena on Mobile FAQs](https://magic.wizards.com/en/news/mtg-arena/mtg-arena-mobile-faqs-2021-01-28) — Known pain points (finicky card selection)
- [Game UX: Marvel Snap UX Redesign](https://curaxuan.com/game-ux-marvel-snap-ux-redesign/) — Holographic UI, visual hierarchy

### Discord Activity Integration
- [Discord Embedded App SDK GitHub](https://github.com/discord/embedded-app-sdk) — Official SDK, examples
- [Embedded App SDK Reference](https://discord.com/developers/docs/developer-tools/embedded-app-sdk) — API documentation
- [Discord Activities Networking Guide](https://docs.discord.com/developers/activities/development-guides/networking) — Proxy, URL mappings, CSP
- [Colyseus + Discord Embedded SDK](https://colyseus.io/blog/discord-embedded-sdk/) — Multiplayer integration patterns
- [Playroom Kit for Discord Activities](https://docs.joinplayroom.com/components/discord) — Alternative state sync approach
- [Robo.js Multiplayer Guide](https://robojs.dev/discord-activities/multiplayer) — React-specific patterns
- [Discord Chess in the Park FAQ](https://support-apps.discord.com/hc/en-us/articles/26502048134551-Discord-Chess-in-the-Park-FAQ) — Example 2-player Activity

### Card Playability Indicators
- [Board Game Iconography: Smart Symbols](https://mindclashgames.com/board-game-iconography-how-smart-symbols-enhance-ux-and-playability/) — Visual communication patterns
- [Card Game UI/UX Design: Elevating Player Experience](https://www.gunslingersnft.com/post/card-game-ui-ux-design-elevating-player-experience) — Highlight patterns, interactivity
- [6 Tips For Improving The User Interface Of Your Game](https://punchev.com/blog/6-tips-for-improving-the-user-interface-of-your-game) — Size, scale, color contrast

### Sound & Settings UI
- [Making Good-sounding Audio for Mobile Games](https://www.gamedeveloper.com/audio/making-good-sounding-audio-for-mobile-games) — Separate music vs SFX, mute patterns
- [Sound Advice: A Quick Guide to Designing UX Sounds](https://www.toptal.com/designers/ux/ux-sounds-guide) — Frequency, duration, warmth
- [Mobile Game UI/UX Top 10 Best Practices](https://www.linkedin.com/pulse/mobile-game-uiux-top-10-best-practices-troy-dunniway) — Settings placement, consistency
- [Best UI Design Practices for Mobile Apps in 2026](https://uidesignz.com/blogs/mobile-ui-design-best-practices) — User-first design, minimal friction

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Mobile card categorization | **HIGH** | Well-established pattern with multiple examples (Hearthstone, MTG Arena). Threshold concept validated. |
| Discord Activity SDK usage | **HIGH** | Official SDK with clear documentation. OAuth2 flow standard. Examples available. |
| Playability highlights | **HIGH** | Standard pattern in digital card games. Implementation straightforward. |
| Sound/settings UI | **HIGH** | Established conventions, simple implementation, @vueuse/sound handles complexity. |
| Dual-mode architecture | **MEDIUM-HIGH** | Pattern is sound (adapter + abstraction), but untested with v1.0 codebase. Risk of scope creep. |
| Discord proxy networking | **MEDIUM** | Conceptually clear (relative URLs, URL mappings), but v1.0 uses direct WebSocket. Need to validate proxy compatibility with Bun server. |
| Mobile grid layout | **MEDIUM** | Concept validated, but optimal grid size needs device testing. 2x3 vs 3x3 TBD. |

**Overall confidence: HIGH**

Feature landscape is well-researched. Implementation patterns are proven. Primary risk is Discord proxy networking compatibility with existing Bun WebSocket server (needs Phase 5 prototyping to validate).

---

**Research complete. Ready for roadmap creation.**
