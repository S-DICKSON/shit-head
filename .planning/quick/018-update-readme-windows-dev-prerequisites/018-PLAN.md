---
phase: quick
plan: 018
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
autonomous: true

must_haves:
  truths:
    - "Windows developers can find clear guidance on running Make commands"
    - "Multiple options are presented (WSL, Chocolatey, direct docker compose)"
    - "The recommended approach (WSL) is clearly identified"
    - "Existing README structure and tone are preserved"
  artifacts:
    - path: "README.md"
      provides: "Windows development prerequisites section"
      contains: "Windows"
  key_links: []
---

<objective>
Update README.md prerequisites section to add Windows development guidance. The Makefile-based workflow does not work out of the box on Windows since `make` is a Unix tool. Windows developers need clear instructions on how to use the project's Make-based workflow.

Purpose: Remove friction for Windows developers who clone the repo and find `make dev` does not work.
Output: Updated README.md with a Windows-specific subsection under Prerequisites.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@README.md
@Makefile
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Windows development guidance to README</name>
  <files>README.md</files>
  <action>
Add a "Windows Users" subsection inside the existing "Prerequisites" section, placed after the current bullet list (Docker, Git). The new subsection should cover three options in order of recommendation:

**Option A: WSL (Recommended)**
- Best option because the project runs everything in Docker containers, and WSL 2 integrates natively with Docker Desktop for Windows.
- Install: Open PowerShell as Administrator and run `wsl --install`. This installs Ubuntu by default.
- Requires Windows 10 version 2004+ or Windows 11.
- After WSL is installed, clone and run the project from within WSL. All `make` commands work natively.
- Docker Desktop's WSL 2 backend should be enabled (it is by default on new installs).

**Option B: Install Make via Chocolatey**
- If you prefer working from PowerShell/CMD without WSL.
- Install Chocolatey (https://chocolatey.org/install), then run `choco install make`.
- After install, `make dev`, `make test`, etc. work from PowerShell.

**Option C: Run Docker Compose directly**
- If you do not want to install Make at all, every Makefile target is a thin wrapper around `docker compose`. You can run the underlying commands directly.
- Provide a small table mapping the most common make targets to their raw docker compose equivalents. Only include: `make dev`, `make test`, `make lint`, `make type-check`, `make clean`. Derive the commands from the actual Makefile content.

Keep the tone concise and consistent with the existing README style (short sentences, code blocks, no fluff). Use a `#### Windows Users` heading level (one level below Prerequisites). Do NOT restructure or rewrite any other part of the README.
  </action>
  <verify>
Read the updated README.md and confirm:
1. The Windows section exists under Prerequisites
2. All three options are listed with correct commands
3. The docker compose equivalents match the actual Makefile targets
4. No other sections of the README were modified
  </verify>
  <done>README.md contains a clear, accurate Windows development section with WSL (recommended), Chocolatey, and direct docker compose options. Existing content is untouched.</done>
</task>

</tasks>

<verification>
- Read README.md and confirm the Windows section is present and accurate
- Verify the docker compose commands listed match the actual Makefile (cross-reference Makefile)
- Confirm no unrelated changes to the README
</verification>

<success_criteria>
- Windows developers can follow the README to get `make` commands working via WSL, Chocolatey, or raw docker compose
- Three clear options presented with WSL marked as recommended
- Docker compose equivalents are correct (match actual Makefile targets)
- README tone and structure preserved
</success_criteria>

<output>
After completion, create `.planning/quick/018-update-readme-windows-dev-prerequisites/018-SUMMARY.md`
</output>
