import { describe, expect, it } from "vitest";
import { countTokens, estimateTokens } from "../../src/core/tokenizer.js";

describe("tokenizer", () => {
	describe("countTokens", () => {
		it("returns 0 for empty string", () => {
			expect(countTokens("")).toBe(0);
		});

		it("counts tokens for simple text", () => {
			const count = countTokens("hello world");
			expect(count).toBeGreaterThan(0);
			expect(count).toBeLessThan(10);
		});

		it("counts tokens for code", () => {
			const code = `function login(username: string, password: string) {
  return authenticate(username, password);
}`;
			const count = countTokens(code);
			expect(count).toBeGreaterThan(10);
			expect(count).toBeLessThan(50);
		});

		it("handles multiline content", () => {
			const text = "line one\nline two\nline three\n";
			const count = countTokens(text);
			expect(count).toBeGreaterThan(0);
		});
	});

	describe("estimateTokens", () => {
		it("returns 0 for empty string", () => {
			expect(estimateTokens("")).toBe(0);
		});

		it("estimates roughly chars/4", () => {
			const text = "a".repeat(100);
			expect(estimateTokens(text)).toBe(25);
		});
	});
});
