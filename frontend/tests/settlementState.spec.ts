import { afterEach, describe, expect, it } from "vitest";

import { settlementBadge, settlementStateOf } from "../src/posapp/utils/settlementState";

describe("settlement state", () => {
	it("above zero is still to pay, below zero is change", () => {
		expect(settlementStateOf(38)).toBe("remaining");
		expect(settlementStateOf(-62)).toBe("change");
		expect(settlementStateOf(0)).toBe("balanced");
	});

	it("rounding noise is balanced, not a debt", () => {
		expect(settlementStateOf(0.0000001)).toBe("balanced");
		expect(settlementStateOf(-0.004)).toBe("balanced");
		expect(settlementStateOf(0.01)).toBe("remaining");
	});

	it("treats junk as balanced", () => {
		expect(settlementStateOf(undefined)).toBe("balanced");
		expect(settlementStateOf("x")).toBe("balanced");
	});
});

describe("settlement badge", () => {
	afterEach(() => {
		delete (globalThis as any).__;
	});

	it("says each state in words with its own icon", () => {
		const badges = (["remaining", "change", "balanced"] as const).map(settlementBadge);
		expect(badges.map((b) => b.text)).toEqual(["Not enough yet", "Give change", "Paid in full"]);
		expect(new Set(badges.map((b) => b.icon)).size).toBe(3);
	});

	it("translates through the global __", () => {
		(globalThis as any).__ = (text: string) => `th:${text}`;
		expect(settlementBadge("balanced").text).toBe("th:Paid in full");
	});
});
