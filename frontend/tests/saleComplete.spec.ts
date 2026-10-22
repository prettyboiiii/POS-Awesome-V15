import { describe, expect, it } from "vitest";

import { saleCompleteMayDismiss } from "../src/posapp/utils/saleComplete";

describe("sale complete dismiss", () => {
	it("the Next customer button always closes the card", () => {
		expect(saleCompleteMayDismiss("button", true)).toBe(true);
		expect(saleCompleteMayDismiss("button", false)).toBe(true);
	});

	it("with change to hand back, a tap, backdrop or key does not close it", () => {
		expect(saleCompleteMayDismiss("card", true)).toBe(false);
		expect(saleCompleteMayDismiss("scrim", true)).toBe(false);
		expect(saleCompleteMayDismiss("key", true)).toBe(false);
	});

	it("without change, any tap or key closes it so the next scan is not lost", () => {
		expect(saleCompleteMayDismiss("card", false)).toBe(true);
		expect(saleCompleteMayDismiss("scrim", false)).toBe(true);
		expect(saleCompleteMayDismiss("key", false)).toBe(true);
	});
});
