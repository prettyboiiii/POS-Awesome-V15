import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { askTierBeforePay } from "../src/posapp/components/pos/invoice_utils/tierCheck";
import { usePriceTierStore } from "../src/posapp/stores/priceTierStore";

const cokeLine = () => ({
	item_code: "COKE",
	item_name: "โค้ก",
	posa_row_id: "r1",
	qty: 2,
	rate: 18,
	mart_price_tier: "",
});

describe("PAY check for cold items", () => {
	let store: ReturnType<typeof usePriceTierStore>;
	beforeEach(() => {
		setActivePinia(createPinia());
		store = usePriceTierStore();
		store.prices = { COKE: { cold: 20 } };
	});

	it("does not ask when no line has a cold price waiting", async () => {
		const context = { items: [{ ...cokeLine(), item_code: "SNACK" }], invoiceType: "Invoice" };
		expect(await askTierBeforePay(context)).toBe(true);
		expect(store.check.open).toBe(false);
	});

	it("asks once, and 'cold' switches the line", async () => {
		const set_price_tier = vi.fn();
		const line = cokeLine();
		const pending = askTierBeforePay({ items: [line], invoiceType: "Invoice", set_price_tier });
		expect(store.check.open).toBe(true);
		expect(store.check.rows).toEqual([{ rowId: "r1", itemName: "โค้ก", qty: 2, retail: 18, cold: 20 }]);
		store.answerCheck("cold");
		expect(await pending).toBe(true);
		expect(set_price_tier).toHaveBeenCalledWith(line, "cold");
	});

	it("'keep' leaves the price and marks the line as looked at", async () => {
		const line = cokeLine();
		const pending = askTierBeforePay({ items: [line], invoiceType: "Invoice", set_price_tier: vi.fn() });
		store.answerCheck("keep");
		expect(await pending).toBe(true);
		expect(store.seenRows.has("r1")).toBe(true);
		expect(await askTierBeforePay({ items: [line], invoiceType: "Invoice" })).toBe(true);
		expect(store.check.open).toBe(false);
	});

	it("'back' returns to the cart", async () => {
		const pending = askTierBeforePay({ items: [cokeLine()], invoiceType: "Invoice" });
		store.answerCheck("back");
		expect(await pending).toBe(false);
	});

	it("skips returns and free items", async () => {
		expect(await askTierBeforePay({ items: [cokeLine()], isReturnInvoice: true })).toBe(true);
		expect(await askTierBeforePay({ items: [{ ...cokeLine(), is_free_item: 1 }], invoiceType: "Invoice" })).toBe(true);
		expect(store.check.open).toBe(false);
	});
});
