import { describe, expect, it } from "vitest";
import {
	extractExportNames,
	getFilePreview,
	parseRankResponse,
} from "../../../src/core/scorers/semantic-rank.js";
import {
	RANK_RELEVANCE_VERSION,
	buildRankRelevancePrompt,
} from "../../../src/prompts/rank-relevance.js";

describe("semantic-rank", () => {
	describe("parseRankResponse", () => {
		it("parses valid JSON array", () => {
			const input = JSON.stringify([
				{ path: "src/auth/login.ts", relevance: 0.9, reason: "Critical file" },
				{ path: "src/utils/hash.ts", relevance: 0.3, reason: "Helper" },
			]);

			const result = parseRankResponse(input);

			expect(result).toHaveLength(2);
			expect(result[0].path).toBe("src/auth/login.ts");
			expect(result[0].relevance).toBe(0.9);
			expect(result[1].path).toBe("src/utils/hash.ts");
		});

		it("extracts JSON from markdown code fence", () => {
			const input = `Here are the rankings:

\`\`\`json
[
  {"path": "src/auth/login.ts", "relevance": 0.85, "reason": "Main file"}
]
\`\`\``;

			const result = parseRankResponse(input);

			expect(result).toHaveLength(1);
			expect(result[0].path).toBe("src/auth/login.ts");
			expect(result[0].relevance).toBe(0.85);
		});

		it("extracts JSON from code fence without language tag", () => {
			const input = `\`\`\`
[{"path": "a.ts", "relevance": 0.5, "reason": "test"}]
\`\`\``;

			const result = parseRankResponse(input);

			expect(result).toHaveLength(1);
		});

		it("returns empty array for invalid JSON", () => {
			const result = parseRankResponse("this is not json at all");

			expect(result).toEqual([]);
		});

		it("returns empty array for non-array JSON", () => {
			const result = parseRankResponse('{"not": "an array"}');

			expect(result).toEqual([]);
		});

		it("returns empty array for empty string", () => {
			const result = parseRankResponse("");

			expect(result).toEqual([]);
		});
	});

	describe("extractExportNames", () => {
		it("extracts function exports", () => {
			const content = `export function login() {}
export async function logout() {}`;

			const names = extractExportNames(content, "typescript");

			expect(names).toContain("login");
			expect(names).toContain("logout");
		});

		it("extracts const/let/var exports", () => {
			const content = `export const API_KEY = "test";
export let count = 0;
export var legacy = true;`;

			const names = extractExportNames(content, "typescript");

			expect(names).toContain("API_KEY");
			expect(names).toContain("count");
			expect(names).toContain("legacy");
		});

		it("extracts class and type exports", () => {
			const content = `export class AuthService {}
export interface UserProps {}
export type Session = { id: string };
export enum Role { Admin, User }`;

			const names = extractExportNames(content, "typescript");

			expect(names).toContain("AuthService");
			expect(names).toContain("UserProps");
			expect(names).toContain("Session");
			expect(names).toContain("Role");
		});

		it("extracts default exports with names", () => {
			const content = "export default class App {}";

			const names = extractExportNames(content, "typescript");

			expect(names).toContain("App");
		});

		it("returns empty array for non-TS/JS files", () => {
			const content = "def login(): pass";

			const names = extractExportNames(content, "python");

			expect(names).toEqual([]);
		});

		it("returns empty array for no exports", () => {
			const content = "const internal = 42;";

			const names = extractExportNames(content, "typescript");

			expect(names).toEqual([]);
		});
	});

	describe("getFilePreview", () => {
		it("returns first 5 lines by default", () => {
			const content = "line1\nline2\nline3\nline4\nline5\nline6\nline7";

			const preview = getFilePreview(content);

			expect(preview).toBe("line1\nline2\nline3\nline4\nline5");
		});

		it("returns all lines if fewer than limit", () => {
			const content = "line1\nline2";

			const preview = getFilePreview(content);

			expect(preview).toBe("line1\nline2");
		});

		it("respects custom line count", () => {
			const content = "line1\nline2\nline3\nline4\nline5";

			const preview = getFilePreview(content, 2);

			expect(preview).toBe("line1\nline2");
		});
	});

	describe("buildRankRelevancePrompt", () => {
		it("builds system and user prompts", () => {
			const { system, user } = buildRankRelevancePrompt("fix login bug", [
				{
					path: "src/auth/login.ts",
					language: "typescript",
					tokenCount: 100,
					preview: "export function login() {}",
					exports: ["login"],
				},
			]);

			expect(system).toContain("code relevance ranker");
			expect(system).toContain("JSON array");
			expect(user).toContain("fix login bug");
			expect(user).toContain("src/auth/login.ts");
			expect(user).toContain("Exports: login");
		});

		it("omits exports line when no exports", () => {
			const { user } = buildRankRelevancePrompt("task", [
				{
					path: "readme.md",
					language: "markdown",
					tokenCount: 50,
					preview: "# Readme",
					exports: [],
				},
			]);

			expect(user).not.toContain("Exports:");
		});

		it("has a version", () => {
			expect(RANK_RELEVANCE_VERSION).toBe("1.0");
		});
	});
});
