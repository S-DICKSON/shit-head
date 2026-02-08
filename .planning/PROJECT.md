# Shithead Online

## What This Is

An online multiplayer version of the card game "Shithead" — a browser-based web app where 2-4 players create or join rooms via share codes and play the full game with proper rules. Works on both mobile and desktop. No accounts needed; players pick a nickname and jump in.

## Core Value

Friends can play a complete, rule-accurate game of Shithead together online with zero friction — create a room, share a code, play.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Room system with shareable codes/links for 2-4 players
- [ ] Nickname entry (no accounts)
- [ ] Full card deck: 52 cards + 2 Jokers
- [ ] Dealing: 3 face-down, 3 face-up, 3 in hand, remainder as draw pile
- [ ] Pre-game 30-second simultaneous card swap phase (hand <-> face-up)
- [ ] Turn-based clockwise gameplay with timed turns (30-60s)
- [ ] Auto-pickup pile on turn timeout
- [ ] Card value ordering: 3 < 4 < 5 < 6 < 7 < 9 < J < Q < K < A < Joker
- [ ] Special card: 2 resets pile, playable on anything
- [ ] Special card: 7 follows normal ordering, next player must play <= 7
- [ ] Special card: 8 is invisible (next player plays on card beneath), stackable
- [ ] Special card: 10 burns pile, player goes again, cannot win on a 10
- [ ] Burn mechanic: 4-of-a-kind burns pile (8s are invisible for counting)
- [ ] Play multiple same-value cards in one turn
- [ ] Draw back up to 3 cards until draw pile is empty
- [ ] Pick up entire discard pile when unable to play
- [ ] First player auto-detected: lowest card starting from 3 upward
- [ ] Endgame progression: hand -> face-up cards -> face-down cards (blind flip)
- [ ] Last player with cards is the shithead (loser) and deals next hand
- [ ] Disconnect handling: brief wait, then remove player
- [ ] Dealer rotation clockwise after each hand
- [ ] After burn, player can play any card
- [ ] Clean/modern responsive UI (mobile + desktop)
- [ ] Comprehensive game rules document (RULES.md)

### Out of Scope

- User accounts / authentication — just nicknames, no persistence
- Public matchmaking — room codes only, play with friends
- Chat system — focus on gameplay
- Spectator mode — players only
- Native mobile apps — browser-based only
- Leaderboards / stats tracking — no accounts to track against

## Context

- Shithead (also known as Palace, Karma, etc.) is a popular social card game
- The game rules are well-documented in the project README.md
- Target audience is friend groups who already know the game and want to play online
- Key UX reference: research how popular mobile/desktop card games handle UI and interactions
- The 8's invisibility rule creates interesting burn scenarios (e.g., 2,2,2,8,8,2 = burn because 8s don't count)

## Constraints

- **Platform**: Web app (browser-based) — must work on mobile and desktop browsers
- **Multiplayer**: Real-time multiplayer via WebSockets or similar
- **No backend auth**: No user accounts, no persistent data beyond active game sessions
- **Card deck**: Standard 52-card deck + 2 Jokers (54 cards total)
- **Players**: 2-4 per room

## Verification Requirements

All phases that write code **must** pass linting before completion:
- Run `make lint` and ensure zero errors before considering a phase done
- This applies to all future phases (8+) that produce or modify source code

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Room codes over matchmaking | Friend-focused game, keep it simple | -- Pending |
| No accounts | Zero friction to start playing | -- Pending |
| Web app over native | Cross-platform from day one, accessible via link | -- Pending |
| 30-second swap timer | Keeps pre-game phase moving, consistent for all players | -- Pending |
| Timed turns (30-60s) | Prevents stalling in online play | -- Pending |

---
*Last updated: 2026-02-07 after initialization*
