# Publish Checklist — @umar/context-pack

**Status:** NOT READY — see blockers below

---

## Blockers (must fix before publish)

- [ ] **Package name is taken.** `context-pack` is owned by `anup4khandelwal` on npm. Use scoped name `@umar/context-pack` — update `name` in `package.json`
- [ ] **No .npmignore or "files" field.** Currently publishes 49 files including tests, fixtures, `.claude/settings.local.json`, `prd.md`, `CLAUDE.md`, source `.ts` files, and `tsup.config.ts`. Should only ship `dist/`, `package.json`, `README.md`, `LICENSE`
- [ ] **No README.md.** npm requires a README for discoverability. Needs: what it does, install, usage examples, CLI flags, config file format
- [ ] **No LICENSE file.** `package.json` says MIT but no `LICENSE` file exists
- [ ] **Missing package.json fields:** `repository`, `homepage`, `author`, `engines`
- [ ] **No `prepublishOnly` script.** Should run `npm run build && npm test` to prevent publishing broken builds
- [ ] **Unused dependency.** `zod` is listed in dependencies but never imported anywhere — remove it or use it for config validation
- [ ] **Shebang on library entry.** `dist/index.js` (the library export) shouldn't have a shebang — only `dist/cli/index.js` needs it. The tsup config fix may not be working correctly (verify `head -1 dist/index.js`)

## Should fix

- [ ] **No end-to-end CLI tests.** Unit tests cover core modules but no tests exercise the actual CLI binary (exit codes, flag combinations, error messages)
- [ ] **`dist/index.js` only re-exports types.** The library entry point (`main` field) only exports types — consider also exporting core functions (`scanFiles`, `packFiles`, `scoreFiles`) for programmatic use
- [ ] **No `exports` field in package.json.** Modern Node.js packages should use the `exports` map for proper ESM resolution
- [ ] **`--ai` flag has no test coverage.** The semantic ranker is untested (understandable since it calls an API, but at least test the prompt builder and response parser)
- [ ] **Config loading not tested.** `src/core/config.ts` has no test file

## Nice to have

- [ ] **Add `npm run prepublish` dry-run step** to preview what gets published
- [ ] **Add GitHub Actions CI** for test/lint/build on push
- [ ] **Add `npx context-pack` smoke test** after build to verify the bin works end-to-end
- [ ] **Consider `--clipboard` flag** as alternative to `| pbcopy` (cross-platform)

---

## Suggested package.json changes

```jsonc
{
  "name": "@umar/context-pack",
  "version": "0.1.0",
  "description": "Optimal context window builder for AI agents",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "context-pack": "dist/cli/index.js"
  },
  "files": [
    "dist"
  ],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/umxr/context-pack"
  },
  "homepage": "https://github.com/umxr/context-pack#readme",
  "author": "umxr <umarg1997@gmail.com>",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "prepublishOnly": "npm run build && npm test"
    // ... existing scripts
  }
}
```

## Publish steps (once checklist is green)

```bash
npm login                    # if not already logged in
npm run build && npm test    # verify everything passes
npm pack --dry-run           # review what gets published (should be ~5 files)
npm publish --access public  # scoped packages need --access public on first publish
```
