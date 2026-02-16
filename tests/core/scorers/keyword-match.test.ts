import { describe, expect, it } from "vitest";
import { extractKeywords, scoreByKeywordMatch } from "../../../src/core/scorers/keyword-match.js";
import type { FileEntry } from "../../../src/core/types.js";

function makeFile(path: string, content: string): FileEntry {
	return {
		path,
		absolutePath: `/test/${path}`,
		content,
		tokenCount: 100,
		language: path.endsWith(".md") ? "markdown" : "typescript",
		imports: [],
		exports: [],
	};
}

describe("keyword-match scorer", () => {
	describe("extractKeywords", () => {
		it("extracts words from task description", () => {
			const keywords = extractKeywords("fix the login session timeout bug");
			expect(keywords).toContain("fix");
			expect(keywords).toContain("login");
			expect(keywords).toContain("session");
			expect(keywords).toContain("timeout");
			expect(keywords).toContain("bug");
		});

		it("removes stop words", () => {
			const keywords = extractKeywords("fix the login session timeout bug");
			expect(keywords).not.toContain("the");
		});

		it("splits camelCase", () => {
			const keywords = extractKeywords("fix loginSession");
			expect(keywords).toContain("login");
			expect(keywords).toContain("session");
		});

		it("handles single word", () => {
			const keywords = extractKeywords("authentication");
			expect(keywords).toContain("authentication");
		});

		it("deduplicates keywords", () => {
			const keywords = extractKeywords("login login session login");
			const loginCount = keywords.filter((k) => k === "login").length;
			expect(loginCount).toBe(1);
		});
	});

	describe("scoreByKeywordMatch", () => {
		const files = [
			makeFile("src/auth/login.ts", "export function login(username, password) {}"),
			makeFile("src/auth/session.ts", "export function createSession(user) {}"),
			makeFile("src/utils/hash.ts", "export function hashPassword(pw) {}"),
			makeFile("docs/specs/auth.md", "# Authentication\nHandles login and session management"),
		];

		it("scores files with keyword matches higher", () => {
			const keywords = extractKeywords("fix the login bug");
			const scores = scoreByKeywordMatch(files, keywords);

			const loginScore = scores.get("src/auth/login.ts")!;
			const hashScore = scores.get("src/utils/hash.ts")!;

			// login.ts should score higher than hash.ts for "login" task
			expect(loginScore).toBeGreaterThan(hashScore);
		});

		it("boosts doc/spec files", () => {
			const keywords = extractKeywords("login session");
			const scores = scoreByKeywordMatch(files, keywords);

			const authMdScore = scores.get("docs/specs/auth.md")!;
			// Doc with keyword matches should get a meaningful score
			expect(authMdScore).toBeGreaterThan(0);
		});

		it("returns zeros for no keywords", () => {
			const scores = scoreByKeywordMatch(files, []);
			for (const score of scores.values()) {
				expect(score).toBe(0);
			}
		});

		it("normalizes scores to 0-1 range", () => {
			const keywords = extractKeywords("login session authentication");
			const scores = scoreByKeywordMatch(files, keywords);

			for (const score of scores.values()) {
				expect(score).toBeGreaterThanOrEqual(0);
				expect(score).toBeLessThanOrEqual(1);
			}
		});

		it("matches path components", () => {
			const keywords = extractKeywords("auth module");
			const scores = scoreByKeywordMatch(files, keywords);

			// Files with "auth" in path should score higher
			const loginScore = scores.get("src/auth/login.ts")!;
			const hashScore = scores.get("src/utils/hash.ts")!;
			expect(loginScore).toBeGreaterThan(hashScore);
		});
	});
});
