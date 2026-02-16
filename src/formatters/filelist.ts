import type { PackResult } from "../core/types.js";

export function formatFilelist(result: PackResult): string {
	return result.files.map((f) => f.path).join("\n");
}
