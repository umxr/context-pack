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

- [ ] **No end-to-end CLI tests.** Unit tests cover core modules but no tests exercise the actual CLI binary (exit codes, flag combinations, error messages)
- [ ] **`dist/index.js` only re-exports types.** The library entry point (`main` field) only exports types — consider also exporting core functions (`scanFiles`, `packFiles`, `scoreFiles`) for programmatic use
- [ ] **`--ai` flag has no test coverage.** The semantic ranker is untested (understandable since it calls an API, but at least test the prompt builder and response parser)
- [ ] **Config loading not tested.** `src/core/config.ts` has no test file

## Nice to have

- [ ] **Add GitHub Actions CI** for test/lint/build on push
- [ ] **Add `npx @umar/context-pack` smoke test** after build to verify the bin works end-to-end
- [ ] **Consider `--clipboard` flag** as alternative to `| pbcopy` (cross-platform)

---

## Publish steps

```bash
npm login                    # if not already logged in
npm run build && npm test    # verify everything passes
npm pack --dry-run           # review what gets published
npm publish --access public  # scoped packages need --access public on first publish
```
