import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, loadConfig } from "../../src/core/config.js";

describe("config", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(resolve(tmpdir(), "context-pack-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	describe("loadConfig", () => {
		it("returns defaults when no config file exists", async () => {
			const config = await loadConfig(tempDir);

			expect(config.tokenBudget).toBe(100000);
			expect(config.include).toEqual(["**/*"]);
			expect(config.exclude).toEqual([]);
			expect(config.alwaysInclude).toEqual([]);
			expect(config.weights).toEqual({
				entryExpansion: 0.4,
				keywordMatch: 0.4,
				semanticRank: 0.2,
			});
			expect(config.ai.provider).toBe("anthropic");
		});

		it("loads .contextpackrc.json", async () => {
			await writeFile(
				resolve(tempDir, ".contextpackrc.json"),
				JSON.stringify({
					tokenBudget: 50000,
					alwaysInclude: ["README.md"],
				}),
			);

			const config = await loadConfig(tempDir);

			expect(config.tokenBudget).toBe(50000);
			expect(config.alwaysInclude).toEqual(["README.md"]);
			// Defaults preserved for unset fields
			expect(config.include).toEqual(["**/*"]);
		});

		it("loads .contextpackrc (no .json extension)", async () => {
			await writeFile(resolve(tempDir, ".contextpackrc"), JSON.stringify({ tokenBudget: 75000 }));

			const config = await loadConfig(tempDir);

			expect(config.tokenBudget).toBe(75000);
		});

		it("loads contextpack.config.json", async () => {
			await writeFile(
				resolve(tempDir, "contextpack.config.json"),
				JSON.stringify({ tokenBudget: 25000 }),
			);

			const config = await loadConfig(tempDir);

			expect(config.tokenBudget).toBe(25000);
		});

		it("prefers .contextpackrc.json over other config files", async () => {
			await writeFile(
				resolve(tempDir, ".contextpackrc.json"),
				JSON.stringify({ tokenBudget: 10000 }),
			);
			await writeFile(
				resolve(tempDir, "contextpack.config.json"),
				JSON.stringify({ tokenBudget: 99999 }),
			);

			const config = await loadConfig(tempDir);

			expect(config.tokenBudget).toBe(10000);
		});

		it("overrides take precedence over file config", async () => {
			await writeFile(
				resolve(tempDir, ".contextpackrc.json"),
				JSON.stringify({ tokenBudget: 50000 }),
			);

			const config = await loadConfig(tempDir, { tokenBudget: 20000 });

			expect(config.tokenBudget).toBe(20000);
		});

		it("merges weights from file config", async () => {
			await writeFile(
				resolve(tempDir, ".contextpackrc.json"),
				JSON.stringify({
					weights: { entryExpansion: 0.6 },
				}),
			);

			const config = await loadConfig(tempDir);

			expect(config.weights.entryExpansion).toBe(0.6);
			// Other weights remain default
			expect(config.weights.keywordMatch).toBe(0.4);
			expect(config.weights.semanticRank).toBe(0.2);
		});

		it("overrides merge over file config weights", async () => {
			await writeFile(
				resolve(tempDir, ".contextpackrc.json"),
				JSON.stringify({
					weights: { entryExpansion: 0.6 },
				}),
			);

			const config = await loadConfig(tempDir, {
				weights: { entryExpansion: 0.1, keywordMatch: 0.9, semanticRank: 0 },
			});

			expect(config.weights.entryExpansion).toBe(0.1);
			expect(config.weights.keywordMatch).toBe(0.9);
		});

		it("handles invalid JSON gracefully", async () => {
			await writeFile(resolve(tempDir, ".contextpackrc.json"), "not valid json {{{");

			const config = await loadConfig(tempDir);

			// Falls back to defaults
			expect(config.tokenBudget).toBe(DEFAULT_CONFIG.tokenBudget);
		});

		it("merges ai config", async () => {
			await writeFile(
				resolve(tempDir, ".contextpackrc.json"),
				JSON.stringify({
					ai: { model: "claude-haiku-4-5-20251001" },
				}),
			);

			const config = await loadConfig(tempDir);

			expect(config.ai.model).toBe("claude-haiku-4-5-20251001");
			expect(config.ai.provider).toBe("anthropic"); // default preserved
		});
	});
});
