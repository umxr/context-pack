# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-02-16

### Added

- Initial project scaffolding
- Core types (`src/core/types.ts`)
- Token counting via js-tiktoken (`src/core/tokenizer.ts`)
- File scanner with glob/exclude patterns (`src/core/scanner.ts`)
- Import parser for TypeScript, JavaScript, Python, Go, Rust (`src/core/import-parser.ts`)
- Dependency graph builder with BFS traversal (`src/core/graph.ts`)
- Entry expansion scorer — scores files by distance from entry points (`src/core/scorers/entry-expansion.ts`)
- Keyword match scorer — scores files by task description keyword matches (`src/core/scorers/keyword-match.ts`)
- Scorer combiner with configurable weights (`src/core/scorers/index.ts`)
- Semantic ranking via Anthropic API behind `--ai` flag (`src/core/scorers/semantic-rank.ts`)
- Token-aware packer with greedy knapsack algorithm (`src/core/packer.ts`)
- Config file support (`.contextpackrc.json`) (`src/core/config.ts`)
- Markdown, filelist, and JSON output formatters (`src/formatters/`)
- CLI entry point with commander (`src/cli/index.ts`)
- LLM ranking prompt (`src/prompts/rank-relevance.ts`)
- 71 unit tests covering all core modules
- Test fixtures with sample TypeScript project
