# Phase 19: Discord Room Management - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete Discord Activity integration with instance ID auto-join, safe area handling, and production deployment. Players in the same Discord voice channel automatically join the same game room without manual codes. Also includes cross-platform room lifecycle improvements (host migration, spectator mode, post-game loop) that apply to both Discord and web.

</domain>

<decisions>
## Implementation Decisions

### Auto-join experience
- Straight to lobby — no loading screen, no name entry (Discord identity already known from Phase 18)
- Room code is fully hidden in Discord — instance ID handles everything behind the scenes
- Connection failures retry silently using existing Phase 16 backoff logic with spinner; no error screen
- When another player opens the Activity, they just appear in the player list — no join toast/notification

### Room lifecycle (applies to BOTH Discord and web)
- First player to join becomes host (same as current web behavior)
- Auto-migrate host: when host disconnects, next player automatically becomes host — both Discord and web
- Room dies immediately when all players disconnect — no persistence window, same as current web behavior
- After game finishes, all players auto-return to lobby for easy rematch — both Discord and web (replaces current "play again" button flow)
- The player who lost the last game (the shithead) gets a 💩 emoji next to their name in the lobby and during gameplay, until a new loser occurs — both Discord and web

### Mid-game arrival (applies to BOTH Discord and web)
- Late joiners spectate the current game — see the public game state (pile, face-up cards, card counts) but NOT other players' hands
- Subtle banner at top or bottom: "Spectating — you'll join next game"
- Existing players see a spectator count indicator (e.g., "👁 1 watching") on the game screen
- When the game ends and everyone returns to lobby, spectators join the lobby as regular players

### Discord visual integration
- Identical look to standalone web — no Discord-specific styling, colors, or fonts
- Safe area handling must work perfectly — no UI cutoff on iPhone notch, Android punch-hole, or home indicator area
- In Discord, hide web-specific lobby elements (room code input, create room button) — auto-join is the only path
- Show Discord avatars next to player names in lobby and during gameplay

### Claude's Discretion
- Technical deployment configuration (HTTPS, URL mappings, Render setup)
- cloudflared tunnel documentation details
- Cookie SameSite/Partitioned configuration
- Safe area CSS implementation approach
- Spectator banner exact styling and positioning
- How spectator count indicator is displayed

</decisions>

<specifics>
## Specific Ideas

- The 💩 emoji for the shithead is core to the game's identity — it should be prominent and fun
- Spectator mode should feel like watching over someone's shoulder (public info only)
- Discord lobby should feel streamlined — no unnecessary UI since everyone auto-joins
- All room lifecycle improvements (host migration, auto-return to lobby, spectator mode, shithead marker) should work identically on both web and Discord

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-discord-room-management*
*Context gathered: 2026-02-18*
