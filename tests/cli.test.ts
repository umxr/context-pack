import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI = resolve(__dirname, "../src/cli/index.ts");
const FIXTURE = resolve(__dirname, "fixtures/sample-project");

function run(
	args: string[],
	options: { stdin?: string } = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	return new Promise((resolve) => {
		const child = execFile(
			"npx",
			["tsx", CLI, ...args],
			{ timeout: 15000 },
			(error, stdout, stderr) => {
				resolve({
					stdout: stdout.toString(),
					stderr: stderr.toString(),
					exitCode: error?.code ? Number(error.code) : (child.exitCode ?? 0),
				});
			},
		);
		if (options.stdin) {
			child.stdin?.write(options.stdin);
			child.stdin?.end();
		}
	});
}

describe("CLI end-to-end", () => {
	describe("basic usage", () => {
		it("outputs markdown by default", async () => {
			const { stdout, exitCode } = await run(["fix the login bug", "--codebase", FIXTURE]);

			expect(exitCode).toBe(0);
			expect(stdout).toContain("# Context Pack");
			expect(stdout).toContain("**Task:** fix the login bug");
			expect(stdout).toContain("## File:");
		});

		it("exits 2 with no task description", async () => {
			const { stderr, exitCode } = await run(["--codebase", FIXTURE]);

			expect(exitCode).toBe(2);
			expect(stderr).toContain("No task description provided");
		});

		it("exits 1 for nonexistent codebase", async () => {
			const { stderr, exitCode } = await run(["some task", "--codebase", "/nonexistent/path/xyz"]);

			expect(exitCode).toBe(1);
		});
	});

	describe("output formats", () => {
		it("--format json outputs valid JSON", async () => {
			const { stdout, exitCode } = await run([
				"fix login",
				"--codebase",
				FIXTURE,
				"--format",
				"json",
			]);

			expect(exitCode).toBe(0);
			const parsed = JSON.parse(stdout);
			expect(parsed).toHaveProperty("files");
			expect(parsed).toHaveProperty("totalTokens");
			expect(parsed).toHaveProperty("budgetTokens");
			expect(parsed).toHaveProperty("budgetUsedPercent");
			expect(Array.isArray(parsed.files)).toBe(true);
		});

		it("--json shorthand works", async () => {
			const { stdout, exitCode } = await run(["fix login", "--codebase", FIXTURE, "--json"]);

			expect(exitCode).toBe(0);
			const parsed = JSON.parse(stdout);
			expect(parsed).toHaveProperty("files");
		});

		it("--format filelist outputs one path per line", async () => {
			const { stdout, exitCode } = await run([
				"fix login",
				"--codebase",
				FIXTURE,
				"--format",
				"filelist",
			]);

			expect(exitCode).toBe(0);
			const lines = stdout.trim().split("\n");
			expect(lines.length).toBeGreaterThan(0);
			for (const line of lines) {
				expect(line).not.toContain(" ");
			}
		});
	});

	describe("flags", () => {
		it("--budget limits total tokens", async () => {
			const { stdout, exitCode } = await run([
				"fix login",
				"--codebase",
				FIXTURE,
				"--json",
				"--budget",
				"300",
			]);

			expect(exitCode).toBe(0);
			const parsed = JSON.parse(stdout);
			expect(parsed.totalTokens).toBeLessThanOrEqual(300);
			expect(parsed.budgetTokens).toBe(300);
			expect(parsed.excluded.length).toBeGreaterThan(0);
		});

		it("--entry includes dependency graph files", async () => {
			const { stdout, exitCode } = await run([
				"fix login",
				"--codebase",
				FIXTURE,
				"--json",
				"--entry",
				"src/auth/login.ts",
			]);

			expect(exitCode).toBe(0);
			const parsed = JSON.parse(stdout);
			const paths = parsed.files.map((f: { path: string }) => f.path);
			expect(paths).toContain("src/auth/login.ts");

			// login.ts entry should score highest
			expect(parsed.files[0].path).toBe("src/auth/login.ts");
			expect(parsed.files[0].scoreBreakdown.entryExpansion).toBeGreaterThan(0);
		});

		it("--dry-run shows scores without file contents", async () => {
			const { stdout, exitCode } = await run(["fix login", "--codebase", FIXTURE, "--dry-run"]);

			expect(exitCode).toBe(0);
			expect(stdout).toContain("Files to pack:");
			expect(stdout).toContain("Total:");
			expect(stdout).toContain("tok");
			// Should NOT contain actual file contents
			expect(stdout).not.toContain("```");
		});

		it("--verbose outputs info to stderr", async () => {
			const { stderr, exitCode } = await run([
				"fix login",
				"--codebase",
				FIXTURE,
				"--format",
				"filelist",
				"--verbose",
			]);

			expect(exitCode).toBe(0);
			expect(stderr).toContain("[context-pack] Scanning");
			expect(stderr).toContain("[context-pack] Found");
			expect(stderr).toContain("[context-pack] Packed");
		});

		it("--always-include forces file into output", async () => {
			const { stdout, exitCode } = await run([
				"fix login",
				"--codebase",
				FIXTURE,
				"--json",
				"--always-include",
				"tsconfig.json",
			]);

			expect(exitCode).toBe(0);
			const parsed = JSON.parse(stdout);
			const paths = parsed.files.map((f: { path: string }) => f.path);
			expect(paths).toContain("tsconfig.json");
		});
	});

	describe("input methods", () => {
		it("--stdin reads task from stdin", async () => {
			const { stdout, exitCode } = await run(
				["--stdin", "--codebase", FIXTURE, "--format", "filelist"],
				{ stdin: "fix the login bug" },
			);

			expect(exitCode).toBe(0);
			expect(stdout.trim().split("\n").length).toBeGreaterThan(0);
		});

		it("--version outputs version", async () => {
			const { stdout } = await run(["--version"]);

			expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
		});
	});

	describe("--out flag", () => {
		let outDir: string;

		beforeEach(async () => {
			outDir = await mkdtemp(resolve(tmpdir(), "context-pack-out-"));
		});

		afterEach(async () => {
			await rm(outDir, { recursive: true });
		});

		it("writes output to file", async () => {
			const outFile = resolve(outDir, "output.md");
			const { exitCode } = await run(["fix login", "--codebase", FIXTURE, "--out", outFile]);

			expect(exitCode).toBe(0);
			const content = await readFile(outFile, "utf-8");
			expect(content).toContain("# Context Pack");
		});
	});
});
