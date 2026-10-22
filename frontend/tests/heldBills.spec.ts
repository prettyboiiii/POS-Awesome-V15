import { describe, expect, it } from "vitest";

import { buildHeldBillsPrompt, describeHeldBill } from "../src/posapp/utils/heldBills";

describe("held bills prompt", () => {
	it("is empty without held bills", () => {
		expect(buildHeldBillsPrompt([])).toBe("");
	});

	it("names the customer and total", () => {
		expect(
			describeHeldBill({ name: "X-1", customer_name: "Somchai", grand_total: 1250, currency: "THB" }),
		).toBe("Somchai 1,250 THB");
		expect(describeHeldBill({ name: "X-2" })).toBe("X-2");
	});

	it("says the bills are deleted and lists them", () => {
		const text = buildHeldBillsPrompt([
			{ name: "X-1", customer_name: "A", grand_total: 10, currency: "THB" },
		]);
		expect(text).toContain("1 held bill will be DELETED");
		expect(text).toContain("- A 10 THB");
	});

	it("caps the list at five and counts the rest", () => {
		const bills = Array.from({ length: 8 }, (_, i) => ({ name: `X-${i}` }));
		const text = buildHeldBillsPrompt(bills);
		expect(text).toContain("8 held bills will be DELETED");
		expect(text).toContain("and 3 more");
		expect(text).not.toContain("X-5");
	});

	it("passes every sentence through translate", () => {
		const text = buildHeldBillsPrompt([{ name: "X-1" }], (s) => `T(${s})`);
		expect(text).toContain("T(1 held bill will be DELETED when you close the shift.)");
	});
});
