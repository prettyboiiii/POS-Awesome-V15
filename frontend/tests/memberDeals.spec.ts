import { describe, expect, it } from "vitest";

import {
	formatMoney,
	memberSaving,
	nearMissHints,
	pointsFor,
	redeemableValue,
	type PosOffer,
} from "../src/posapp/utils/memberDeals";

describe("memberSaving", () => {
	it("sums the per-unit difference times quantity", () => {
		expect(
			memberSaving([
				{ qty: 2, walkRate: 50, memberRate: 45 },
				{ qty: 1, walkRate: 20, memberRate: 20 },
				{ qty: "3", walkRate: 10, memberRate: 9.5 },
			]),
		).toBe(11.5);
	});

	it("never counts a member price that is higher", () => {
		expect(memberSaving([{ qty: 1, walkRate: 10, memberRate: 12 }])).toBe(0);
	});

	it("is zero for an empty cart", () => {
		expect(memberSaving([])).toBe(0);
	});
});

describe("pointsFor / redeemableValue", () => {
	it("awards whole points per baht step", () => {
		expect(pointsFor(124.9, 25)).toBe(4);
		expect(pointsFor(24, 25)).toBe(0);
	});

	it("is zero when the rule or total is missing", () => {
		expect(pointsFor(100, 0)).toBe(0);
		expect(pointsFor(0, 25)).toBe(0);
	});

	it("caps redemption at the bill", () => {
		expect(redeemableValue(120, 0.25, 100)).toBe(30);
		expect(redeemableValue(1000, 0.25, 100)).toBe(100);
		expect(redeemableValue(0, 0.25, 100)).toBe(0);
	});
});

describe("nearMissHints", () => {
	const lines = [
		{ item_code: "A", item_group: "Drinks", qty: 2, amount: 40 },
		{ item_code: "B", item_group: "Snacks", qty: 1, amount: 60 },
	];
	const spend110: PosOffer = { name: "spend110", apply_on: "Transaction", min_amt: 110, title: "Spend 110" };

	it("flags a cart that is close to an amount threshold", () => {
		const hints = nearMissHints({ offers: [spend110], lines, total: 100 });
		expect(hints).toHaveLength(1);
		expect(hints[0]).toMatchObject({ kind: "amount", gap: 10 });
	});

	it("ignores a cart that is far from the threshold", () => {
		expect(nearMissHints({ offers: [spend110], lines, total: 60 })).toEqual([]);
	});

	it("ignores a threshold already reached and offers already applied", () => {
		expect(nearMissHints({ offers: [spend110], lines, total: 120 })).toEqual([]);
		expect(nearMissHints({ offers: [spend110], lines, total: 100, applied: ["spend110"] })).toEqual([]);
	});

	it("flags an item quantity one short", () => {
		const buy3: PosOffer = { name: "buy3", apply_on: "Item Code", item: "A", min_qty: 3 };
		const hints = nearMissHints({ offers: [buy3], lines, total: 100 });
		expect(hints[0]).toMatchObject({ kind: "qty", gap: 1, item_code: "A" });
	});

	it("does not suggest an item that is not in the cart", () => {
		const buyC: PosOffer = { name: "buyC", apply_on: "Item Code", item: "C", min_qty: 2 };
		expect(nearMissHints({ offers: [buyC], lines, total: 100 })).toEqual([]);
	});

	it("matches item groups by the group of the cart lines", () => {
		const drinks: PosOffer = { name: "drinks", apply_on: "Item Group", item_group: "Drinks", min_qty: 3 };
		expect(nearMissHints({ offers: [drinks], lines, total: 100 })[0]).toMatchObject({
			kind: "qty",
			item_group: "Drinks",
		});
	});

	it("skips disabled offers and brand-scoped offers", () => {
		const off: PosOffer = { ...spend110, name: "off", disable: 1 };
		const brand: PosOffer = { name: "brand", apply_on: "Brand", min_qty: 2 };
		expect(nearMissHints({ offers: [off, brand], lines, total: 100 })).toEqual([]);
	});

	it("lists the closest first and honours the limit", () => {
		const near: PosOffer = { name: "near", apply_on: "Transaction", min_amt: 105 };
		const far: PosOffer = { name: "far", apply_on: "Transaction", min_amt: 120 };
		const hints = nearMissHints({ offers: [far, near], lines, total: 100, limit: 1 });
		expect(hints.map((h) => h.offer.name)).toEqual(["near"]);
	});
});

describe("formatMoney", () => {
	it("shows whole baht without decimals and fractions with two", () => {
		expect(formatMoney(1234)).toBe("฿1,234");
		expect(formatMoney(1234.5)).toBe("฿1,234.50");
	});

	it("does not throw on an unknown currency", () => {
		expect(formatMoney(10, "not-a-code")).toBe("10.00");
	});
});
