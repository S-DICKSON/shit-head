# Phase 13: ESLint Setup & Fixes - Research

**Researched:** 2026-02-08
**Domain:** ESLint configuration for TypeScript + Vue 3 monorepo
**Confidence:** HIGH

## Summary

ESLint 9+ with flat config (eslint.config.js) is the current standard, replacing legacy .eslintrc files. For this Bun monorepo project with TypeScript, Vue 3, and three packages (server, client, shared), the recommended approach is:

1. **typescript-eslint v8** with the new Project Service for typed linting (zero monorepo config required)
2. **eslint-plugin-vue v10.7** with flat config support for Vue 3 + TypeScript
3. **@vue/eslint-config-typescript v14.6** for official Vue + TypeScript integration
4. **Shared config pattern** with per-package eslint.config.js files importing from a root or shared config

The flat config system provides better monorepo support with config resolution from subdirectories. typescript-eslint v8's `projectService` eliminates the need for special tsconfig.eslint.json files in monorepos, automatically detecting and using existing tsconfig.json files.

**Primary recommendation:** Use flat config format, typescript-eslint v8 with projectService, and create a shared ESLint configuration that all three packages extend. This ensures consistency while allowing per-package customization for client-specific Vue rules and server/shared-specific Node.js rules.

## Standard Stack

The established libraries/tools for ESLint in TypeScript + Vue 3 monorepos:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| eslint | ^9.18.0+ | Linting engine | Industry standard, v9 stabilized flat config |
| typescript-eslint | ^8.54.0+ | TypeScript linting | Official TypeScript + ESLint integration, v8 adds Project Service |
| eslint-plugin-vue | ^10.7.0+ | Vue.js linting | Official Vue.js ESLint plugin, flat config support |
| @vue/eslint-config-typescript | ^14.6.0+ | Vue + TS integration | Official create-vue default, combines Vue + TypeScript rules |
| globals | ^15.0.0+ | Environment globals | ESLint-recommended way to define browser/node globals in flat config |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @eslint/js | Latest | JS recommended rules | Base configuration for all projects |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| typescript-eslint v8 | typescript-eslint v7 | v7 lacks Project Service, requires manual tsconfig.eslint.json in monorepos |
| Flat config | .eslintrc (legacy) | Legacy format deprecated, will be removed in ESLint v10 |
| @vue/eslint-config-typescript | Manual plugin config | Manually combining eslint-plugin-vue + typescript-eslint is more complex |

**Installation:**
```bash
# Root workspace (for shared config)
bun add -d eslint @eslint/js typescript-eslint eslint-plugin-vue @vue/eslint-config-typescript globals

# Already has minimal packages, but needs full stack:
# - Client has eslint in scripts but may not have all packages
# - Server and shared need ESLint added
```

## Architecture Patterns

### Recommended Project Structure

For a Bun monorepo with three packages:

```
/
├── eslint.config.js         # Root config (optional, for workspace-level files)
├── packages/
│   ├── client/
│   │   └── eslint.config.js # Extends root, adds Vue-specific rules
│   ├── server/
│   │   └── eslint.config.js # Extends root, adds Node-specific rules
│   └── shared/
│       └── eslint.config.js # Extends root, pure TypeScript rules
```

### Pattern 1: Flat Config with TypeScript + Vue

**What:** ESLint 9 flat config combining TypeScript-aware linting with Vue SFC support

**When to use:** All modern Vue 3 + TypeScript projects

**Example:**
```typescript
// packages/client/eslint.config.js
// Source: https://eslint.vuejs.org/user-guide/
import pluginVue from 'eslint-plugin-vue'
import typescriptEslint from 'typescript-eslint'
import globals from 'globals'

export default typescriptEslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts'] },
  {
    extends: [
      ...typescriptEslint.configs.recommended,
      ...pluginVue.configs['flat/recommended'],
    ],
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        parser: typescriptEslint.parser,
        projectService: true, // NEW in v8 - auto-detects tsconfig.json
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
  }
)
```

### Pattern 2: Monorepo Shared Configuration

**What:** Root-level or shared package config that other packages extend

**When to use:** Monorepos where all packages share baseline rules

**Example:**
```javascript
// Root or packages/shared/eslint.config.js
import js from '@eslint/js'
import typescriptEslint from 'typescript-eslint'

export const baseConfig = typescriptEslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', '**/*.tsbuildinfo'] },
  js.configs.recommended,
  ...typescriptEslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  }
)

// packages/server/eslint.config.js
import { baseConfig } from '../../eslint.config.js'
import globals from 'globals'

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]
```

### Pattern 3: Per-Package Execution

**What:** Running ESLint separately in each package rather than from root

**When to use:** Monorepos with different lint rules per package, better CI parallelization

**Example:**
```makefile
# Makefile
lint: ## Run linter across all packages
	cd packages/client && bun run lint
	cd packages/server && bun run lint
	cd packages/shared && bun run lint

lint-fix: ## Auto-fix linting issues
	cd packages/client && bun run lint:fix
	cd packages/server && bun run lint:fix
	cd packages/shared && bun run lint:fix
```

```json
// packages/*/package.json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

### Anti-Patterns to Avoid

- **Using .eslintrc format:** Deprecated, will be removed in ESLint v10
- **Creating tsconfig.eslint.json in monorepos:** Unnecessary with typescript-eslint v8 projectService
- **Forgetting `parserOptions.parser` for Vue:** Must use `parserOptions.parser: typescriptEslint.parser` instead of top-level `parser` to avoid conflict with vue-eslint-parser
- **Not setting tsconfigRootDir:** Can cause typescript-eslint to find wrong tsconfig.json in monorepos
- **Using metadata cache strategy in CI:** Git doesn't preserve file mtimes, use `--cache-strategy content` instead
- **Wide glob patterns in parserOptions.project:** Avoid `**` patterns, prefer single `*` for performance

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Combining Vue + TypeScript linting | Manual plugin + parser config | @vue/eslint-config-typescript | Official integration handles all edge cases with Vue SFCs and TypeScript |
| Typed linting in monorepo | Custom tsconfig.eslint.json per package | typescript-eslint v8 projectService | Auto-detects project references, significantly faster |
| Environment globals (browser/node) | Manually listing globals | globals package | Maintained list of all standard globals, ESLint-recommended approach |
| Monorepo config sharing | Copying config to each package | Shared config + extends | One source of truth, easier maintenance |
| Auto-fixing in CI | Custom scripts to detect + fix | ESLint --fix with proper caching | Built-in, optimized, well-tested |

**Key insight:** ESLint v9 and typescript-eslint v8 represent major architectural improvements specifically for monorepos and TypeScript projects. The new Project Service API eliminates most monorepo-specific configuration complexity.

## Common Pitfalls

### Pitfall 1: Plugin Compatibility with Flat Config

**What goes wrong:** Many third-party ESLint plugins haven't updated to flat config format, causing errors like "TypeError: context.getScope is not a function"

**Why it happens:** Flat config uses a different plugin API than .eslintrc format

**How to avoid:**
- Stick to well-maintained official plugins (eslint-plugin-vue, typescript-eslint)
- Check plugin documentation for flat config support before installing
- Use FlatCompat utility from @eslint/eslintrc for legacy plugins if absolutely necessary

**Warning signs:** Plugin documentation only shows .eslintrc examples, no flat config examples

### Pitfall 2: Ignores Configuration in Flat Config

**What goes wrong:** Using old .eslintignore patterns or wrong ignores syntax causes files not to be ignored or everything to be ignored

**Why it happens:** Flat config uses different ignore syntax - `ignores` in a separate config object without other properties

**How to avoid:**
```javascript
// CORRECT
export default [
  { ignores: ['**/dist/**', '**/node_modules/**'] }, // Standalone object
  {
    files: ['**/*.ts'],
    rules: { /* ... */ }
  }
]

// WRONG - ignores in same object as other properties affects only that config
export default [
  {
    ignores: ['**/dist/**'], // Only applies to this config object
    files: ['**/*.ts'],
    rules: { /* ... */ }
  }
]
```

**Warning signs:** node_modules or dist directories still being linted

### Pitfall 3: parserOptions.parser in Vue Projects

**What goes wrong:** Using top-level `parser` instead of `parserOptions.parser` causes conflicts with vue-eslint-parser

**Why it happens:** Vue SFC files need vue-eslint-parser to parse template sections, but TypeScript code needs @typescript-eslint/parser

**How to avoid:**
```javascript
// CORRECT
languageOptions: {
  parserOptions: {
    parser: typescriptEslint.parser, // Nested in parserOptions
  },
}

// WRONG
languageOptions: {
  parser: typescriptEslint.parser, // Top-level conflicts with Vue parser
}
```

**Warning signs:** ESLint errors about parser conflicts or Vue template syntax errors

### Pitfall 4: ESLint Cache Strategy in CI

**What goes wrong:** Using default cache strategy (metadata) in CI results in cache misses on every run

**Why it happens:** Git doesn't preserve file modification times, so metadata-based caching fails

**How to avoid:**
- Use `--cache --cache-strategy content` in CI
- Note: typescript-eslint typed linting evaluates all files, so caching provides limited benefit
- Cache location should be persisted between CI runs

**Warning signs:** ESLint runs slowly on every CI run despite caching being enabled

### Pitfall 5: Linting Only Changed Files

**What goes wrong:** Running ESLint only on changed files misses cross-file type errors when using typed linting

**Why it happens:** TypeScript type checking requires evaluating relationships between files

**How to avoid:**
- Always lint all files in CI for quality checks
- Can use `--cache` to speed up local development
- For very large monorepos, consider linting per package rather than filtering files

**Warning signs:** CI passes but full local lint fails with type errors

### Pitfall 6: Not Configuring tsconfigRootDir in Monorepo

**What goes wrong:** typescript-eslint uses wrong tsconfig.json file or fails to find project configuration

**Why it happens:** Without tsconfigRootDir, typescript-eslint searches from CWD, which may not be package root

**How to avoid:**
```javascript
// In packages/client/eslint.config.js
languageOptions: {
  parserOptions: {
    projectService: true,
    tsconfigRootDir: import.meta.dirname, // Points to packages/client
  },
}
```

**Warning signs:** ESLint can't find tsconfig.json, or uses root tsconfig instead of package-specific one

## Code Examples

Verified patterns from official sources:

### Complete Client (Vue + TypeScript) Configuration

```typescript
// packages/client/eslint.config.js
// Source: https://eslint.vuejs.org/user-guide/ + https://typescript-eslint.io/getting-started/
import pluginVue from 'eslint-plugin-vue'
import typescriptEslint from 'typescript-eslint'
import globals from 'globals'

export default typescriptEslint.config(
  // Global ignores (must be in standalone object)
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts'] },

  // Base TypeScript + Vue rules
  {
    extends: [
      ...typescriptEslint.configs.recommended,
      ...pluginVue.configs['flat/recommended'],
    ],
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        parser: typescriptEslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
  },

  // Test files can have looser rules
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
)
```

### Complete Server (TypeScript + Node) Configuration

```typescript
// packages/server/eslint.config.js
import js from '@eslint/js'
import typescriptEslint from 'typescript-eslint'
import globals from 'globals'

export default typescriptEslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts'] },
  js.configs.recommended,
  ...typescriptEslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node, // CommonJS + Node built-ins
      },
    },
  }
)
```

### Complete Shared Package Configuration

```typescript
// packages/shared/eslint.config.js
import js from '@eslint/js'
import typescriptEslint from 'typescript-eslint'

export default typescriptEslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', '**/*.tsbuildinfo'] },
  js.configs.recommended,
  ...typescriptEslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }
)
```

### Makefile Integration

```makefile
# Source: https://github.com/ActivityWatch/aw-webui/commit/3ea66bb
lint: ## Run linter across all packages
	cd packages/client && bun run lint
	cd packages/server && bun run lint
	cd packages/shared && bun run lint

lint-fix: ## Auto-fix linting issues across all packages
	cd packages/client && bun run lint:fix
	cd packages/server && bun run lint:fix
	cd packages/shared && bun run lint:fix
```

### Package.json Scripts

```json
// packages/*/package.json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

### GitHub Actions CI Integration

```yaml
# .github/workflows/ci.yml
# Source: https://github.com/eslint/eslint/discussions/16997
- name: Lint server
  run: cd packages/server && bun run lint

- name: Lint client
  run: cd packages/client && bun run lint

- name: Lint shared
  run: cd packages/shared && bun run lint
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| .eslintrc.* files | eslint.config.js (flat config) | ESLint 8.21 (2022), mandatory v10+ | Better module resolution, no plugin loading hacks needed |
| parserOptions.project array | parserOptions.projectService | typescript-eslint v8 (2024) | Zero monorepo config, faster typed linting, auto-detects project refs |
| @typescript-eslint/parser + @typescript-eslint/eslint-plugin | typescript-eslint (unified package) | typescript-eslint v8 | Simpler installation, single import |
| Manual eslint-plugin-vue + parser setup | @vue/eslint-config-typescript | v13+ (2023) | Official integration, less config boilerplate |
| env: { browser: true, node: true } | languageOptions.globals with globals package | ESLint 9 | More explicit, better control, no preset environments |

**Deprecated/outdated:**
- **.eslintrc format**: Will be removed in ESLint v10, use flat config now
- **tsconfig.eslint.json in monorepos**: Unnecessary with projectService, adds maintenance burden
- **@eslint/eslintrc FlatCompat**: Only needed for legacy plugins, avoid if possible
- **--env CLI flag**: Removed in ESLint 9, use languageOptions.globals instead

## Open Questions

Things that couldn't be fully resolved:

1. **Should root workspace have its own eslint.config.js?**
   - What we know: ESLint searches up directory tree for config files
   - What's unclear: Whether root config is needed/beneficial for workspace-level files like top-level scripts
   - Recommendation: Start without root config, add only if linting workspace-level files becomes necessary

2. **Cache effectiveness with typescript-eslint typed linting**
   - What we know: Typed linting evaluates all files, limiting cache effectiveness
   - What's unclear: Actual performance impact in this small monorepo
   - Recommendation: Enable caching anyway for non-typed rules, measure impact in practice

3. **Strict vs recommended configs**
   - What we know: typescript-eslint offers both `recommended` and `strict` configs
   - What's unclear: Whether strict rules would catch real issues or create noise in this codebase
   - Recommendation: Start with `recommended`, optionally upgrade to `strict` after initial fixes

## Sources

### Primary (HIGH confidence)
- [ESLint Configuration Files Documentation](https://eslint.org/docs/latest/use/configure/configuration-files) - Flat config format specification
- [typescript-eslint Getting Started](https://typescript-eslint.io/getting-started/) - Official setup guide
- [typescript-eslint Monorepo Configuration](https://typescript-eslint.io/troubleshooting/typed-linting/monorepos/) - Monorepo-specific guidance
- [eslint-plugin-vue User Guide](https://eslint.vuejs.org/user-guide/) - Vue + TypeScript integration
- [Announcing typescript-eslint v8](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8/) - Project Service announcement
- [@vue/eslint-config-typescript GitHub](https://github.com/vuejs/eslint-config-typescript) - Official Vue + TS config package
- [ESLint Configure Language Options](https://eslint.org/docs/latest/use/configure/language-options) - Globals configuration

### Secondary (MEDIUM confidence)
- [ESLint in a Monorepo](https://gregory-gerard.dev/articles/eslint-in-a-monorepo) - Shared config patterns
- [Using flat config in monorepo](https://github.com/eslint/eslint/discussions/16960) - ESLint team guidance
- [ESLint Ignore Files Documentation](https://eslint.org/docs/latest/use/configure/ignore) - Ignore patterns in flat config
- [TypeScript-ESLint Shared Configs](https://typescript-eslint.io/users/configs/) - Recommended vs strict explained
- [ESLint Cache in CI](https://github.com/eslint/eslint/discussions/16997) - GitHub Actions caching strategy

### Tertiary (LOW confidence)
- [Turborepo ESLint Guide](https://turbo.build/repo/docs/handbook/linting/eslint) - Monorepo patterns (Turborepo-specific)
- Various Medium/DEV.to articles on ESLint 9 migration - Community experiences

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official packages with verified versions from npm/GitHub
- Architecture: HIGH - Patterns from official documentation and ESLint/typescript-eslint maintainers
- Pitfalls: MEDIUM-HIGH - Combination of official docs and verified community issues
- Code examples: HIGH - All examples derived from official documentation

**Research date:** 2026-02-08
**Valid until:** ~90 days (stable tooling, but fast-moving ecosystem)

**Notes:**
- Client package already has `lint` script, but may be incomplete/outdated configuration
- Current CI already runs `bun run lint` on client only
- No ESLint config files found in project root or packages (node_modules .eslintrc files don't count)
- Makefile already has `lint` target but only runs on client, needs expansion
