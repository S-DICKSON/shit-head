# Phase 13: ESLint Setup & Fixes - Research

**Researched:** 2026-02-08
**Domain:** ESLint 9 flat config for TypeScript + Vue 3 monorepo
**Confidence:** HIGH

## Summary

ESLint 9 introduces a modern flat config system (eslint.config.js) that replaces the legacy .eslintrc format. For this Bun monorepo with TypeScript, Vue 3, and multiple packages, the standard approach is:

1. **ESLint 9+ with flat config** - Modern configuration format with explicit imports
2. **typescript-eslint v8** - TypeScript-aware linting with the new "project service" feature
3. **eslint-plugin-vue** - Vue 3 component linting with flat config support
4. **@vue/eslint-config-typescript** - Pre-configured integration for Vue + TypeScript
5. **Monorepo strategy** - Single root config or per-package configs with shared base

The CI already expects ESLint to run (packages/client has `bun run lint` in CI), but ESLint is not yet installed in server or shared packages. The client package has a `lint` script defined but no ESLint config exists.

**Primary recommendation:** Use ESLint 9 flat config at the root with typescript-eslint v8's projectService (zero-config monorepo support), eslint-plugin-vue for client, and per-package configs extending a shared base for maintainability.

## Standard Stack

The established libraries/tools for ESLint in TypeScript + Vue 3 monorepos:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| eslint | 9.x (latest) | Core linting engine | Industry standard, flat config is modern approach |
| typescript-eslint | 8.x | TypeScript parser and rules | Official TypeScript-ESLint integration, v8 has project service for monorepos |
| eslint-plugin-vue | 9.x | Vue component linting | Official Vue.js ESLint plugin, supports Vue 3 + flat config |
| @vue/eslint-config-typescript | 14.x | Vue + TypeScript integration | Official config from Vue team, simplifies setup |
| globals | latest | Global variable definitions | Required for flat config to define browser/node environments |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @eslint/js | latest | Base ESLint recommended rules | Provides js.configs.recommended for baseline |
| @eslint/compat | latest | Legacy plugin compatibility | Only if using old plugins not yet updated for flat config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Flat config | Legacy .eslintrc | .eslintrc is deprecated in ESLint 9, no longer recommended |
| typescript-eslint v8 | v7 or earlier | v7 requires manual monorepo config, v8 has projectService |
| @vue/eslint-config-typescript | Manual plugin + parser setup | Manual setup more complex, official config handles integration |

**Installation:**
```bash
# Root dependencies (for shared configs)
bun add -D eslint @eslint/js typescript-eslint globals

# Client package (Vue-specific)
cd packages/client
bun add -D eslint-plugin-vue @vue/eslint-config-typescript

# Server package (Node/Bun-specific)
cd packages/server
# (uses root eslint + typescript-eslint only)

# Shared package
cd packages/shared
# (uses root eslint + typescript-eslint only)
```

## Architecture Patterns

### Recommended Project Structure
```
/
├── eslint.config.js           # Root config (shared rules, base configs)
├── packages/
│   ├── client/
│   │   └── eslint.config.js   # Extends root + adds Vue rules
│   ├── server/
│   │   └── eslint.config.js   # Extends root + adds Node rules
│   └── shared/
│       └── eslint.config.js   # Extends root (pure TypeScript)
└── .eslintignore              # Global ignores (or use ignores in config)
```

### Pattern 1: Root Config with Shared Base
**What:** Create a root eslint.config.js that defines shared rules, then have per-package configs extend it
**When to use:** Monorepos with different linting needs per package (Vue in client, Node in server)
**Example:**
```typescript
// eslint.config.js (root)
// Source: https://eslint.org/docs/latest/use/configure/configuration-files
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true, // v8 feature: auto-detects tsconfig.json files
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.tsbuildinfo'],
  }
)
```

```typescript
// packages/client/eslint.config.js
// Source: https://eslint.vuejs.org/user-guide/
import rootConfig from '../../eslint.config.js'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import globals from 'globals'

export default [
  ...rootConfig,
  ...pluginVue.configs['flat/recommended'],
  ...vueTsConfigs.recommended,
  {
    files: ['**/*.vue', '**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
]
```

### Pattern 2: Using typescript-eslint's Project Service
**What:** The v8 projectService feature auto-detects tsconfig.json files in monorepos
**When to use:** All TypeScript monorepos (eliminates manual project glob configuration)
**Example:**
```typescript
// Source: https://typescript-eslint.io/troubleshooting/typed-linting/monorepos/
languageOptions: {
  parserOptions: {
    projectService: true, // Auto-finds tsconfig.json in packages/*
    tsconfigRootDir: import.meta.dirname,
  },
}
```
**Note:** Replaces old `project: ['./tsconfig.json', './packages/*/tsconfig.json']` pattern

### Pattern 3: File-Specific Rules with Cascading
**What:** Apply different rules to different file patterns using the files property
**When to use:** Need stricter rules for src code vs tests vs config files
**Example:**
```typescript
// Source: https://eslint.org/docs/latest/use/configure/configuration-files
export default [
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
    },
  },
  {
    files: ['**/vite.config.ts', '**/vitest.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]
```

### Anti-Patterns to Avoid
- **Don't use .eslintrc files** - Deprecated in ESLint 9, use flat config
- **Don't duplicate configs** - Use a shared base and extend it
- **Don't use manual project globs** - Use projectService instead (typescript-eslint v8)
- **Don't ignore all warnings** - Warnings surface real issues, fix them or decide if rule applies

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vue + TypeScript integration | Custom plugin + parser + rules setup | @vue/eslint-config-typescript | Official config handles all integration, includes proper parser setup |
| Monorepo TypeScript linting | Manual tsconfig path mapping | typescript-eslint v8 projectService | Auto-detects tsconfig.json files, no manual configuration |
| Global variable definitions | Define globals manually per file | globals package | Comprehensive, maintained list of all environments |
| Plugin compatibility issues | Write adapter code | @eslint/compat | Official compatibility layer for legacy plugins |
| Incremental error fixing | Manual tracking of which rules to enable | eslint-nibble | Interactive tool to enable rules one at a time |

**Key insight:** ESLint flat config looks simple but has subtle complexity around plugin imports, config cascading, and TypeScript integration. Use official configs from Vue and TypeScript-ESLint teams rather than assembling manually.

## Common Pitfalls

### Pitfall 1: Config File Location Confusion
**What goes wrong:** ESLint 9 expects a single root config by default, unlike eslintrc which cascaded from multiple locations
**Why it happens:** Previous ESLint versions allowed .eslintrc in each package, flat config changes this
**How to avoid:**
- Use root eslint.config.js as the entry point
- Import/extend from package-specific configs if needed
- Or use experimental config lookup for eslintrc-style cascading
**Warning signs:** ESLint can't find config, lints wrong files, ignores package-specific rules

### Pitfall 2: Plugin Import Syntax
**What goes wrong:** Using string names for plugins (like 'vue') instead of importing them
**Why it happens:** Legacy .eslintrc used string references, flat config requires imports
**How to avoid:** Always import plugins: `import pluginVue from 'eslint-plugin-vue'`
**Warning signs:** "Plugin 'vue' not found" errors despite installation

### Pitfall 3: TypeScript Project Configuration Overhead
**What goes wrong:** Using old `project: ['./packages/*/tsconfig.json']` pattern causes performance issues
**Why it happens:** Pre-v8 typescript-eslint required manual project paths for monorepos
**How to avoid:** Use typescript-eslint v8+ with `projectService: true` instead
**Warning signs:** Slow linting, out-of-memory errors in large monorepos, manual tsconfig path maintenance

### Pitfall 4: Global Ignores vs File-Specific Ignores
**What goes wrong:** Ignore patterns not working as expected
**Why it happens:** `ignores` property behaves differently alone vs with other properties
**How to avoid:**
- Global ignores: `{ ignores: ['dist/**'] }` (standalone object, no files key)
- File-specific: `{ files: ['src/**'], ignores: ['**/*.test.ts'] }` (paired with files)
**Warning signs:** Build artifacts getting linted, test files linted when they shouldn't be

### Pitfall 5: Trying to Fix All Errors at Once
**What goes wrong:** Overwhelming number of errors when adding ESLint to existing codebase
**Why it happens:** Years of code without linting, many violations
**How to avoid:**
- Use `eslint-nibble` to enable rules incrementally
- Start with `--fix` to auto-fix formatting issues
- Disable all rules, enable one category at a time
- Use `// eslint-disable-next-line` for known exceptions during migration
**Warning signs:** Hundreds or thousands of errors, team paralyzed by fixing effort

### Pitfall 6: Bun Runtime Compatibility Issues
**What goes wrong:** ESLint may fail with "parent.require is not a function" when run via Bun
**Why it happens:** Some ESLint plugins assume Node.js runtime, Bun has different module resolution
**How to avoid:**
- Run ESLint through `bunx eslint` not `bun eslint`
- Use latest ESLint 9+ and typescript-eslint v8+
- Avoid TypeScript config files for ESLint (use .js or .mjs)
**Warning signs:** Errors mentioning require, module resolution, or "not a function"

### Pitfall 7: Mixing .eslintignore and Config Ignores
**What goes wrong:** Unclear which ignore patterns take precedence
**Why it happens:** ESLint supports both .eslintignore files and config-based ignores
**How to avoid:** Pick one approach - prefer config-based ignores for flat config
**Warning signs:** Files unexpectedly ignored or linted despite ignore patterns

## Code Examples

Verified patterns from official sources:

### Root Config (Monorepo Base)
```javascript
// eslint.config.js (root)
// Source: https://typescript-eslint.io/troubleshooting/typed-linting/monorepos/
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Base recommended rules
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScript configuration with project service
  {
    languageOptions: {
      parserOptions: {
        projectService: true, // Auto-detects all tsconfig.json files
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.tsbuildinfo',
      '**/coverage/**',
    ],
  },

  // Shared custom rules
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
)
```

### Client Package Config (Vue 3 + TypeScript)
```javascript
// packages/client/eslint.config.js
// Source: https://eslint.vuejs.org/user-guide/ + https://github.com/vuejs/eslint-config-typescript
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import globals from 'globals'

export default defineConfigWithVueTs(
  // Vue 3 recommended rules
  ...pluginVue.configs['flat/recommended'],

  // Vue + TypeScript integration
  ...vueTsConfigs.recommended,

  // Browser globals for client code
  {
    files: ['**/*.vue', '**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Vite config needs Node globals
  {
    files: ['vite.config.ts', 'vitest.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Custom Vue rules
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off', // Allow single-word components
      'vue/require-default-prop': 'error',
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    },
  }
)
```

### Server Package Config (Bun + TypeScript)
```javascript
// packages/server/eslint.config.js
// Source: https://eslint.org/docs/latest/use/configure/configuration-files
import rootConfig from '../../eslint.config.js'
import globals from 'globals'

export default [
  ...rootConfig,

  // Bun/Node globals for server code
  {
    languageOptions: {
      globals: {
        ...globals.nodeBuiltin, // Use nodeBuiltin for ESM projects
      },
    },
  },

  // Server-specific rules
  {
    rules: {
      'no-console': 'off', // Allow console in server code
      '@typescript-eslint/no-floating-promises': 'error', // Catch unhandled promises
    },
  },
]
```

### Shared Package Config (Pure TypeScript)
```javascript
// packages/shared/eslint.config.js
import rootConfig from '../../eslint.config.js'

export default [
  ...rootConfig,

  // Shared code should be environment-agnostic
  {
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'process'], // Prevent env-specific code
    },
  },
]
```

### Package.json Scripts
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

### Makefile Integration
```makefile
lint: ## Run linter on all packages
	cd packages/shared && bun run lint
	cd packages/server && bun run lint
	cd packages/client && bun run lint

lint-fix: ## Auto-fix linting issues
	cd packages/shared && bun run lint:fix
	cd packages/server && bun run lint:fix
	cd packages/client && bun run lint:fix
```

### CI Integration (GitHub Actions)
```yaml
# .github/workflows/ci.yml
# Source: https://github.com/marketplace/actions/run-eslint
- name: Lint shared
  run: cd packages/shared && bun run lint

- name: Lint server
  run: cd packages/server && bun run lint

- name: Lint client
  run: cd packages/client && bun run lint
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| .eslintrc.json | eslint.config.js flat config | ESLint 9 (2024) | Simpler config, explicit imports, better type safety |
| Multiple .eslintrc files per package | Single root config with per-package extends | ESLint 9 (2024) | More predictable, but requires explicit structure |
| parserOptions.project with globs | parserOptions.projectService | typescript-eslint v8 (2024) | Zero-config monorepo support, better performance |
| String-based plugin names | Direct plugin imports | ESLint 9 (2024) | Explicit dependencies, no name resolution magic |
| env: { browser: true, node: true } | languageOptions.globals with globals package | ESLint 9 (2024) | More flexible, explicit global definitions |
| Vue 2 configs | Vue 3 configs (flat/recommended) | eslint-plugin-vue 9+ (2023) | Vue 3 composition API support, script setup |

**Deprecated/outdated:**
- `.eslintrc.*` files: Use eslint.config.js instead (ESLint 9 default)
- `extends: ['plugin:@typescript-eslint/recommended']`: Use `...tseslint.configs.recommended` spread syntax
- `env` property: Use `languageOptions.globals` instead
- Manual monorepo project paths: Use `projectService: true` instead

## Open Questions

Things that couldn't be fully resolved:

1. **Should each package have its own config or use root-only?**
   - What we know: Both approaches work; root-only is simpler, per-package is more flexible
   - What's unclear: Which approach scales better for this specific monorepo structure
   - Recommendation: Start with per-package configs (client needs Vue, server needs Node globals) but share common base

2. **How many existing ESLint errors will be found?**
   - What we know: Client has some code, server has game logic, but unknown volume
   - What's unclear: Whether to fix all at once or incrementally
   - Recommendation: Run ESLint with `--fix` first, then assess remaining errors; use eslint-nibble if count > 50

3. **Should we use stricter rules than recommended?**
   - What we know: Recommended configs provide baseline, can be customized
   - What's unclear: Team's tolerance for strictness, development velocity impact
   - Recommendation: Start with recommended configs, add stricter rules incrementally based on bugs found

4. **Bun runtime compatibility status**
   - What we know: Recent issues reported with ESLint 9.19.0 + Bun, using `bunx eslint` recommended
   - What's unclear: Whether current Bun version has issues, exact compatibility matrix
   - Recommendation: Test with `bunx eslint .` in CI and local dev; fallback to Node if issues arise

## Sources

### Primary (HIGH confidence)
- [ESLint Official: Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files) - Flat config structure and best practices
- [ESLint Official: Ignore Files](https://eslint.org/docs/latest/use/configure/ignore) - Ignore patterns in flat config
- [TypeScript-ESLint: Monorepo Configuration](https://typescript-eslint.io/troubleshooting/typed-linting/monorepos/) - Project service and monorepo setup
- [eslint-plugin-vue: User Guide](https://eslint.vuejs.org/user-guide/) - Vue 3 flat config integration
- [GitHub: @vue/eslint-config-typescript](https://github.com/vuejs/eslint-config-typescript) - Official Vue + TypeScript config
- [npm: globals package](https://www.npmjs.com/package/globals) - Global variable definitions

### Secondary (MEDIUM confidence)
- [ESLint Blog: Flat Config Extends](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/) - Recent improvements to flat config
- [Vue School: Upgrading ESLint v8 to v9 in Vue.js](https://vueschool.io/articles/vuejs-tutorials/upgrading-eslint-from-v8-to-v9-in-vue-js/) - Migration guide
- [Medium: Migrating Vue Nx monorepo to ESLint flat config](https://javascript.plainenglish.io/migrating-vue-nx-monorepo-to-eslint-flat-config-75ac67a0df26) - Real-world monorepo example
- [Plain English: How I dealt with over 30,000 ESLint errors](https://plainenglish.io/blog/how-i-dealt-with-over-30-000-eslint-errors) - Incremental fixing strategies
- [Medium: Setting up ESLint, Prettier & Husky in Bun TypeScript Project](https://medium.com/@dharminnagar/setting-up-eslint-prettier-husky-in-a-bun-typescript-project-063fb5076d12) - Bun-specific setup

### Tertiary (LOW confidence)
- [GitHub Issues: Bun ESLint compatibility](https://github.com/oven-sh/bun/issues/17130) - Recent compatibility issue (needs verification)
- [npm: eslint-nibble](https://www.npmjs.com/package/eslint-nibble) - Incremental rule enablement tool (not verified in docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official packages from ESLint, TypeScript-ESLint, and Vue teams
- Architecture: HIGH - Verified from official documentation and migration guides
- Pitfalls: MEDIUM - Mix of official docs and community experience reports
- Code examples: HIGH - All sourced from official documentation

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (60 days - ESLint ecosystem is stable, major changes unlikely)
