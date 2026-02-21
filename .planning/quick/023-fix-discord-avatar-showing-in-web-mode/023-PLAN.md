---
phase: quick-023
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/components/OpponentCards.vue
  - packages/client/src/components/DiscordLobby.vue
autonomous: true

must_haves:
  truths:
    - "Web players (Guest XXX) show NO Discord avatar icon next to their name"
    - "Discord players still show their Discord avatar correctly"
    - "Discord players without a custom avatar still show the default Discord avatar"
  artifacts:
    - path: "packages/client/src/components/OpponentCards.vue"
      provides: "Conditional avatar display based on discordUserId"
      contains: "discordUserId"
    - path: "packages/client/src/components/DiscordLobby.vue"
      provides: "Conditional avatar display in lobby player list"
      contains: "discordUserId"
  key_links:
    - from: "OpponentCards.vue v-if"
      to: "opponent.discordUserId"
      via: "template conditional"
      pattern: "v-if.*discordUserId"
---

<objective>
Fix Discord avatar showing for web mode players. Currently, web players (Guest XXX) display a Discord default avatar icon because the server sets `avatarHash: null` for web players, and the conditional `avatarHash !== undefined` passes for `null`. The avatar should only render when the player is actually a Discord user.

Purpose: Web players should see no avatar icon next to their name. Discord players should continue to see their avatars.
Output: Patched OpponentCards.vue and DiscordLobby.vue with correct conditionals.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/components/OpponentCards.vue
@packages/client/src/components/DiscordLobby.vue
@packages/shared/src/types/game.ts
@packages/shared/src/types/room.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix avatar conditional in OpponentCards.vue and DiscordLobby.vue</name>
  <files>
    packages/client/src/components/OpponentCards.vue
    packages/client/src/components/DiscordLobby.vue
  </files>
  <action>
**Root cause:** The server sets `avatarHash: null` (not `undefined`) for web players. In OpponentCards.vue line 10, the condition `v-if="opponent.avatarHash !== undefined"` evaluates to `true` for `null`, so the `<img>` renders. The `getAvatarUrl` function then returns a Discord default avatar URL for `null` hashes. In DiscordLobby.vue line 249-253, there is NO conditional at all -- the avatar `<img>` always renders for every player.

**Fix OpponentCards.vue (line 10):**
Change the v-if from:
```
v-if="opponent.avatarHash !== undefined"
```
to:
```
v-if="opponent.discordUserId"
```
This correctly gates the avatar on whether the player is actually a Discord user. The `discordUserId` field is `null` for web players and a string for Discord players. Using truthiness here is correct -- we want to show the avatar only when discordUserId is a non-empty string.

**Fix DiscordLobby.vue (line 249):**
Add a v-if conditional to the avatar `<img>` tag:
```
v-if="player.discordUserId"
```
This ensures web players in the lobby also don't show a Discord avatar. The DiscordLobby is shared between Discord Activity mode and can theoretically show mixed players.

Do NOT change the `getAvatarUrl` function itself -- it correctly handles null/undefined avatarHash for Discord users who have the default Discord avatar (no custom hash). The issue is purely about WHEN to show the `<img>` element.
  </action>
  <verify>
Run `make lint` to ensure no lint errors. Run `make type-check` to ensure no type errors. Visually inspect the template logic: web players (no discordUserId) should skip the `<img>` entirely.
  </verify>
  <done>
The `<img>` avatar element only renders when the player has a truthy `discordUserId`. Web players (Guest XXX) show no avatar icon. Discord players with or without custom avatars continue to display correctly.
  </done>
</task>

</tasks>

<verification>
- `make lint` passes
- `make type-check` passes
- In OpponentCards.vue, the avatar `<img>` has `v-if="opponent.discordUserId"`
- In DiscordLobby.vue, the avatar `<img>` has `v-if="player.discordUserId"`
- No references to `avatarHash !== undefined` remain as avatar display conditions
</verification>

<success_criteria>
- Web players show name only (no Discord avatar icon)
- Discord players show their Discord avatar (custom or default)
- No type errors or lint warnings introduced
</success_criteria>

<output>
After completion, create `.planning/quick/023-fix-discord-avatar-showing-in-web-mode/023-SUMMARY.md`
</output>
