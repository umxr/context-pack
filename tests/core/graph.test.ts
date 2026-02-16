import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	buildDependencyGraph,
	getInDegree,
	getTransitiveDependencies,
} from "../../src/core/graph.js";
import { scanFiles } from "../../src/core/scanner.js";

const FIXTURE_DIR = resolve(__dirname, "../fixtures/sample-project");

describe("graph", () => {
	describe("buildDependencyGraph", () => {
		it("builds graph from fixture project", async () => {
			const files = await scanFiles({
				cwd: FIXTURE_DIR,
				include: ["src/**/*.ts"],
			});
			const graph = buildDependencyGraph(files, FIXTURE_DIR);

			expect(graph.nodes.size).toBe(files.length);
			expect(graph.edges.size).toBe(files.length);
			expect(graph.reverseEdges.size).toBe(files.length);
		});

		it("resolves imports between files", async () => {
			const files = await scanFiles({
				cwd: FIXTURE_DIR,
				include: ["src/**/*.ts"],
			});
			const graph = buildDependencyGraph(files, FIXTURE_DIR);

			// login.ts imports from utils/hash and db/queries and auth/types
			const loginEdges = graph.edges.get("src/auth/login.ts");
			expect(loginEdges).toBeDefined();
			expect(loginEdges!.has("src/utils/hash.ts")).toBe(true);
			expect(loginEdges!.has("src/db/queries.ts")).toBe(true);
			expect(loginEdges!.has("src/auth/types.ts")).toBe(true);
		});

		it("builds reverse edges", async () => {
			const files = await scanFiles({
				cwd: FIXTURE_DIR,
				include: ["src/**/*.ts"],
			});
			const graph = buildDependencyGraph(files, FIXTURE_DIR);

			// types.ts is imported by login.ts and session.ts
			const typeImporters = graph.reverseEdges.get("src/auth/types.ts");
			expect(typeImporters).toBeDefined();
			expect(typeImporters!.has("src/auth/login.ts")).toBe(true);
			expect(typeImporters!.has("src/auth/session.ts")).toBe(true);
		});
	});

	describe("getTransitiveDependencies", () => {
		it("returns distances from entry point", async () => {
			const files = await scanFiles({
				cwd: FIXTURE_DIR,
				include: ["src/**/*.ts"],
			});
			const graph = buildDependencyGraph(files, FIXTURE_DIR);

			const distances = getTransitiveDependencies(graph, ["src/auth/login.ts"]);

			expect(distances.get("src/auth/login.ts")).toBe(0);
			expect(distances.get("src/utils/hash.ts")).toBe(1);
			expect(distances.get("src/db/queries.ts")).toBe(1);
			expect(distances.get("src/auth/types.ts")).toBe(1);
			// db/client.ts is imported by db/queries.ts, so distance 2
			expect(distances.get("src/db/client.ts")).toBe(2);
		});

		it("handles multiple entry points", async () => {
			const files = await scanFiles({
				cwd: FIXTURE_DIR,
				include: ["src/**/*.ts"],
			});
			const graph = buildDependencyGraph(files, FIXTURE_DIR);

			const distances = getTransitiveDependencies(graph, [
				"src/auth/login.ts",
				"src/auth/session.ts",
			]);

			// Both entry points at distance 0
			expect(distances.get("src/auth/login.ts")).toBe(0);
			expect(distances.get("src/auth/session.ts")).toBe(0);
			// types.ts is direct dep of both
			expect(distances.get("src/auth/types.ts")).toBe(1);
		});

		it("handles non-existent entry points gracefully", async () => {
			const files = await scanFiles({
				cwd: FIXTURE_DIR,
				include: ["src/**/*.ts"],
			});
			const graph = buildDependencyGraph(files, FIXTURE_DIR);

			const distances = getTransitiveDependencies(graph, ["nonexistent.ts"]);
			expect(distances.size).toBe(0);
		});
	});

	describe("getInDegree", () => {
		it("calculates in-degrees for subgraph", async () => {
			const files = await scanFiles({
				cwd: FIXTURE_DIR,
				include: ["src/**/*.ts"],
			});
			const graph = buildDependencyGraph(files, FIXTURE_DIR);

			const allPaths = new Set(files.map((f) => f.path));
			const inDegrees = getInDegree(graph, allPaths);

			// types.ts is imported by login.ts, session.ts, and queries.ts
			expect(inDegrees.get("src/auth/types.ts")).toBeGreaterThanOrEqual(2);

			// hash.ts is imported by login.ts only
			expect(inDegrees.get("src/utils/hash.ts")).toBe(1);
		});
	});
});
