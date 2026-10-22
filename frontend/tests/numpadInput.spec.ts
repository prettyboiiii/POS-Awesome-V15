import { describe, expect, it } from "vitest";

import {
	applyNumpadKey,
	isNumpadKind,
	numpadAttrs,
	numpadDisplay,
	numpadOpensOnFocus,
	type NumpadState,
} from "../src/posapp/utils/numpadInput";

const at = (value: string, start = value.length, end = start): NumpadState => ({ value, start, end });

describe("numpad keys", () => {
	it("digits go in at the caret", () => {
		expect(applyNumpadKey(at("12", 1), "5", "integer")).toEqual(at("152", 2));
		expect(applyNumpadKey(at(""), "7", "integer")).toEqual(at("7", 1));
	});

	it("a digit replaces a selection, as the first key after focus does", () => {
		expect(applyNumpadKey(at("100.00", 0, 6), "5", "decimal")).toEqual(at("5", 1));
	});

	it("backspace deletes before the caret, or the selection", () => {
		expect(applyNumpadKey(at("123"), "back", "integer")).toEqual(at("12", 2));
		expect(applyNumpadKey(at("123", 1), "back", "integer")).toEqual(at("23", 0));
		expect(applyNumpadKey(at("123", 0), "back", "integer")).toEqual(at("123", 0));
		expect(applyNumpadKey(at("123", 0, 3), "back", "integer")).toEqual(at("", 0));
	});

	it("clear empties the value", () => {
		expect(applyNumpadKey(at("123"), "clear", "decimal")).toEqual(at("", 0));
	});

	it("a point is only for decimals and only once", () => {
		expect(applyNumpadKey(at("12"), ".", "decimal")).toEqual(at("12.", 3));
		expect(applyNumpadKey(at("12.5"), ".", "decimal")).toEqual(at("12.5", 4));
		expect(applyNumpadKey(at("12"), ".", "integer")).toEqual(at("12", 2));
		expect(applyNumpadKey(at("12"), ".", "pin")).toEqual(at("12", 2));
	});

	it("a point on an empty field reads 0.", () => {
		expect(applyNumpadKey(at(""), ".", "decimal")).toEqual(at("0.", 2));
		expect(applyNumpadKey(at("5.5", 0, 3), ".", "decimal")).toEqual(at("0.", 2));
	});

	it("a point can replace a selected point", () => {
		expect(applyNumpadKey(at("1.5", 1, 2), ".", "decimal")).toEqual(at("1.5", 2));
	});

	it("the multiplier takes at most three digits", () => {
		expect(applyNumpadKey(at("12"), "3", "multiplier")).toEqual(at("123", 3));
		expect(applyNumpadKey(at("123"), "4", "multiplier")).toEqual(at("123", 3));
		expect(applyNumpadKey(at("123", 0, 3), "4", "multiplier")).toEqual(at("4", 1));
	});

	it("survives a missing or out of range selection", () => {
		expect(applyNumpadKey({ value: "12", start: 99, end: 99 }, "3", "integer")).toEqual(at("123", 3));
		expect(applyNumpadKey({ value: "12", start: Number.NaN, end: Number.NaN }, "3", "integer").value).toBe("123");
		expect(applyNumpadKey({ value: undefined as unknown as string, start: 0, end: 0 }, "3", "integer").value).toBe("3");
	});

	it("an unknown key does nothing", () => {
		expect(applyNumpadKey(at("12"), "x" as never, "integer")).toEqual(at("12", 2));
	});
});

describe("numpad display and attributes", () => {
	it("masks a PIN and shows the rest as typed", () => {
		expect(numpadDisplay("1234", "pin")).toBe("••••");
		expect(numpadDisplay("12.5", "decimal")).toBe("12.5");
	});

	it("suppresses the soft keyboard on touch only", () => {
		expect(numpadAttrs("decimal", true, "Amount")).toEqual({
			"data-numpad": "decimal",
			"data-numpad-label": "Amount",
			inputmode: "none",
		});
		expect(numpadAttrs("decimal", false).inputmode).toBe("decimal");
		expect(numpadAttrs("pin", false).inputmode).toBe("numeric");
		expect(numpadAttrs("pin", false)["data-numpad-label"]).toBeUndefined();
	});

	it("only a PIN field opens by focus", () => {
		expect(numpadOpensOnFocus("pin")).toBe(true);
		expect(numpadOpensOnFocus("decimal")).toBe(false);
		expect(numpadOpensOnFocus("integer")).toBe(false);
	});

	it("knows its kinds", () => {
		expect(isNumpadKind("pin")).toBe(true);
		expect(isNumpadKind("other")).toBe(false);
		expect(isNumpadKind(null)).toBe(false);
	});
});
