# Architecture — context-pack

**Last updated:** 2026-02-16

## Overview

context-pack is a CLI tool that assembles optimal file context for AI agents. Given a task description and a codebase, it scores every file by relevance and packs the highest-scoring files into a context bundle that fits within a token budget.

## Data Flow

```
Task Description + Codebase Path
         │
         ▼
   ┌─────────────┐
   │   Scanner    │ ── walks codebase, reads files, counts tokens
   └──────┬──────┘
          │ FileEntry[]
          ▼
   ┌──────────────┐
   │ Import Parser │ ── extracts imports per file (TS/JS/Python/Go/Rust)
   └──────┬───────┘
          │ ImportParserResult
          ▼
   ┌──────────────┐
   │    Graph      │ ── builds dependency graph from resolved imports
   └──────┬───────┘
          │ DependencyGraph
          ▼
   ┌──────────────┐
   │   Scorers     │ ── entry expansion + keyword match + semantic rank
   └──────┬───────┘
          │ ScoredFile[]
          ▼
   ┌──────────────┐
   │   Packer      │ ── greedy knapsack within token budget
   └──────┬───────┘
          │ PackResult
          ▼
   ┌──────────────┐
   │  Formatters   │ ── markdown / filelist / JSON output
   └──────────────┘
```

## Key Components

### Scanner (`src/core/scanner.ts`)
- Uses `fast-glob` to walk the codebase
- Filters by include/exclude patterns
- Skips binary files by extension
- Reads file content and counts tokens via `js-tiktoken`

### Import Parser (`src/core/import-parser.ts`)
- Regex-based parser behind an `ImportParser` interface
- Supports TypeScript, JavaScript, Python, Go, Rust
- Resolves relative imports to actual file paths (TS/JS only for v1)
- Designed for tree-sitter to replace regex later

### Dependency Graph (`src/core/graph.ts`)
- Directed graph: nodes = files, edges = imports
- BFS traversal from entry points to compute distances
- In-degree calculation for importance boosting

### Scorers (`src/core/scorers/`)
Three-layer scoring system:
1. **Entry expansion** — graph distance from entry points (0-1)
2. **Keyword match** — task description keywords vs filenames/content (0-1)
3. **Semantic rank** — LLM-powered ranking (optional, behind `--ai`)

Combined via configurable weights, normalized to 0-1.

### Packer (`src/core/packer.ts`)
- Greedy knapsack: sort by score, fill until budget exhausted
- Always-include files are packed first
- Skips files that don't fit but keeps trying smaller ones
- Accounts for wrapper tokens (headers, code fences) per file

### Formatters (`src/formatters/`)
- **Markdown**: concatenated file contents with headers, scores, language tags
- **Filelist**: one file path per line, ordered by score
- **JSON**: full PackResult with scores and metadata

## Configuration

Config loaded from `.contextpackrc.json` in codebase root, merged with CLI flags. Key settings:
- `tokenBudget` (default 100k)
- `include` / `exclude` glob patterns
- `alwaysInclude` files
- `weights` for scorer combination
- `ai` provider/model settings

## Design Decisions

- **Regex over tree-sitter for v1**: faster to implement, good enough for common import patterns. Interface designed for drop-in tree-sitter replacement.
- **Greedy packer over optimal knapsack**: files don't have fractional value, and the greedy approach is fast and predictable. Optimal knapsack is unnecessary for this use case.
- **Token counting with js-tiktoken**: uses cl100k_base encoding. Counts are approximate but consistent. Overhead of ~20 tokens per file for markdown wrapper.
- **Semantic ranking is optional**: behind `--ai` flag because it adds latency and cost. Static scoring handles most cases well.
