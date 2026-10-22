import { describe, expect, it } from "vitest";

import { isCoarsePointer, scanBoxInputMode } from "../src/posapp/utils/touchKeyboard";

describe("touch keyboard", () => {
	it("detects a coarse pointer", () => {
		expect(isCoarsePointer((q) => ({ matches: q === "(pointer: coarse)" }))).toBe(true);
		expect(isCoarsePointer(() => ({ matches: false }))).toBe(false);
	});

	it("treats a missing or throwing matchMedia as a mouse PC", () => {
		expect(isCoarsePointer(undefined)).toBe(false);
		expect(isCoarsePointer(null)).toBe(false);
		expect(
			isCoarsePointer(() => {
				throw new Error("nope");
			}),
		).toBe(false);
	});

	it("hides the soft keyboard on touch until asked", () => {
		expect(scanBoxInputMode(true, false)).toBe("none");
		expect(scanBoxInputMode(true, true)).toBeUndefined();
	});

	it("never changes the box on a PC", () => {
		expect(scanBoxInputMode(false, false)).toBeUndefined();
		expect(scanBoxInputMode(false, true)).toBeUndefined();
	});
});
