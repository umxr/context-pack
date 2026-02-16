# Publish Checklist — @umar/context-pack

**Status:** READY

---

## Blockers (must fix before publish)

- [x] **Package name.** Scoped to `@umar/context-pack`
- [x] **"files" field.** Only ships `dist/` (8 files, 26 kB)
- [x] **README.md.** Install, usage, CLI reference, config format
- [x] **LICENSE file.** MIT
- [x] **package.json fields.** `repository`, `homepage`, `author`, `engines`, `exports`, `types`
- [x] **`prepublishOnly` script.** Runs `npm run build && npm test`
- [x] **Removed unused `zod` dependency.**
- [x] **Shebang correct.** Only on `dist/cli/index.js`, not `dist/index.js`

## Should fix

- [x] **End-to-end CLI tests.** 14 tests covering exit codes, all output formats, flag combinations, stdin, --out
- [x] **Library entry point exports core functions.** `scanFiles`, `packFiles`, `scoreFiles`, `loadConfig`, `countTokens`, formatters, and all types
- [x] **`--ai` flag test coverage.** Tests for `parseRankResponse`, `extractExportNames`, `getFilePreview`, and `buildRankRelevancePrompt`
- [x] **Config loading tested.** 10 tests: defaults, file loading, overrides, weight merging, invalid JSON, ai config

## Nice to have

- [x] **GitHub Actions CI.** Runs lint, typecheck, build, test on push/PR (Node 20 + 22)
- [x] **semantic-release.** Automated versioning, CHANGELOG, npm publish, GitHub releases
- [ ] **Consider `--clipboard` flag** as alternative to `| pbcopy` (cross-platform)

---

## Setup required for releases

Add these secrets to GitHub repo settings (`Settings > Secrets and variables > Actions`):

- **`NPM_TOKEN`** — npm access token with publish permission for `@umar` scope
  - Create at https://www.npmjs.com/settings/umxr/tokens → "Automation" type
- **`GITHUB_TOKEN`** — provided automatically by GitHub Actions (no setup needed)

## How releases work

1. Push commits to `main` using conventional commits (`feat:`, `fix:`, `docs:`, etc.)
2. `semantic-release` analyzes commits since last release
3. Determines version bump: `feat:` → minor, `fix:` → patch, `BREAKING CHANGE` → major
4. Updates `CHANGELOG.md`, `package.json` version, creates git tag
5. Publishes to npm as `@umar/context-pack`
6. Creates GitHub release with notes

## Manual publish (if needed)

```bash
npm login
npm run build && npm test
npm publish --access public
```
