---
created: 2026-02-09T19:45
title: Fix face-down cards unplayable in endgame
area: general
files:
  - packages/server/src/GameEngine.ts
  - packages/client/src/views/PlayingPhase.vue
  - packages/server/src/websocket/handlers.ts
---

## Problem

When reaching the endgame (hand empty, face-up cards played), the player cannot play any of their face-down cards. The face-down card phase should activate when a player has no hand cards and no face-up cards remaining — they should be able to click a face-down card to play it blind.

This could be a server-side issue (determinePlaySource not transitioning to 'face-down'), a client-side issue (UI not rendering face-down cards as clickable), or a message issue (card-played/face-down-result messages missing data needed for the client to update state correctly).

From Phase 10 gap closure notes: "card-played and pile-pickup messages must include faceUp and faceDownCount — without these, endgame face-down progression never activates on client."

## Solution

TBD — investigate:
1. Check server determinePlaySource logic when hand and faceUp are both empty
2. Check client PlayingPhase.vue face-down card click handling
3. Verify card-played messages include faceUp and faceDownCount fields
4. Test with debug tooling once available
