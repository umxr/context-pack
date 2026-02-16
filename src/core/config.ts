import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ContextPackConfig } from "./types.js";

const DEFAULT_CONFIG: ContextPackConfig = {
	tokenBudget: 100000,
	include: ["**/*"],
	exclude: [],
	alwaysInclude: [],
	weights: {
		entryExpansion: 0.4,
		keywordMatch: 0.4,
		semanticRank: 0.2,
	},
	ai: {
		provider: "anthropic",
		model: "claude-sonnet-4-20250514",
	},
};

const CONFIG_FILENAMES = [".contextpackrc.json", ".contextpackrc", "contextpack.config.json"];

export async function loadConfig(
	cwd: string,
	overrides: Partial<ContextPackConfig> = {},
): Promise<ContextPackConfig> {
	let fileConfig: Partial<ContextPackConfig> = {};

	for (const filename of CONFIG_FILENAMES) {
		const configPath = resolve(cwd, filename);
		if (existsSync(configPath)) {
			try {
				const raw = await readFile(configPath, "utf-8");
				fileConfig = JSON.parse(raw);
			} catch {
				// Invalid config file, skip
			}
			break;
		}
	}

	return {
		tokenBudget: overrides.tokenBudget ?? fileConfig.tokenBudget ?? DEFAULT_CONFIG.tokenBudget,
		include: overrides.include ?? fileConfig.include ?? DEFAULT_CONFIG.include,
		exclude: overrides.exclude ?? fileConfig.exclude ?? DEFAULT_CONFIG.exclude,
		alwaysInclude:
			overrides.alwaysInclude ?? fileConfig.alwaysInclude ?? DEFAULT_CONFIG.alwaysInclude,
		weights: {
			...DEFAULT_CONFIG.weights,
			...fileConfig.weights,
			...overrides.weights,
		},
		ai: {
			...DEFAULT_CONFIG.ai,
			...fileConfig.ai,
			...overrides.ai,
		},
	};
}

export { DEFAULT_CONFIG };
