# Phase 2: WebSocket Infrastructure & Room Management - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Players can create and join rooms via shareable codes with real-time WebSocket communication. This covers the lobby system: room creation, joining via codes, seeing who's in the room, and the host starting the game. Actual game logic, card dealing, and gameplay are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Room Creation Flow
- Landing page shows nickname field + Create/Join options all on one screen
- Nickname is entered once on the landing page, then used for either create or join
- No room options or settings — just create and go (always 2-4 players, standard rules)
- After creating, show the room code prominently AND a shareable URL to send to friends

### Join Experience
- Room code format: Claude's discretion (balance usability and uniqueness)
- Shared link behavior: Claude's discretion (auto-fill vs straight to lobby)
- Nicknames: keep it simple — basic length limit, no complex rules
- Invalid/full room: simple error message ("Room is full" / "Game already started"), stay on join screen

### Lobby & Player List
- Simple vertical list of nicknames, host marked with a crown/star icon
- No ready-up system — host decides when to start
- No chat — players are already on a call or texting
- When a player leaves the lobby, they just disappear from the list (no notification)

### Game Start Trigger
- Minimum 2 players to start (1v1 allowed)
- Short countdown (3-5 seconds) after host clicks start
- Start button disabled until minimum players met, with hint like "Waiting for players..."
- No room idle timeout — room stays open until host leaves or game starts

### Claude's Discretion
- Room code format and length
- Shared link join flow (auto-fill code vs direct to nickname entry)
- Exact UI layout and spacing
- WebSocket message protocol design
- Room state management architecture
- Error state handling beyond the specified cases

</decisions>

<specifics>
## Specific Ideas

- Landing page should feel zero-friction — nickname + two actions, nothing else
- Room code + shareable link after creation — friends should be able to join either way
- Keep the lobby dead simple — it's a waiting room, not a social space

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-websocket-infrastructure-room-management*
*Context gathered: 2026-02-07*
