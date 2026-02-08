---
created: 2026-02-08T10:19
title: Add debug gamestate dev tooling
area: tooling
files:
  - packages/server/src/Room.ts
  - packages/server/src/GameEngine.ts
  - packages/server/src/handlers.ts
---

## Problem

During development and testing, it's tedious to manually create lobbies, add players, and go through the full game flow just to test a specific game phase or scenario. Need a way to quickly:

- Create a lobby with 2-4 bot/fake players instantly
- Start a game with minimal players (skip waiting for joins)
- Jump to specific game phases (swapping, playing, endgame)
- Set up specific card arrangements for testing edge cases (e.g., burn scenarios, last card plays, face-down card phase)

This would speed up manual QA, UAT verification, and debugging significantly.

## Solution

TBD — Some options to consider:
- Dev-only server endpoints/messages (e.g., `debug:create-game`, `debug:set-state`)
- A dev panel in the client UI (only in dev mode) with buttons for common scenarios
- Seed functions that create pre-configured GameState objects at specific phases
- Could gate behind `NODE_ENV=development` or a debug flag
