import { describe, expect, it } from "vitest";

import { multiplierFromKey, splitInlineMultiplier } from "../src/posapp/utils/scanMultiplier";

describe("scan multiplier", () => {
	it("takes digits followed by *", () => {
		expect(multiplierFromKey("5", "*")).toBe(5);
		expect(multiplierFromKey(" 12 ", "*")).toBe(12);
		expect(multiplierFromKey("999", "*")).toBe(999);
	});

	it("rejects other keys, zero, too large and non-numeric text", () => {
		expect(multiplierFromKey("5", "a")).toBeNull();
		expect(multiplierFromKey("0", "*")).toBeNull();
		expect(multiplierFromKey("1000", "*")).toBeNull();
		expect(multiplierFromKey("", "*")).toBeNull();
		expect(multiplierFromKey("5a", "*")).toBeNull();
		expect(multiplierFromKey("1.5", "*")).toBeNull();
	});

	it("splits an inline multiplier from a code", () => {
		expect(splitInlineMultiplier("5*8850999")).toEqual({ qty: 5, code: "8850999" });
		expect(splitInlineMultiplier("8850999")).toEqual({ qty: null, code: "8850999" });
		expect(splitInlineMultiplier("0*8850999")).toEqual({ qty: null, code: "0*8850999" });
	});
});
