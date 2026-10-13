import { describe, expect, it } from "vitest";

import { KEDMANEE_PAIRS, hasThai, thaiToLatin } from "../src/posapp/utils/thaiKeyMap";

describe("thaiToLatin", () => {
	it("maps every Thai key of the table back to its Latin key", () => {
		for (const [latin, thai] of KEDMANEE_PAIRS) {
			if (hasThai(thai)) expect(thaiToLatin(thai)).toBe(latin);
			else expect(thaiToLatin(`ก${thai}`)).toBe(`d${latin}`);
		}
	});

	it("turns a barcode typed on the Thai layout back into digits", () => {
		// 8850999320 on the number row: 8=ค 5=ถ 0=จ 9=ต 3=- 2=/
		expect(thaiToLatin("คคถจตตต-/จ")).toBe("8850999320");
	});

	it("leaves Latin text and digits unchanged", () => {
		expect(thaiToLatin("8850999320")).toBe("8850999320");
		expect(thaiToLatin("ABC-123")).toBe("ABC-123");
	});

	it("handles empty input", () => {
		expect(thaiToLatin("")).toBe("");
	});
});

describe("hasThai", () => {
	it("detects Thai characters", () => {
		expect(hasThai("ค8")).toBe(true);
		expect(hasThai("8850")).toBe(false);
	});
});
