import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { detectLanguage, isBinaryFile, scanFiles } from "../../src/core/scanner.js";

const FIXTURE_DIR = resolve(__dirname, "../fixtures/sample-project");

describe("scanner", () => {
	describe("scanFiles", () => {
		it("scans all files in fixture project", async () => {
			const files = await scanFiles({ cwd: FIXTURE_DIR });

			expect(files.length).toBeGreaterThan(0);

			const paths = files.map((f) => f.path);
			expect(paths).toContain("src/index.ts");
			expect(paths).toContain("src/auth/login.ts");
			expect(paths).toContain("src/auth/session.ts");
			expect(paths).toContain("src/auth/types.ts");
			expect(paths).toContain("src/db/client.ts");
			expect(paths).toContain("src/db/queries.ts");
			expect(paths).toContain("src/utils/hash.ts");
		});

		it("includes docs and config files", async () => {
			const files = await scanFiles({ cwd: FIXTURE_DIR });
			const paths = files.map((f) => f.path);

			expect(paths).toContain("docs/specs/auth.md");
			expect(paths).toContain("package.json");
			expect(paths).toContain("tsconfig.json");
		});

		it("excludes node_modules and .git", async () => {
			const files = await scanFiles({ cwd: FIXTURE_DIR });
			const paths = files.map((f) => f.path);

			for (const p of paths) {
				expect(p).not.toContain("node_modules");
				expect(p).not.toContain(".git");
			}
		});

		it("populates file content and token counts", async () => {
			const files = await scanFiles({ cwd: FIXTURE_DIR });
			const loginFile = files.find((f) => f.path === "src/auth/login.ts");

			expect(loginFile).toBeDefined();
			expect(loginFile!.content).toContain("import");
			expect(loginFile!.content).toContain("login");
			expect(loginFile!.tokenCount).toBeGreaterThan(0);
		});

		it("detects language from extension", async () => {
			const files = await scanFiles({ cwd: FIXTURE_DIR });

			const tsFile = files.find((f) => f.path === "src/auth/login.ts");
			expect(tsFile!.language).toBe("typescript");

			const mdFile = files.find((f) => f.path === "docs/specs/auth.md");
			expect(mdFile!.language).toBe("markdown");

			const jsonFile = files.find((f) => f.path === "package.json");
			expect(jsonFile!.language).toBe("json");
		});

		it("respects include patterns", async () => {
			const files = await scanFiles({
				cwd: FIXTURE_DIR,
				include: ["src/**/*.ts"],
			});

			for (const f of files) {
				expect(f.path).toMatch(/^src\//);
				expect(f.path).toMatch(/\.ts$/);
			}
		});

		it("respects exclude patterns", async () => {
			const files = await scanFiles({
				cwd: FIXTURE_DIR,
				exclude: ["src/db/**"],
			});

			const paths = files.map((f) => f.path);
			expect(paths).not.toContain("src/db/client.ts");
			expect(paths).not.toContain("src/db/queries.ts");
		});
	});

	describe("detectLanguage", () => {
		it("maps typescript extensions", () => {
			expect(detectLanguage("foo.ts")).toBe("typescript");
			expect(detectLanguage("foo.tsx")).toBe("typescript");
		});

		it("maps javascript extensions", () => {
			expect(detectLanguage("foo.js")).toBe("javascript");
			expect(detectLanguage("foo.mjs")).toBe("javascript");
		});

		it("returns text for unknown extensions", () => {
			expect(detectLanguage("foo.xyz")).toBe("text");
		});
	});

	describe("isBinaryFile", () => {
		it("identifies binary extensions", () => {
			expect(isBinaryFile("photo.png")).toBe(true);
			expect(isBinaryFile("font.woff2")).toBe(true);
			expect(isBinaryFile("archive.zip")).toBe(true);
		});

		it("identifies non-binary extensions", () => {
			expect(isBinaryFile("code.ts")).toBe(false);
			expect(isBinaryFile("doc.md")).toBe(false);
		});
	});
});
