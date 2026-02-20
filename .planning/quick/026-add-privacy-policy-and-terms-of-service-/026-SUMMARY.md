---
phase: quick-026
plan: 01
subsystem: ui
tags: [html, static-files, privacy-policy, terms-of-service, discord-verification, vite-public]

# Dependency graph
requires: []
provides:
  - "Static privacy.html served at /privacy.html (7 sections, Discord/GitHub references)"
  - "Static terms.html served at /terms.html (8 sections, Discord/GitHub references)"
  - "Dark green themed legal pages matching game design"
  - "Cross-navigation between pages and back-to-game links"
affects: ["discord-app-verification", "deployment"]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Vite public/ for static files that bypass SPA routing — placed in packages/client/public/ so Vite copies to dist/ at build time, served at real URLs by existing static file handler"]

key-files:
  created:
    - packages/client/public/privacy.html
    - packages/client/public/terms.html
  modified: []

key-decisions:
  - "Self-contained HTML with inline styles only — no external CSS dependencies, no Tailwind required for static pages"
  - "packages/client/public/ placement — Vite copies public/ to dist/ verbatim, server's static file handler serves them at real URLs before SPA fallback"
  - "Current-page nav item rendered as bold text (not link) for accessibility"

patterns-established:
  - "Static legal pages: inline all styles, use game color tokens as hex values (#14532d, #4ade80, #d1d5db)"

# Metrics
duration: 2min
completed: 2026-02-20
---

# Quick Task 026: Privacy Policy and Terms of Service Summary

**Self-contained privacy.html and terms.html static pages with dark green game theme, served at real URLs via Vite public/ directory for Discord app verification**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-20T18:55:22Z
- **Completed:** 2026-02-20T18:56:52Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Created self-contained privacy.html (7 sections) and terms.html (8 sections) with no external CSS dependencies
- Applied dark green theme (#14532d background, #4ade80 links, #d1d5db body text) matching game design
- Verified both files copy to dist/ on `vite build` and are accessible at real URL paths (not hash routes)
- Navigation: cross-links between pages, back-to-game links in header and footer

## Task Commits

Each task was committed atomically:

1. **Task 1: Create privacy policy and terms of service static pages** - `5ec4245` (feat)

**Plan metadata:** _(pending — see final commit)_

## Files Created/Modified
- `packages/client/public/privacy.html` - Privacy policy: Information We Collect, How We Use, Data Storage, Third-Party Services, Children's Privacy, Changes, Contact
- `packages/client/public/terms.html` - Terms of Service: Acceptance, Description, Acceptable Use, Disclaimer of Warranties, Limitation of Liability, Discord, Termination, Changes, Contact

## Decisions Made
- Self-contained HTML with inline styles — Tailwind CSS is a build-time dependency for Vue SPA, not available for plain HTML files in public/; inlining styles is the correct approach for standalone static pages
- packages/client/public/ is the correct location — Vite copies all files from public/ to dist/ at build time, and the server's existing static file handler serves them at real URLs before falling back to index.html SPA
- Current page shown as bold text (not anchor) in navigation — standard accessibility pattern for current-page indicators

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `make build` does not exist in root Makefile (only Docker-based targets). Used `docker compose run --rm client bunx vite build` instead to verify dist/ output. Both static files confirmed present in dist/ after build.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Privacy policy URL ready: `https://splatmonkey.com/privacy.html`
- Terms of Service URL ready: `https://splatmonkey.com/terms.html`
- Submit these URLs to Discord Developer Portal for app verification

---
*Phase: quick-026*
*Completed: 2026-02-20*

## Self-Check: PASSED
