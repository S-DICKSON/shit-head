---
phase: quick-026
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/public/privacy.html
  - packages/client/public/terms.html
autonomous: true
must_haves:
  truths:
    - "Privacy policy accessible at /privacy.html with real URL (not hash route)"
    - "Terms of service accessible at /terms.html with real URL (not hash route)"
    - "Both pages match the game's dark green theme"
    - "Both pages link back to the game and cross-link each other"
  artifacts:
    - path: "packages/client/public/privacy.html"
      provides: "Privacy policy page"
    - path: "packages/client/public/terms.html"
      provides: "Terms of service page"
  key_links:
    - from: "packages/client/public/privacy.html"
      to: "/"
      via: "anchor tag back to game"
    - from: "packages/client/public/terms.html"
      to: "/"
      via: "anchor tag back to game"
---

<objective>
Create static privacy policy and terms of service HTML pages for Discord app verification.

Purpose: Discord requires privacy policy and ToS URLs for app verification. These must be real URLs (not hash routes), so they go in `packages/client/public/` which Vite copies to `dist/` at build time. The server already serves static files from `dist/` before SPA fallback.

Output: Two production-ready HTML files served at `https://splatmonkey.com/privacy.html` and `https://splatmonkey.com/terms.html`
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/index.html
@packages/server/src/index.ts (lines 175-183 — static file serving)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create privacy policy and terms of service static pages</name>
  <files>packages/client/public/privacy.html, packages/client/public/terms.html</files>
  <action>
Create two self-contained HTML files in `packages/client/public/`. Each page must be fully standalone (no external CSS framework dependencies — inline all styles).

**Shared styling (both pages):**
- Dark green theme matching the game: `background-color: #14532d` (Tailwind green-900), text `#d1d5db` (gray-300)
- Headings in `#f9fafb` (gray-50)
- Max-width container centered (max-width: 768px, padding: 2rem)
- Clean, readable typography: system font stack `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Links styled `#4ade80` (green-400) with underline on hover
- Viewport meta tag matching main app (width=device-width, initial-scale=1.0)
- Page title format: "Privacy Policy | Karma - Splat Monkey" and "Terms of Service | Karma - Splat Monkey"

**Header (both pages):**
- "Karma by Splat Monkey" heading at top
- Navigation links: "Back to Game" (href="/"), "Privacy Policy" (href="/privacy.html"), "Terms of Service" (href="/terms.html")
- Current page link should not be a link (just bold text)

**Footer (both pages):**
- "Last updated: February 2026"
- Link back to game

**privacy.html content:**
- Title: "Privacy Policy"
- Section: "Information We Collect"
  - When playing via Discord Activity: Discord user ID, display name, and avatar hash (provided by Discord SDK)
  - When playing as a guest (web): Only a randomly generated display name (e.g., "Guest 1234")
  - No email addresses, passwords, or personal information collected
- Section: "How We Use Your Information"
  - Display your name and avatar to other players in the game room
  - Manage game sessions and room membership
  - No analytics, tracking, or advertising
- Section: "Data Storage and Retention"
  - All game data is stored in server memory only — nothing written to disk or database
  - Discord access tokens are held in memory only, never persisted
  - No cookies are used
  - All data is automatically deleted when the game session ends or the server restarts
- Section: "Third-Party Services"
  - Discord: If playing via Discord Activity, Discord's own privacy policy applies (link to https://discord.com/privacy)
  - No other third-party services, analytics, or tracking tools
- Section: "Children's Privacy"
  - Service not directed at children under 13; Discord's age requirements apply
- Section: "Changes to This Policy"
  - We may update this policy; changes reflected by "Last updated" date
- Section: "Contact"
  - For questions: link to the GitHub repository (https://github.com/SplatMonkey/shit-head)

**terms.html content:**
- Title: "Terms of Service"
- Section: "Acceptance of Terms"
  - By using Karma, you agree to these terms
- Section: "Description of Service"
  - Free multiplayer card game playable via web browser or as a Discord Activity
  - No account required for web play; Discord Activity uses your Discord account
- Section: "Acceptable Use"
  - Do not exploit bugs or use automated tools to gain unfair advantage
  - Do not harass, abuse, or disrupt other players
  - Do not attempt to access server infrastructure or other players' data
- Section: "Disclaimer of Warranties"
  - Service provided "as is" without warranty of any kind
  - No guarantee of availability, uptime, or data preservation
  - Game sessions may be interrupted by server restarts or maintenance
- Section: "Limitation of Liability"
  - Not liable for any damages arising from use of the service
- Section: "Discord"
  - When using as a Discord Activity, Discord's Terms of Service also apply (link to https://discord.com/terms)
- Section: "Termination"
  - We reserve the right to terminate access for violations of these terms
- Section: "Changes to These Terms"
  - We may update these terms; changes reflected by "Last updated" date
- Section: "Contact"
  - For questions: link to the GitHub repository (https://github.com/SplatMonkey/shit-head)
  </action>
  <verify>
1. `ls packages/client/public/privacy.html packages/client/public/terms.html` — both files exist
2. Verify HTML is valid: each file has DOCTYPE, html, head, body tags
3. `make build` succeeds and files appear in dist: `ls packages/client/dist/privacy.html packages/client/dist/terms.html`
4. Cross-links are correct: privacy links to terms and vice versa, both link back to "/"
  </verify>
  <done>
Both HTML files exist in packages/client/public/, build succeeds with files in dist/, pages use consistent dark green theme with all required content sections, and cross-navigation works between pages and back to game.
  </done>
</task>

</tasks>

<verification>
1. `make build` — client builds successfully with new static files
2. `ls packages/client/dist/privacy.html packages/client/dist/terms.html` — files present in build output
3. Both files are well-formed HTML with matching dark green theme
4. All content sections present (privacy: 7 sections, terms: 8 sections)
5. Cross-links between pages and back-to-game links are correct
</verification>

<success_criteria>
- privacy.html and terms.html exist in packages/client/public/
- Both are self-contained HTML (no external CSS dependencies)
- Dark green theme (bg #14532d) matching the game
- All required content sections present with accurate information
- Navigation: cross-links between pages + back to game
- `make build` passes and files appear in dist/
</success_criteria>

<output>
After completion, create `.planning/quick/026-add-privacy-policy-and-terms-of-service-/026-SUMMARY.md`
</output>
