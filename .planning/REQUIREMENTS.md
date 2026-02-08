# Requirements: Shithead Online

**Defined:** 2026-02-07
**Core Value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction

## v1 Requirements

### Room Management

- [x] **ROOM-01**: Player can create a room and receive a shareable 6-character code
- [x] **ROOM-02**: Player can join a room by entering a room code
- [x] **ROOM-03**: Player can enter a nickname before joining (no accounts)
- [x] **ROOM-04**: Room supports 2-4 players

### Deck & Dealing

- [x] **DECK-01**: Game uses standard 52-card deck + 2 Jokers (54 cards)
- [x] **DECK-02**: Each player dealt 3 face-down, 3 face-up, 3 hand cards
- [x] **DECK-03**: Remaining cards form draw pile
- [x] **DECK-04**: Dealer rotates clockwise after each hand

### Pre-Game Swap

- [x] **SWAP-01**: Players can swap cards between hand and face-up during 30-second swap phase
- [x] **SWAP-02**: All players swap simultaneously
- [x] **SWAP-03**: Game starts automatically after timer expires

### Core Gameplay

- [x] **PLAY-01**: Turns proceed clockwise
- [x] **PLAY-02**: Player must play card equal to or higher than top of discard pile
- [x] **PLAY-03**: Player can play multiple cards of same value in one turn
- [x] **PLAY-04**: Player draws back up to 3 cards until draw pile is empty
- [x] **PLAY-05**: Player picks up entire discard pile when unable to play
- [x] **PLAY-06**: First player auto-detected by lowest card starting from 3 upward
- [x] **PLAY-07**: After burn, player can play any card on empty pile

### Special Cards

- [x] **SPEC-01**: 2 resets pile and can be played on anything
- [x] **SPEC-02**: 7 follows normal ordering, next player must play <= 7
- [x] **SPEC-03**: 8 is invisible (next player plays on card beneath), stackable
- [x] **SPEC-04**: 10 burns pile, player goes again, cannot win on a 10
- [x] **SPEC-05**: Card values: 3 < 4 < 5 < 6 < 7 < 9 < J < Q < K < A < Joker

### Burn Mechanic

- [x] **BURN-01**: 4-of-a-kind on pile burns it, including four 8s (player goes again)
- [x] **BURN-02**: 8s are invisible when counting burns for non-8 cards (e.g., 2,2,2,8,8,2 = burn because four 2s)
- [x] **BURN-03**: 10 burns pile immediately

### Endgame

- [x] **END-01**: When hand empty and draw pile empty, player plays face-up cards
- [x] **END-02**: When face-up cards gone, player plays face-down cards blindly
- [x] **END-03**: If blind face-down card unplayable, player picks up pile (returns to hand phase)
- [x] **END-04**: Player who empties all cards drops out of game
- [x] **END-05**: Last player with cards is the shithead and deals next hand

### Multiplayer

- [x] **MULT-01**: Real-time game state sync via WebSocket
- [x] **MULT-02**: Server-authoritative game state (prevents cheating)
- [x] **MULT-03**: Turn timer (30-60s) with auto-pickup on timeout
- [x] **MULT-04**: Player-specific state views (hide opponent hands and face-down cards)
- [x] **MULT-05**: Reconnection handling with brief wait period
- [x] **MULT-06**: Remove player after disconnect timeout

### User Interface

- [x] **UI-01**: Responsive layout works on mobile and desktop browsers
- [x] **UI-02**: Functional card animations (deal, play, burn)
- [ ] **UI-03**: Clear turn indicators showing whose turn it is
- [ ] **UI-04**: Turn timer countdown visible to all players
- [x] **UI-05**: Card hand display with clear selection state

## v2 Requirements

### Social & Polish

- **SOCL-01**: Quick emotes during gameplay (4-6 reactions)
- **SOCL-02**: Play again / rematch button after game ends
- **SOCL-03**: Sound effects for card plays, burns, turn start
- **SOCL-04**: In-game rules reference page
- **SOCL-05**: Host controls (kick players, start game)

### Advanced

- **ADVN-01**: Spectator mode for watching games
- **ADVN-02**: Chat system during gameplay
- **ADVN-03**: AI opponents for practice mode

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Zero friction — nicknames only, no persistence |
| Public matchmaking | Room codes only, play with friends |
| Native mobile apps | Browser-based only, responsive web |
| Leaderboards / stats tracking | No accounts to track against |
| Tournament mode | Overkill for casual friend game |
| Voice chat | Users have Discord/phone for voice |
| In-game purchases | Free game, no monetization |
| Custom card skins | Polish feature, not core |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROOM-01 | Phase 2 | Complete |
| ROOM-02 | Phase 2 | Complete |
| ROOM-03 | Phase 2 | Complete |
| ROOM-04 | Phase 2 | Complete |
| DECK-01 | Phase 3 | Complete |
| DECK-02 | Phase 3 | Complete |
| DECK-03 | Phase 3 | Complete |
| DECK-04 | Phase 3 | Complete |
| SWAP-01 | Phase 4 | Complete |
| SWAP-02 | Phase 4 | Complete |
| SWAP-03 | Phase 4 | Complete |
| PLAY-01 | Phase 5 | Complete |
| PLAY-02 | Phase 5 | Complete |
| PLAY-03 | Phase 5 | Complete |
| PLAY-04 | Phase 5 | Complete |
| PLAY-05 | Phase 5 | Complete |
| PLAY-06 | Phase 5 | Complete |
| PLAY-07 | Phase 5 | Complete |
| SPEC-01 | Phase 6 | Complete |
| SPEC-02 | Phase 6 | Complete |
| SPEC-03 | Phase 6 | Complete |
| SPEC-04 | Phase 6 | Complete |
| SPEC-05 | Phase 5 | Complete |
| BURN-01 | Phase 6 | Complete |
| BURN-02 | Phase 6 | Complete |
| BURN-03 | Phase 6 | Complete |
| END-01 | Phase 7 | Complete |
| END-02 | Phase 7 | Complete |
| END-03 | Phase 7 | Complete |
| END-04 | Phase 7 | Complete |
| END-05 | Phase 7 | Complete |
| MULT-01 | Phase 2 | Complete |
| MULT-02 | Phase 2 | Complete |
| MULT-03 | Phase 8 | Complete |
| MULT-04 | Phase 9 | Complete |
| MULT-05 | Phase 9 | Complete |
| MULT-06 | Phase 9 | Complete |
| UI-01 | Phase 10 | Complete |
| UI-02 | Phase 10 | Complete |
| UI-03 | Phase 11 | Pending |
| UI-04 | Phase 11 | Pending |
| UI-05 | Phase 10 | Complete |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-08 after Phase 9 completion*
