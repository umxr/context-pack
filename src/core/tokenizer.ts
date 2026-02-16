import { encodingForModel } from "js-tiktoken";

let encoder: ReturnType<typeof encodingForModel> | null = null;

function getEncoder() {
	if (!encoder) {
		encoder = encodingForModel("gpt-4o");
	}
	return encoder;
}

export function countTokens(text: string): number {
	if (!text) return 0;
	return getEncoder().encode(text).length;
}

export function estimateTokens(text: string): number {
	if (!text) return 0;
	return Math.ceil(text.length / 4);
}
