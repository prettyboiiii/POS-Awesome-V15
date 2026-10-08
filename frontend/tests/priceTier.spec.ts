import { describe, expect, it } from "vitest";

import {
	applyTierRate,
	availableTiers,
	mergeTierKey,
	needsTierCheck,
	nextTier,
	restoreRetail,
	tierCheckRows,
	tierLabel,
	tierRate,
} from "../src/posapp/utils/priceTier";

const prices = { A: { cold: 20, wholesale: 15 }, B: { wholesale: 9 } };

describe("price tier", () => {
	it("offers retail plus the tiers an item has a price for", () => {
		expect(availableTiers("A", prices)).toEqual(["", "wholesale", "cold"]);
		expect(availableTiers("B", prices)).toEqual(["", "wholesale"]);
		expect(availableTiers("Z", prices)).toEqual([""]);
	});

	it("cycles retail -> wholesale -> cold -> retail and skips tiers the item lacks", () => {
		expect(nextTier("", "A", prices)).toBe("wholesale");
		expect(nextTier("wholesale", "A", prices)).toBe("cold");
		expect(nextTier("cold", "A", prices)).toBe("");
		expect(nextTier("wholesale", "B", prices)).toBe("");
		expect(nextTier("", "Z", prices)).toBe("");
	});

	it("reads the rate for a tier, null for retail or a missing price", () => {
		expect(tierRate("A", "cold", prices)).toBe(20);
		expect(tierRate("A", "", prices)).toBeNull();
		expect(tierRate("B", "cold", prices)).toBeNull();
	});

	it("keeps lines of different tiers apart", () => {
		expect(mergeTierKey({ mart_price_tier: "cold" })).not.toBe(mergeTierKey({}));
		expect(mergeTierKey({ mart_price_tier: "" })).toBe(mergeTierKey({}));
	});

	it("labels tiers with English source strings for th.csv", () => {
		expect(tierLabel("")).toBe("Retail price");
		expect(tierLabel("wholesale")).toBe("Wholesale price");
		expect(tierLabel("cold")).toBe("Cold price");
	});

	it("flags lines that have a cold price but were never looked at", () => {
		const lines = [
			{ item_code: "A", posa_row_id: "r1", mart_price_tier: "" },
			{ item_code: "A", posa_row_id: "r2", mart_price_tier: "cold" },
			{ item_code: "B", posa_row_id: "r3", mart_price_tier: "" },
			{ item_code: "Z", posa_row_id: "r4", mart_price_tier: "" },
			{ item_code: "A", posa_row_id: "r5", mart_price_tier: "" },
		];
		expect(needsTierCheck(lines, prices, new Set(["r5"])).map((l) => l.posa_row_id)).toEqual(["r1"]);
	});

	it("charges a tier price and restores retail", () => {
		const line: any = { rate: 18, price_list_rate: 18, base_rate: 18, base_price_list_rate: 18, conversion_factor: 1 };
		applyTierRate(line, "cold", 20);
		expect(line).toMatchObject({ rate: 20, price_list_rate: 20, mart_price_tier: "cold", _manual_rate_set: true });
		applyTierRate(line, "wholesale", 15);
		expect(line.rate).toBe(15);
		expect(restoreRetail(line)).toBe(false);
		expect(line).toMatchObject({ rate: 18, price_list_rate: 18, mart_price_tier: "", _manual_rate_set: false });
	});

	it("asks for a refetch when the retail price was never known", () => {
		const line: any = { rate: 0, price_list_rate: 0, conversion_factor: 1 };
		applyTierRate(line, "cold", 20);
		expect(restoreRetail(line)).toBe(true);
		expect(line._manual_rate_set).toBe(false);
	});

	it("scales the base rate for a larger unit", () => {
		const line: any = { rate: 100, price_list_rate: 100, conversion_factor: 12 };
		applyTierRate(line, "cold", 20);
		expect(line.base_rate).toBe(20);
		expect(line.rate).toBe(240);
	});

	it("describes lines for the PAY check", () => {
		const rows = tierCheckRows(
			[{ posa_row_id: "r1", item_code: "A", item_name: "โค้ก", qty: 2, rate: 18 }],
			prices,
		);
		expect(rows).toEqual([{ rowId: "r1", itemName: "โค้ก", qty: 2, retail: 18, cold: 20 }]);
	});
});
