---
phase: quick
plan: 019
subsystem: tooling
tags: [git, line-endings, developer-experience, cross-platform]

requires: []
provides:
  - Cross-platform LF line ending enforcement via .gitattributes
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .gitattributes
  modified: []

decisions:
  - id: quick-019-1
    choice: "Global `* text=auto eol=lf` rule with explicit patterns"
    rationale: "Prevents Windows CRLF commits that break shell scripts, Makefiles, Dockerfiles. Auto-detection with explicit patterns provides comprehensive coverage."
    tradeoffs: "Developers may need to configure their editors to respect .gitattributes. Existing files with CRLF won't be auto-fixed until user runs `git add --renormalize .`"

metrics:
  duration: 25s
  completed: 2026-02-15
---

# Quick Task 019: Add .gitattributes - Enforce LF Line Endings

**One-liner:** Global LF line ending enforcement via .gitattributes with explicit patterns for all project file types

## Context

The project is a cross-platform Bun monorepo (macOS, Linux, Windows). Without line ending normalization, Windows contributors may accidentally commit CRLF line endings, causing:
- Noisy diffs (every line changed)
- Broken shell scripts (.sh files fail on Linux)
- Makefile execution failures
- Dockerfile build issues

## What Was Done

### Task 1: Create .gitattributes with LF enforcement

**Created:** `.gitattributes` at project root

**Rules:**
1. **Global default:** `* text=auto eol=lf` — normalizes all text files to LF on commit and checkout
2. **Explicit text patterns:** TypeScript, JavaScript, Vue, CSS, HTML, JSON, YAML, TOML, Markdown, shell scripts, environment files, Makefiles, Dockerfiles, Terraform/HCL files, Git/editor config files, lock files
3. **Binary patterns:** Images (PNG, JPG, GIF, ICO, WebP, SVG), fonts (WOFF, TTF, EOT), archives (ZIP, TAR.GZ)

**Verification:**
- `git check-attr text eol -- Makefile` → `text: set, eol: lf` ✓
- `git check-attr text eol -- packages/client/src/App.vue` → `text: set, eol: lf` ✓
- `git check-attr text eol -- packages/server/src/index.ts` → `text: set, eol: lf` ✓

**Commit:** `dbff100`

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create .gitattributes with LF enforcement | dbff100 | .gitattributes |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

**1. SVG files marked as binary**
- Decision: Treat SVG as binary despite being XML text
- Rationale: Safer to avoid potential line ending issues with mixed-content SVGs
- Impact: SVG diffs will show as binary changes, not text diffs

**2. No automatic renormalization**
- Decision: Do NOT run `git add --renormalize .` during task execution
- Rationale: Existing files may have intentional CRLF (unlikely but possible). Let user decide when to renormalize.
- User action: If desired, run `git add --renormalize . && git commit -m "chore: normalize line endings"`

## Next Phase Readiness

**Immediate benefits:**
- All future commits will have LF line endings
- Windows contributors can safely contribute without breaking builds
- Shell scripts, Makefiles, Dockerfiles protected from CRLF corruption

**Optional follow-up:**
- User can run `git add --renormalize .` to fix existing files with CRLF (check diff first)
- `.editorconfig` could be added to enforce LF at editor level (complementary to .gitattributes)

## Self-Check: PASSED

Created files:
- .gitattributes ✓

Commits:
- dbff100 ✓
