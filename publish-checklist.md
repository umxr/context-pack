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

- [ ] **Add GitHub Actions CI** for test/lint/build on push
- [ ] **Consider `--clipboard` flag** as alternative to `| pbcopy` (cross-platform)

---

## Publish steps

```bash
npm login                    # if not already logged in
npm run build && npm test    # verify everything passes
npm pack --dry-run           # review what gets published
npm publish --access public  # scoped packages need --access public on first publish
```
