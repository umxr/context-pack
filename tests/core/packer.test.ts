import { describe, expect, it } from "vitest";
import { packFiles } from "../../src/core/packer.js";
import type { ScoredFile } from "../../src/core/types.js";

function makeScoredFile(path: string, tokenCount: number, score: number): ScoredFile {
	return {
		path,
		absolutePath: `/test/${path}`,
		content: "x".repeat(tokenCount * 4),
		tokenCount,
		language: "typescript",
		imports: [],
		exports: [],
		score,
		scoreBreakdown: { entryExpansion: 0, keywordMatch: score, semanticRank: 0 },
		reason: "test",
	};
}

describe("packer", () => {
	it("packs files within budget", () => {
		const files = [
			makeScoredFile("a.ts", 100, 0.9),
			makeScoredFile("b.ts", 200, 0.8),
			makeScoredFile("c.ts", 300, 0.7),
		];

		const result = packFiles(files, 500);

		// a.ts (100 + 20 wrapper) + b.ts (200 + 20) = 340, fits
		// c.ts (300 + 20) would bring to 660, doesn't fit
		expect(result.files.length).toBe(2);
		expect(result.excluded.length).toBe(1);
		expect(result.totalTokens).toBeLessThanOrEqual(500);
	});

	it("respects always-include files", () => {
		const files = [
			makeScoredFile("important.md", 400, 0.1), // low score but always included
			makeScoredFile("a.ts", 100, 0.9),
		];

		const result = packFiles(files, 600, ["important.md"]);

		const paths = result.files.map((f) => f.path);
		expect(paths).toContain("important.md");
		expect(paths).toContain("a.ts");
	});

	it("skips files that don't fit but continues trying", () => {
		const files = [makeScoredFile("big.ts", 900, 0.9), makeScoredFile("small.ts", 50, 0.5)];

		const result = packFiles(files, 100);

		// big.ts doesn't fit (900 + 20 > 100), but small.ts does (50 + 20 < 100)
		expect(result.files.length).toBe(1);
		expect(result.files[0].path).toBe("small.ts");
		expect(result.excluded.length).toBe(1);
	});

	it("handles zero budget", () => {
		const files = [makeScoredFile("a.ts", 100, 0.9)];

		const result = packFiles(files, 0);

		expect(result.files.length).toBe(0);
		expect(result.excluded.length).toBe(1);
	});

	it("handles empty file list", () => {
		const result = packFiles([], 1000);

		expect(result.files.length).toBe(0);
		expect(result.excluded.length).toBe(0);
		expect(result.totalTokens).toBe(0);
	});

	it("calculates budget used percentage", () => {
		const files = [makeScoredFile("a.ts", 80, 0.9)]; // 80 + 20 = 100

		const result = packFiles(files, 1000);

		expect(result.budgetUsedPercent).toBe(10);
		expect(result.budgetTokens).toBe(1000);
	});

	it("includes all files when budget is large enough", () => {
		const files = [
			makeScoredFile("a.ts", 100, 0.9),
			makeScoredFile("b.ts", 200, 0.8),
			makeScoredFile("c.ts", 300, 0.7),
		];

		const result = packFiles(files, 100000);

		expect(result.files.length).toBe(3);
		expect(result.excluded.length).toBe(0);
	});
});
