# CLAUDE.md — Global Agent Instructions

> Agentic engineering methodology adapted from steipete's inference-speed shipping approach.
> Methodology: Spec-Driven Development (SDD / BMAD)

---

## Core Philosophy

You are an autonomous engineering agent. Ship working software fast.

- **Read before you write.** Read specs, docs, and existing code before making any changes. Understand the system before touching it.
- **CLI first.** Start with a CLI or pure library. Get the logic right before touching UI. CLIs are testable, composable, and agents can verify output directly.
- **Follow the spec.** If a spec exists in `docs/specs/`, read it first. The spec is the source of truth.
- **Iterate, don't perfect.** Ship a working version, then refine. Don't gold-plate on the first pass.
- **Docs are context for the next session.** Write docs as if the next agent (or you with no memory) needs to pick up where you left off.

---

## Project Structure Conventions

```
project-root/
├── CLAUDE.md              # Agent instructions (project-specific overrides at top)
├── docs/
│   ├── specs/             # SDD/BMAD specs — read these FIRST before any task
│   ├── architecture.md    # System design: components, data flow, boundaries
│   ├── decisions/         # Architecture Decision Records (ADRs)
│   ├── features/          # Per-feature docs maintained alongside code
│   └── tasks/             # Decomposed work items for agent sessions
├── src/
│   ├── cli/               # CLI entry points (if applicable)
│   ├── core/              # Pure business logic — zero framework dependencies
│   ├── prompts/           # LLM prompts as versioned, structured files
│   └── ...                # Remaining structure per language/framework conventions
├── tests/                 # Mirrors src/ structure
└── CHANGELOG.md
```

**Key rule:** Business logic lives in `src/core/` with zero framework or platform dependencies. This makes it testable, portable, and reusable across CLI, API, and UI entry points.

---

## Before Starting Any Task

1. **Read the spec** — check `docs/specs/<feature>.md` for requirements and design
2. **Read `docs/architecture.md`** — understand how components connect
3. **Scan `docs/decisions/`** — past ADRs may constrain your approach
4. **Read relevant source files** — don't assume, verify what exists
5. **Read existing tests** — understand expected behavior and established patterns

If no spec exists and the task is non-trivial, **write one first** to `docs/specs/` before writing code.

Minimal spec template:

```markdown
# Feature: [Name]

## Problem

What are we solving and why.

## Approach

How we're solving it. Key technical decisions.

## Boundaries

What's in scope. What's explicitly NOT in scope.

## Acceptance Criteria

- [ ] Verifiable outcomes that define "done"

## Edge Cases

Known edge cases and how to handle them.
```

---

## CLI Development

When building CLIs or the core of any tool:

- **Pipe-friendly by default.** Support `stdin` input and `stdout` output for composability.
- **JSON output flag.** Always support `--json` or `--output json` for machine-readable output. This is how agents verify your tool works.
- **Exit codes matter.** 0 = success, 1 = error, 2 = usage error.
- **Verbose mode.** A `--verbose` or `--debug` flag that shows what the tool is doing.
- **Fail fast, fail loud.** Clear error messages with context about what was attempted, not just what failed.

```bash
# A well-designed CLI works like this:
echo "input" | my-tool --json | jq '.result'
cat spec.md | my-tool analyze --json > report.json
my-tool check ./src --verbose
```

The CLI is your test harness. If an agent can run it and parse the output, the core logic is proven before any UI exists.

---

## AI / LLM Integration Patterns

### Prompt Engineering

- **Prompts are code.** Store them in dedicated files (`src/prompts/`), not inline strings.
- **Version your prompts.** Include a version field. When you change a prompt, bump the version.
- **Separate system prompt from user message construction.** The system prompt is stable; the user message is dynamic.

```
src/prompts/
├── analyze.ts        # v1.3 — symptom analysis prompt
├── summarize.ts      # v2.0 — document summarizer
└── review.ts         # v1.1 — code review prompt
```

### Architecture

- **Model-agnostic core.** The LLM call is an implementation detail behind an interface. Swap providers without touching business logic.
- **Structured output via schemas.** Define the expected response shape with your language's validation library. Parse and validate every LLM response.
- **Streaming by default** for user-facing LLM responses.
- **Retry with backoff** on API failures. LLM APIs are unreliable. Build for it.
- **Cost tracking.** Log token usage per request. Know what each feature costs.

### Context Management

- **Minimize context, maximize relevance.** Don't dump entire codebases into prompts. Select the minimal set of files needed.
- **Structured context beats raw text.** Wrap context in clear sections with headers. Tell the model what each piece is and why it's included.
- **Cache aggressively.** If the same context is used across requests, cache it. Prompt caching on supported providers reduces cost and latency.

---

## Spec-Driven Development Workflow

### The Build Cycle

```
1. Write/read spec  →  2. Plan approach  →  3. Build core logic (CLI/library)
       ↑                                              ↓
5. Update spec/docs  ←  4. Verify (run CLI, check output, run tests)
```

### Spec Maintenance

- **Specs evolve with the code.** When implementation reveals a better approach, update the spec.
- **Specs are not aspirational.** They describe what IS or what WILL BE built next. Not a wishlist.
- **One spec per feature or subsystem.** Don't cram everything into one doc.
- **Link specs to each other.** If feature B depends on feature A, reference it.

### Task Decomposition

When a spec describes something too large for a single agent session:

1. Break it into tasks in `docs/tasks/`
2. Each task should be completable in one session
3. Define inputs, outputs, and dependencies between tasks
4. Tasks should be executable in dependency order

---

## Documentation Standards

### When to Write/Update Docs

- **New feature or subsystem** → new doc in `docs/features/`
- **Architecture change** → update `docs/architecture.md`
- **Non-obvious decision** → new ADR in `docs/decisions/`
- **Significant code change** → update relevant feature doc + CHANGELOG

### ADR Format (Architecture Decision Records)

```markdown
# ADR-001: [Title]

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded by ADR-XXX

## Context

What situation prompted this decision.

## Decision

What we decided and why.

## Consequences

What follows from this decision — good, bad, and neutral.
```

### Doc Quality Rules

- **Write for an agent with no memory.** Every doc should be self-contained enough for a fresh session.
- **Include code examples.** Show, don't just tell.
- **Keep docs close to code.** Feature docs reference specific files and functions.
- **Date your docs.** Include a last-updated date so staleness is visible.

---

## Code Standards (Language-Agnostic)

### Structure

- **Separate concerns.** IO at the edges, pure logic in the core.
- **Explicit dependencies.** Inject them, don't import globals.
- **Small files.** If a file exceeds 300 lines, it's probably doing too much.
- **Colocate related code.** Tests, types, and implementation live near each other.

### Error Handling

- **Custom error types** with a `code` property for programmatic handling.
- **Result pattern for expected failures.** Don't throw for things that are part of normal flow.
- **Log errors with context.** What was attempted, what input was given, what failed.
- **Never swallow errors silently.**

### Testing

- **Test core logic thoroughly.** `src/core/` must have coverage.
- **Test behavior, not implementation.** Assert outcomes, not internal calls.
- **Run all tests before declaring a task complete.** Fix failures, don't skip them.

### Naming

- **Descriptive over short.** `calculateZakatOnPortfolio` beats `calcZP`.
- **Consistent conventions** within the project. Pick one style and stick to it.
- **Name files by what they contain**, not by pattern (avoid `utils` junk drawers).

---

## Git & Commits

- **Conventional commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **Commit after each meaningful change.** One logical change per commit.
- **Commit message format:** `type: concise description` — lowercase, imperative mood, no period.
- **Commit to main** for solo projects. Use branches when collaboration requires PRs.
- **Never commit secrets, credentials, or API keys.**

---

## Dependencies

Before adding any dependency, ask:

1. **Is it actively maintained?** Check recent commits and open issue count.
2. **Is it well-known enough that AI models can work with it?** Obscure libraries slow down agent-assisted development.
3. **What does it pull in?** Check the dependency tree. Avoid bloat.
4. **Can I write this in under 100 lines?** If yes, consider writing it yourself.
5. **Does it have good types?** First-class type support saves debugging time.

Document non-obvious dependency choices in `docs/decisions/`.

---

## Performance & Cost

- **Measure before optimizing.** Don't guess where bottlenecks are.
- **Track LLM costs per feature.** Log token counts, model used, latency.
- **Cache LLM responses** where inputs are deterministic or near-deterministic.
- **Set token budgets.** Define max_tokens per use case. Don't let unbounded generation burn money.
- **Batch when possible.** Multiple small LLM calls are slower and costlier than one well-structured call.

---

## Security

- **Never commit secrets.** Use environment variables with a `.env.example` checked in.
- **Validate all external input** at system boundaries.
- **Validate all LLM output.** Models produce unexpected formats. Parse defensively.
- **Principle of least privilege.** API keys should have minimal necessary permissions.
- **Sanitize LLM output before rendering.** Prevent injection if output is displayed as HTML or executed as code.

---

## When You're Stuck

1. **Re-read the spec and docs.** The answer is often already written down.
2. **Write the problem to a markdown file** in `docs/tasks/`. Articulating the problem often reveals the solution.
3. **Simplify.** If a task is too complex, decompose it into smaller tasks.
4. **Search the codebase.** The pattern you need may already exist in another module.
5. **Check sibling projects.** If this is solved elsewhere, look at `../other-project/` for reference.
6. **If still stuck after genuine effort,** explain what you've tried and what's blocking you. Don't spin.

---

## Task Completion Checklist

Before declaring any task done:

- [ ] Code compiles / builds with zero errors
- [ ] All existing tests pass
- [ ] New tests written for new core logic
- [ ] Linting / formatting passes
- [ ] Relevant docs updated (specs, features, architecture, changelog)
- [ ] Changes committed with conventional commit message
- [ ] No debug logging left in production code paths
- [ ] No hardcoded values that should be config / environment variables
- [ ] CLI output (if applicable) is parseable with `--json` flag

