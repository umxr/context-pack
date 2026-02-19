# @umxr/context-pack

Optimal context window builder for AI agents. Given a task description and a codebase, packs the most relevant files into a token-budgeted context bundle.

## Install

```bash
npm install -g @umxr/context-pack
```

Or run directly:

```bash
npx @umxr/context-pack "fix the login bug" --codebase ./src
```

## Usage

```bash
# Basic — pack context for a task
context-pack "fix the login session timeout bug" --codebase ./src

# With entry points — follow imports for dependency-aware scoring
context-pack "fix the login bug" \
  --entry src/auth/login.ts \
  --entry src/auth/session.ts

# Set token budget
context-pack "add rate limiting" --budget 50000

# AI-powered semantic ranking (requires ANTHROPIC_API_KEY)
context-pack "refactor payment flow" --ai

# Output formats
context-pack "fix auth bug" --format markdown   # default
context-pack "fix auth bug" --format filelist    # file paths only
context-pack "fix auth bug" --format json        # full scored output
context-pack "fix auth bug" --json               # shorthand

# Copy to clipboard
context-pack "fix auth bug" | pbcopy

# Write to file
context-pack "fix auth bug" --out context.md

# Dry run — show scores without file contents
context-pack "fix auth bug" --dry-run --verbose

# Always include specific files
context-pack "fix auth bug" --always-include CLAUDE.md

# Read task from file or stdin
context-pack --task-file docs/tasks/fix-auth.md
echo "fix the login bug" | context-pack --stdin
```

## How It Works

Three-layer relevance scoring:

1. **Entry expansion** — if you specify `--entry` files, their import graph is traversed via BFS. Files score higher the closer they are to the entry point.

2. **Keyword matching** — keywords are extracted from the task description and matched against file paths and content. Spec/doc files get a 1.5x boost.

3. **Semantic ranking** (optional, `--ai`) — sends file summaries to an LLM which ranks them by relevance to the task.

Scores are combined with configurable weights, then files are packed in score order until the token budget is exhausted.

## Config File

Create `.contextpackrc.json` in your project root:

```json
{
  "tokenBudget": 100000,
  "include": ["src/**/*", "docs/**/*.md"],
  "exclude": ["**/*.test.*"],
  "alwaysInclude": ["CLAUDE.md"],
  "weights": {
    "entryExpansion": 0.4,
    "keywordMatch": 0.4,
    "semanticRank": 0.2
  }
}
```

## CLI Reference

| Flag | Description | Default |
|------|-------------|---------|
| `--codebase <path>` | Path to codebase root | `.` |
| `--entry <paths...>` | Entry point files for dependency expansion | — |
| `--budget <tokens>` | Token budget | `100000` |
| `--format <type>` | `markdown`, `filelist`, or `json` | `markdown` |
| `--json` | Shorthand for `--format json` | — |
| `--ai` | Enable LLM-powered semantic ranking | — |
| `--out <path>` | Write output to file | stdout |
| `--dry-run` | Show what would be packed | — |
| `--verbose` | Show scoring details | — |
| `--always-include <paths...>` | Files to always include | — |
| `--include-docs` | Add `docs/**/*.md` to scan | — |
| `--task-file <path>` | Read task from file | — |
| `--stdin` | Read task from stdin | — |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (no files found, codebase missing, etc.) |
| `2` | Usage error (bad arguments) |

## Supported Languages

Import parsing (for `--entry` dependency expansion):

- TypeScript / JavaScript
- Python
- Go
- Rust

## License

MIT
