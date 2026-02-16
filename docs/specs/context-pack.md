# Build: context-pack — Optimal context window builder for AI agents

## Context

Read CLAUDE.md first. This project follows spec-driven development (SDD/BMAD) methodology.

I'm building `context-pack`, a CLI tool that assembles the optimal set of files from a codebase for a given task — so AI agents get exactly the context they need, nothing more. Think of it as a smart `cat` that understands code relationships and token budgets.

This is the second of three SDD tooling projects (spec-lint, spec-diff, context-pack).

---

## Problem

AI coding agents have finite context windows. Developers either dump too many files in (wasting tokens, diluting relevance) or too few (agent misses dependencies, produces broken code). There's no automated way to answer: "given this task, which files does the agent actually need to see?"

Today this is a manual process — developers mentally trace imports, remember which files matter, and hand-pick context. This doesn't scale. It's the biggest bottleneck in agentic engineering after inference speed itself.

## Approach

Build a CLI tool in TypeScript that:
1. Takes a task description (string or file) and a codebase path
2. Analyzes the codebase structure and file relationships
3. Scores files by relevance to the task using multiple strategies
4. Packs the highest-relevance files into a context bundle that fits within a token budget
5. Outputs a single concatenated markdown file, a file list, or copies to clipboard

### Three-layer relevance scoring:

**Layer 1 — Entry point expansion (static, free, fast):**
If the user specifies entry files (`--entry src/auth/login.ts`), follow imports/exports to build a dependency graph. All files in the graph get a base relevance score proportional to their distance from the entry point.

**Layer 2 — Keyword & path matching (static, free, fast):**
Extract keywords from the task description. Score files by filename match, directory match, and content grep hits. Specs and docs that mention task-related terms get boosted.

**Layer 3 — Semantic ranking (LLM-powered, optional, behind `--ai` flag):**
Send file summaries + task description to an LLM. Ask it to rank which files are most relevant and why. Re-score based on LLM judgment.

Final score = weighted combination of all active layers. Pack files in score order until token budget is exhausted.

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **CLI framework:** `commander`
- **Token counting:** `tiktoken` (accurate) or `js-tiktoken` (lighter, WASM)
- **Import parsing:** Regex-based for v1 (TS/JS imports, Python imports, Go imports, Rust use statements). Keep the parser interface clean so tree-sitter can slot in later.
- **Glob matching:** `fast-glob`
- **Validation:** `zod`
- **LLM integration:** Vercel AI SDK (`ai` package)
- **Testing:** `vitest`
- **Build:** `tsup`
- **Linting:** `biome`

## Architecture

```
context-pack/
├── CLAUDE.md
├── docs/
│   ├── specs/
│   │   └── context-pack.md       # This spec
│   ├── architecture.md
│   └── decisions/
├── src/
│   ├── cli/
│   │   └── index.ts              # CLI entry point
│   ├── core/
│   │   ├── scanner.ts            # Walks codebase, builds file inventory
│   │   ├── import-parser.ts      # Extracts imports/dependencies from source files
│   │   ├── graph.ts              # Builds dependency graph from parsed imports
│   │   ├── scorers/
│   │   │   ├── entry-expansion.ts    # Layer 1: dependency graph traversal
│   │   │   ├── keyword-match.ts      # Layer 2: keyword/path matching
│   │   │   ├── semantic-rank.ts      # Layer 3: LLM-powered ranking
│   │   │   └── index.ts             # Scorer registry and combination
│   │   ├── packer.ts             # Token-aware file packing (knapsack)
│   │   ├── tokenizer.ts          # Token counting abstraction
│   │   ├── types.ts              # Core type definitions
│   │   └── config.ts             # Config loading
│   ├── prompts/
│   │   └── rank-relevance.ts     # v1.0 — LLM file ranking prompt
│   └── formatters/
│       ├── markdown.ts           # Concatenated markdown output
│       ├── filelist.ts           # Plain file list output
│       └── json.ts               # JSON output with scores
├── tests/
│   ├── fixtures/
│   │   └── sample-project/       # A small fake project for testing
│   │       ├── src/
│   │       │   ├── index.ts
│   │       │   ├── auth/
│   │       │   │   ├── login.ts
│   │       │   │   ├── session.ts
│   │       │   │   └── types.ts
│   │       │   ├── db/
│   │       │   │   ├── client.ts
│   │       │   │   └── queries.ts
│   │       │   └── utils/
│   │       │       └── hash.ts
│   │       ├── docs/
│   │       │   └── specs/
│   │       │       └── auth.md
│   │       ├── package.json
│   │       └── tsconfig.json
│   └── core/
│       ├── scanner.test.ts
│       ├── import-parser.test.ts
│       ├── graph.test.ts
│       ├── scorers/
│       │   ├── entry-expansion.test.ts
│       │   └── keyword-match.test.ts
│       └── packer.test.ts
├── package.json
├── tsconfig.json
├── biome.json
└── CHANGELOG.md
```

## Core Types

```typescript
type FileEntry = {
  path: string;            // Relative to codebase root
  absolutePath: string;
  content: string;
  tokenCount: number;
  language: string;        // Detected from extension
  imports: string[];       // Resolved import paths
  exports: string[];       // Exported identifiers (optional, best-effort)
};

type ScoredFile = FileEntry & {
  score: number;           // 0-1 combined relevance score
  scoreBreakdown: {
    entryExpansion: number;   // 0-1
    keywordMatch: number;     // 0-1
    semanticRank: number;     // 0-1 (0 if --ai not used)
  };
  reason: string;          // Human-readable explanation of why this file scored high
};

type PackResult = {
  files: ScoredFile[];         // Files included, ordered by score
  excluded: ScoredFile[];      // Files that didn't fit in budget
  totalTokens: number;         // Total tokens in packed context
  budgetTokens: number;        // Token budget that was set
  budgetUsedPercent: number;   // How much of budget was used
};

type ContextPackConfig = {
  tokenBudget: number;         // Default: 100000
  include: string[];           // Glob patterns to include
  exclude: string[];           // Glob patterns to exclude
  alwaysInclude: string[];     // Files always included regardless of score
  weights: {
    entryExpansion: number;    // Default: 0.4
    keywordMatch: number;      // Default: 0.4
    semanticRank: number;      // Default: 0.2
  };
  ai: {
    provider: string;
    model: string;
  };
};

type ImportParserResult = {
  imports: Array<{
    raw: string;               // Original import string
    resolved: string | null;   // Resolved file path or null if external package
    isRelative: boolean;
    isPackage: boolean;
  }>;
};
```

## CLI Interface

```bash
# Basic: pack context for a task
context-pack "fix the login session timeout bug" --codebase ./src

# With entry point hints (most precise)
context-pack "fix the login session timeout bug" \
  --entry src/auth/login.ts \
  --entry src/auth/session.ts \
  --codebase .

# Set token budget
context-pack "add rate limiting to API" --budget 50000

# AI-powered semantic ranking
context-pack "refactor payment flow to support subscriptions" --ai

# Output formats
context-pack "fix auth bug" --format markdown    # default — concatenated markdown
context-pack "fix auth bug" --format filelist     # just file paths, one per line
context-pack "fix auth bug" --format json         # full scored JSON output

# Copy packed context to clipboard
context-pack "fix auth bug" | pbcopy

# Write to file
context-pack "fix auth bug" --out context.md

# Include specs and docs in context
context-pack "fix auth bug" --include-docs

# Always include certain files
context-pack "fix auth bug" --always-include CLAUDE.md --always-include docs/specs/auth.md

# Read task from file
context-pack --task-file docs/tasks/fix-auth.md

# Stdin task
echo "fix the login bug" | context-pack --stdin --codebase ./src

# Dry run — show what would be packed without outputting content
context-pack "fix auth bug" --dry-run

# Verbose — show scoring details
context-pack "fix auth bug" --verbose
```

### Exit codes:
- 0: Context packed successfully
- 1: Error (codebase not found, no files matched, etc.)
- 2: Usage error (bad args)

## Markdown Output Format

The concatenated markdown output should be structured for optimal agent consumption:

```markdown
# Context Pack
**Task:** fix the login session timeout bug
**Files:** 6 | **Tokens:** 4,230 / 100,000 budget

## File: src/auth/login.ts
**Score:** 0.95 | **Reason:** Entry point, direct import match
**Language:** typescript

\`\`\`typescript
// full file contents here
\`\`\`

## File: src/auth/session.ts
**Score:** 0.88 | **Reason:** Imported by entry point, keyword "session" matches task
**Language:** typescript

\`\`\`typescript
// full file contents here
\`\`\`

## File: docs/specs/auth.md
**Score:** 0.72 | **Reason:** Spec file, keywords "login" and "session" match
**Language:** markdown

\`\`\`markdown
// full file contents here
\`\`\`
```

## Import Parser

The import parser should handle these patterns for v1:

**TypeScript/JavaScript:**
```
import { foo } from './bar'
import * as bar from '../utils/bar'
import bar from './bar'
export { foo } from './bar'
require('./bar')
const bar = require('./bar')
import('./bar')  // dynamic import
```

**Python:**
```
import foo.bar
from foo.bar import baz
from . import bar
from ..utils import hash
```

**Go:**
```
import "github.com/user/pkg"
import "./internal/auth"
```

**Rust:**
```
use crate::auth::login;
mod session;
```

The parser should:
- Distinguish relative imports (resolve to files) from package imports (ignore)
- Resolve relative paths to actual file paths in the codebase
- Handle index files (`./auth` → `./auth/index.ts`)
- Handle extension-less imports (`./login` → `./login.ts`)
- Return `null` for resolved path if the file doesn't exist (broken import)

**Design it as a trait/interface** so tree-sitter can replace regex later:

```typescript
type ImportParser = {
  languages: string[];   // e.g. ['typescript', 'javascript']
  parse: (content: string, filePath: string) => ImportParserResult;
};
```

## Dependency Graph

Build a directed graph from parsed imports:

```typescript
type DependencyGraph = {
  nodes: Map<string, FileEntry>;         // path → file
  edges: Map<string, Set<string>>;       // path → set of paths it imports
  reverseEdges: Map<string, Set<string>>; // path → set of paths that import it
};
```

From an entry point, traverse the graph (BFS) and assign scores:
- Entry point itself: 1.0
- Direct imports: 0.8
- 2 hops away: 0.6
- 3 hops: 0.4
- 4+ hops: 0.2
- Files that are imported by many files in the graph (high in-degree relative to the subgraph) get a boost

## Keyword Matching

Extract keywords from the task description:
- Remove stop words (the, a, an, is, to, for, etc.)
- Keep nouns, technical terms, identifiers
- Treat camelCase/snake_case as multiple keywords (`loginSession` → `login`, `session`)

Score files by:
- **Filename match:** File or directory name contains a keyword → +0.3 per match
- **Content match:** File content contains keyword → +0.1 per match (diminishing returns, cap at 0.5)
- **Spec/doc boost:** Markdown files in docs/ that match get 1.5x multiplier (specs are high-value context)

Normalize to 0-1 range.

## Packer (Token Budget)

The packer solves a simplified knapsack problem:

1. Sort files by combined score (descending)
2. Always include `alwaysInclude` files first, deduct from budget
3. Greedily add files in score order until budget is exhausted
4. If a file would exceed the budget, skip it and try the next (don't just stop)
5. Track excluded files and their scores for the dry-run report

**Token counting:**
- Use `js-tiktoken` with `cl100k_base` encoding (works for both OpenAI and Anthropic rough estimates)
- Count tokens per file once during scanning, cache the count
- The markdown wrapper (headers, code fences) adds ~20 tokens per file — account for this

## Semantic Ranking (--ai flag)

When `--ai` is used:

1. After static scoring, take the top 50 files by static score
2. Build a summary of each file: path, first 5 lines, export names, token count
3. Send to LLM with the task description
4. Ask LLM to return a ranked list with relevance scores and reasons
5. Merge LLM scores into the combined score using configured weights

The LLM prompt should be in `src/prompts/rank-relevance.ts` and request structured JSON output.

**Key constraint:** The LLM call itself must fit in a reasonable context. File summaries, not full contents. If 50 summaries are too large, reduce to top 30.

## Config File (`.contextpackrc.json`)

```json
{
  "tokenBudget": 100000,
  "include": ["src/**/*", "docs/**/*.md", "CLAUDE.md"],
  "exclude": ["node_modules/**", "dist/**", "*.test.*", "*.spec.*", ".git/**"],
  "alwaysInclude": ["CLAUDE.md"],
  "weights": {
    "entryExpansion": 0.4,
    "keywordMatch": 0.4,
    "semanticRank": 0.2
  },
  "ai": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514"
  }
}
```

Default excludes (always applied unless overridden):
```
node_modules, .git, dist, build, out, coverage, __pycache__,
*.lock, *.map, *.min.js, *.min.css,
binary files (images, fonts, archives)
```

## Boundaries

### In scope:
- CLI that packs codebase context for a given task
- Import parsing for TS/JS, Python, Go, Rust (regex-based, v1)
- Dependency graph construction and traversal
- Keyword-based file scoring
- Token-aware packing with budget
- LLM-powered semantic ranking (behind `--ai`)
- Markdown, filelist, and JSON output formats
- Config file support
- Stdin support for task description
- Dry-run mode showing what would be packed
- Test fixtures with a small sample project

### NOT in scope (future):
- Tree-sitter integration (designed for, not implemented)
- Embedding-based semantic search (local vector DB)
- Watch mode / incremental repacking
- Editor integrations
- MCP server mode
- Caching of file scans across runs
- Multi-language projects with cross-language imports

## Acceptance Criteria

- [ ] `context-pack "fix login bug" --codebase tests/fixtures/sample-project` produces a markdown bundle containing relevant auth files
- [ ] `--entry src/auth/login.ts` includes login.ts and its direct dependencies, scored by graph distance
- [ ] `--budget 5000` respects the token limit — output tokens ≤ budget
- [ ] `--format json` outputs valid JSON matching the PackResult schema
- [ ] `--format filelist` outputs one file path per line, ordered by score
- [ ] `--dry-run` shows file list with scores and token counts, no file contents
- [ ] `--verbose` shows scoring breakdown per file
- [ ] `--ai` triggers LLM ranking (gracefully skips if no API key, with warning)
- [ ] `--always-include CLAUDE.md` includes CLAUDE.md regardless of relevance score
- [ ] `--include-docs` adds `docs/**/*.md` to include patterns
- [ ] Import parser correctly resolves relative TS/JS imports including index files and extensionless paths
- [ ] Files in default exclude list (node_modules, .git, dist, binaries) are never included
- [ ] `cat task.md | context-pack --stdin` reads task from stdin
- [ ] Exit code 0 on success, 1 on error, 2 on bad usage
- [ ] All core modules (scanner, import-parser, graph, scorers, packer) have test coverage
- [ ] `npm test` passes with zero failures
- [ ] `npm run build` produces a working CLI binary

## Edge Cases

- Empty codebase directory — exit 1 with clear message
- Codebase with circular imports — graph traversal must handle cycles (visited set)
- Import that resolves to a file outside the codebase root — exclude it
- File with no imports and no keyword matches — gets minimum score, only included if budget allows
- Task description is a single word — keyword matching still works, just fewer signals
- Very large files (>10k tokens) — include if high score, but warn in verbose mode that one file is consuming a large chunk of budget
- Binary files in src/ — detect by extension or null bytes, skip silently
- Symlinks — follow them but don't loop
- Monorepo with multiple packages — respect codebase root, don't cross package boundaries unless entry point is specified
- No entry points and no keywords match anything — fall back to heuristic: include CLAUDE.md, README, main entry files (package.json main/bin), and docs/
- Token budget of 0 — output header only, no files (useful for testing)
- `--ai` with a model that doesn't support structured output — parse JSON from markdown code fences as fallback

## Implementation Order

Build in this sequence:

1. Project scaffolding (package.json, tsconfig, biome, directory structure, test fixture project)
2. Core types (`src/core/types.ts`)
3. Tokenizer abstraction (`src/core/tokenizer.ts`) + tests
4. File scanner (`src/core/scanner.ts`) — walks codebase, reads files, counts tokens + tests
5. Import parser (`src/core/import-parser.ts`) — TS/JS first + tests
6. Dependency graph (`src/core/graph.ts`) + tests
7. Entry expansion scorer (`src/core/scorers/entry-expansion.ts`) + tests
8. Keyword match scorer (`src/core/scorers/keyword-match.ts`) + tests
9. Scorer combiner (`src/core/scorers/index.ts`)
10. Packer (`src/core/packer.ts`) — token-aware knapsack + tests
11. Markdown formatter (`src/formatters/markdown.ts`)
12. Filelist and JSON formatters
13. CLI entry point with commander
14. Config loading (`src/core/config.ts`)
15. Add Python, Go, Rust import parsers to import-parser.ts
16. Semantic ranker (`src/core/scorers/semantic-rank.ts`) + prompt
17. End-to-end CLI tests
18. Docs (architecture.md, this spec to docs/specs/)
19. Build config (tsup) and verify `npx` execution

Commit after each step.
