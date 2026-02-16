import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDependencyGraph } from "../../../src/core/graph.js";
import { scanFiles } from "../../../src/core/scanner.js";
import { scoreByEntryExpansion } from "../../../src/core/scorers/entry-expansion.js";

const FIXTURE_DIR = resolve(__dirname, "../../fixtures/sample-project");

describe("entry-expansion scorer", () => {
	it("scores entry point at 1.0", async () => {
		const files = await scanFiles({
			cwd: FIXTURE_DIR,
			include: ["src/**/*.ts"],
		});
		const graph = buildDependencyGraph(files, FIXTURE_DIR);

		const scores = scoreByEntryExpansion(files, graph, ["src/auth/login.ts"]);

		expect(scores.get("src/auth/login.ts")).toBe(1.0);
	});

	it("scores direct dependencies at ~0.8", async () => {
		const files = await scanFiles({
			cwd: FIXTURE_DIR,
			include: ["src/**/*.ts"],
		});
		const graph = buildDependencyGraph(files, FIXTURE_DIR);

		const scores = scoreByEntryExpansion(files, graph, ["src/auth/login.ts"]);

		const hashScore = scores.get("src/utils/hash.ts")!;
		expect(hashScore).toBeGreaterThanOrEqual(0.8);
		expect(hashScore).toBeLessThanOrEqual(0.9);
	});

	it("scores 2-hop dependencies at ~0.6", async () => {
		const files = await scanFiles({
			cwd: FIXTURE_DIR,
			include: ["src/**/*.ts"],
		});
		const graph = buildDependencyGraph(files, FIXTURE_DIR);

		const scores = scoreByEntryExpansion(files, graph, ["src/auth/login.ts"]);

		// db/client.ts is 2 hops from login.ts (login -> queries -> client)
		const clientScore = scores.get("src/db/client.ts")!;
		expect(clientScore).toBeGreaterThanOrEqual(0.6);
		expect(clientScore).toBeLessThanOrEqual(0.7);
	});

	it("scores unreachable files at 0", async () => {
		const files = await scanFiles({
			cwd: FIXTURE_DIR,
			include: ["src/**/*.ts"],
		});
		const graph = buildDependencyGraph(files, FIXTURE_DIR);

		const scores = scoreByEntryExpansion(files, graph, ["src/utils/hash.ts"]);

		// hash.ts doesn't import anything, so only it should be reachable
		expect(scores.get("src/utils/hash.ts")).toBe(1.0);
		expect(scores.get("src/auth/login.ts")).toBe(0);
	});

	it("returns all zeros when no entry points specified", async () => {
		const files = await scanFiles({
			cwd: FIXTURE_DIR,
			include: ["src/**/*.ts"],
		});
		const graph = buildDependencyGraph(files, FIXTURE_DIR);

		const scores = scoreByEntryExpansion(files, graph, []);

		for (const score of scores.values()) {
			expect(score).toBe(0);
		}
	});
});
