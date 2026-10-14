import { describe, expect, it } from "vitest";

import {
	amountForPoints,
	maxRedeemablePoints,
	pointsFromInput,
	amountDueAfterRedeem,
	clearLoyaltyRedemption,
	pointsUsed,
} from "../src/posapp/utils/pointsRedeem";

describe("pointsRedeem", () => {
	it("converts points to baht with the conversion factor", () => {
		expect(amountForPoints(400, 0.25)).toBe(100);
		expect(amountForPoints(3, 0.25)).toBe(0.75);
		expect(amountForPoints(0, 0.25)).toBe(0);
		expect(amountForPoints(10, 0)).toBe(10);
	});

	it("caps use-all at the points the customer has", () => {
		expect(maxRedeemablePoints({ points: 400, conversionFactor: 0.25, invoiceTotal: 500 })).toBe(400);
	});

	it("caps use-all so the redeemed baht never exceeds the bill", () => {
		expect(maxRedeemablePoints({ points: 400, conversionFactor: 0.25, invoiceTotal: 60 })).toBe(240);
		// bill of 60.10 does not take a part-point: 240 points = 60.00
		expect(maxRedeemablePoints({ points: 400, conversionFactor: 0.25, invoiceTotal: 60.1 })).toBe(240);
	});

	it("is zero for no points, no bill or bad numbers", () => {
		expect(maxRedeemablePoints({ points: 0, conversionFactor: 0.25, invoiceTotal: 60 })).toBe(0);
		expect(maxRedeemablePoints({ points: 400, conversionFactor: 0.25, invoiceTotal: 0 })).toBe(0);
		expect(maxRedeemablePoints({ points: Number.NaN, conversionFactor: 0.25, invoiceTotal: 60 })).toBe(0);
	});

	it("reads the typed points as a whole number within the limit", () => {
		expect(pointsFromInput("120", 400)).toBe(120);
		expect(pointsFromInput("120.9", 400)).toBe(120);
		expect(pointsFromInput("999", 400)).toBe(400);
		expect(pointsFromInput("-5", 400)).toBe(0);
		expect(pointsFromInput("abc", 400)).toBe(0);
		expect(pointsFromInput("", 400)).toBe(0);
	});

	it("takes the redeemed baht off the amount due, never below zero", () => {
		expect(amountDueAfterRedeem(250, 100)).toBe(150);
		expect(amountDueAfterRedeem(250, 0)).toBe(250);
		expect(amountDueAfterRedeem(50, 100)).toBe(0);
	});

	it("clears every loyalty field of a bill (pay-later carries no redemption)", () => {
		const doc: any = { loyalty_amount: 15, redeem_loyalty_points: 1, loyalty_points: 60, grand_total: 20 };
		clearLoyaltyRedemption(doc);
		expect(doc.loyalty_amount).toBe(0);
		expect(doc.redeem_loyalty_points).toBe(0);
		expect(doc.loyalty_points).toBe(0);
		expect(doc.grand_total).toBe(20);
		expect(() => clearLoyaltyRedemption(null)).not.toThrow();
	});

	it("counts used points with one rule, preferring the saved loyalty_points", () => {
		expect(pointsUsed({ loyaltyAmount: 15, conversionFactor: 0.25 })).toBe(60);
		expect(pointsUsed({ loyaltyAmount: 15, conversionFactor: 0.25, savedPoints: 60 })).toBe(60);
		expect(pointsUsed({ loyaltyAmount: 0, conversionFactor: 0.25, savedPoints: 60 })).toBe(0);
		expect(pointsUsed({ loyaltyAmount: 0.75, conversionFactor: 0.25 })).toBe(3);
	});
});
