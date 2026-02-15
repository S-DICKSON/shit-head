---
phase: quick
plan: 019
type: execute
wave: 1
depends_on: []
files_modified:
  - .gitattributes
autonomous: true

must_haves:
  truths:
    - "All text files are normalized to LF on commit regardless of developer OS"
    - "Binary files are not mangled by line ending conversion"
  artifacts:
    - path: ".gitattributes"
      provides: "Line ending normalization rules"
      contains: "* text=auto eol=lf"
  key_links: []
---

<objective>
Add a .gitattributes file to enforce LF line endings across the entire project.

Purpose: Prevent Windows contributors from accidentally committing CRLF line endings, which cause noisy diffs and can break shell scripts, Makefiles, and Dockerfiles.
Output: A .gitattributes file at the project root with comprehensive rules for all file types in this Bun monorepo.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create .gitattributes with LF enforcement</name>
  <files>.gitattributes</files>
  <action>
Create `.gitattributes` at the project root with these rules:

1. Global default: `* text=auto eol=lf` — normalize all text files to LF on commit and checkout.

2. Explicit text file patterns (reinforces auto-detection for known types):
   - `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.cjs` — TypeScript/JavaScript
   - `*.vue` — Vue single-file components
   - `*.css` — Stylesheets
   - `*.html` — HTML templates
   - `*.json`, `*.jsonc` — JSON config files
   - `*.yaml`, `*.yml` — YAML files
   - `*.toml` — TOML config (bunfig.toml)
   - `*.md`, `*.MD` — Markdown (project uses README.MD with uppercase)
   - `*.txt` — Text files
   - `*.sh` — Shell scripts
   - `*.env`, `*.env.*` — Environment files
   - `Makefile` — Make build files
   - `Dockerfile*` — Docker build files
   - `*.tf` — OpenTofu/Terraform files
   - `*.hcl` — HCL config files
   - `.gitattributes`, `.gitignore`, `.editorconfig` — Git/editor config
   - `*.lock` — Lock files (bun.lock)

   All with `text eol=lf`.

3. Binary file patterns (prevent Git from mangling these):
   - `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.ico`, `*.webp`, `*.svg` — Images (note: SVG could be text but safer as binary to avoid issues)
   - `*.woff`, `*.woff2`, `*.ttf`, `*.eot` — Fonts
   - `*.zip`, `*.tar.gz`, `*.tgz` — Archives

   All with `binary`.

4. Add a comment header explaining the purpose.

Do NOT run `git add --renormalize .` — that is a separate concern the user can choose to do manually if needed.
  </action>
  <verify>
Run: `cat .gitattributes` and confirm the file exists with the global `* text=auto eol=lf` rule and explicit patterns for all project file types.
Run: `git check-attr text eol -- Makefile packages/client/src/App.vue packages/server/src/index.ts` and confirm text=auto, eol=lf is applied.
  </verify>
  <done>
.gitattributes exists at project root. All text files will be normalized to LF on commit. Binary files are marked to skip conversion. The global `text=auto eol=lf` rule covers any file types not explicitly listed.
  </done>
</task>

</tasks>

<verification>
- `.gitattributes` exists at project root
- `git check-attr eol -- Makefile` returns `lf`
- `git check-attr text -- packages/server/src/index.ts` returns `auto`
</verification>

<success_criteria>
- .gitattributes file committed to repository
- Global LF enforcement active for all text files
- Binary files excluded from line ending conversion
</success_criteria>

<output>
After completion, create `.planning/quick/019-add-gitattributes-enforce-lf-line-endings/019-SUMMARY.md`
</output>
