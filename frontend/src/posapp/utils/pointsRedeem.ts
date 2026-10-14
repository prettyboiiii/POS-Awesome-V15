// mart: pure maths for the "use points" line of the pay dialog.
// A point is worth `conversionFactor` baht (the Loyalty Program's conversion factor).

const num = (value: unknown): number => {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const amountForPoints = (points: number, conversionFactor: number): number =>
	round2(Math.max(num(points), 0) * (num(conversionFactor) || 1));

/** Most points that can go on this bill: what the customer has, and no more baht than the bill. */
export const maxRedeemablePoints = ({
	points,
	conversionFactor,
	invoiceTotal,
}: {
	points: number;
	conversionFactor: number;
	invoiceTotal: number;
}): number => {
	const have = Math.floor(Math.max(num(points), 0));
	const total = Math.max(num(invoiceTotal), 0);
	if (!have || !total) return 0;
	const factor = num(conversionFactor) || 1;
	// 1e-9 keeps 60 / 0.25 from landing on 239.99999
	const fitInBill = Math.floor(total / factor + 1e-9);
	return Math.max(Math.min(have, fitInBill), 0);
};

/** Typed points: whole number between 0 and the limit. Anything unreadable is 0. */
export const pointsFromInput = (raw: unknown, limit: number): number => {
	const n = Math.floor(num(raw));
	if (n <= 0) return 0;
	return Math.min(n, Math.max(Math.floor(num(limit)), 0));
};

export const amountDueAfterRedeem = (invoiceTotal: number, redeemedAmount: number): number =>
	Math.max(round2(num(invoiceTotal) - Math.max(num(redeemedAmount), 0)), 0);
