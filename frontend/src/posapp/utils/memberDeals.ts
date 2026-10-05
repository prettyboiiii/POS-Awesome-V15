// Pure helpers for the before-pay sheet: what a member would save, points, and deals the cart almost
// qualifies for. No Vue, no network, so it runs offline and is unit-tested.

export type CartLine = {
	item_code?: string;
	item_group?: string;
	qty?: number | string;
	amount?: number | string;
};

export type PosOffer = {
	name?: string;
	title?: string;
	description?: string;
	disable?: number | boolean;
	apply_on?: string;
	item?: string;
	item_group?: string;
	min_qty?: number | string;
	min_amt?: number | string;
	offer?: string;
	discount_type?: string;
	discount_percentage?: number | string;
	discount_amount?: number | string;
};

export type DealHint = {
	kind: "amount" | "qty";
	offer: PosOffer;
	// Baht still to spend, or units still to add.
	gap: number;
	// Share of the threshold still missing; smaller is closer.
	missing: number;
	item_code?: string;
	item_group?: string;
};

const num = (value: unknown): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** ฿1,234.50 for display; falls back to a plain number when the currency code is not known. */
export function formatMoney(value: unknown, currency = "THB"): string {
	const amount = num(value);
	try {
		return new Intl.NumberFormat("th-TH", {
			style: "currency",
			currency,
			minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
			maximumFractionDigits: 2,
		}).format(amount);
	} catch {
		return amount.toFixed(2);
	}
}

/** Baht saved on this cart if the customer were a member: rate as a walk-in minus rate as a member. */
export function memberSaving(lines: Array<{ qty?: number | string; walkRate?: number; memberRate?: number }>): number {
	let saving = 0;
	for (const line of lines) {
		const diff = num(line.walkRate) - num(line.memberRate);
		if (diff > 0) saving += diff * Math.abs(num(line.qty));
	}
	return round2(saving);
}

/** Points a bill of this size earns; ERPNext awards whole points per `bahtPerPoint` baht. */
export function pointsFor(total: number, bahtPerPoint: number): number {
	if (!(bahtPerPoint > 0) || !(total > 0)) return 0;
	return Math.floor(total / bahtPerPoint);
}

/** Baht the member's points can take off this bill: capped by the bill itself. */
export function redeemableValue(points: number, pointValue: number, total: number): number {
	if (!(points > 0) || !(pointValue > 0) || !(total > 0)) return 0;
	return round2(Math.min(points * pointValue, total));
}

/**
 * Deals the cart is close to but has not reached.
 *
 * `applied` holds the names of offers that already qualify (the cashier screen lists them elsewhere),
 * so they are skipped. A quantity deal counts as close when it is at most one unit short, or within
 * `ratio` of its threshold; an amount deal when the missing baht is within `ratio` of the threshold.
 */
export function nearMissHints({
	offers,
	lines,
	total,
	applied = [],
	ratio = 0.2,
	limit = 3,
}: {
	offers: PosOffer[];
	lines: CartLine[];
	total: number;
	applied?: string[];
	ratio?: number;
	limit?: number;
}): DealHint[] {
	const appliedSet = new Set(applied);
	const cartQty = lines.reduce((sum, line) => sum + Math.abs(num(line.qty)), 0);
	const hints: DealHint[] = [];

	for (const offer of offers || []) {
		if (!offer || offer.disable || (offer.name && appliedSet.has(offer.name))) continue;

		const scope = String(offer.apply_on || "").toLowerCase();
		let matched: CartLine[];
		if (scope === "transaction") {
			matched = lines;
		} else if (scope === "item code" && offer.item) {
			matched = lines.filter((line) => line.item_code === offer.item);
		} else if (scope === "item group" && offer.item_group) {
			matched = lines.filter((line) => line.item_group === offer.item_group);
		} else {
			continue;
		}

		const haveQty = scope === "transaction" ? cartQty : matched.reduce((s, l) => s + Math.abs(num(l.qty)), 0);
		const haveAmount = scope === "transaction" ? total : matched.reduce((s, l) => s + num(l.amount), 0);
		if (haveQty <= 0) continue;

		const minAmt = num(offer.min_amt);
		const minQty = num(offer.min_qty);

		if (minAmt > 0 && haveAmount < minAmt && minAmt - haveAmount <= minAmt * ratio) {
			const gap = round2(minAmt - haveAmount);
			hints.push({ kind: "amount", offer, gap, missing: gap / minAmt, ...scopeTarget(offer, scope) });
		} else if (minQty > 0 && haveQty < minQty && minQty - haveQty <= Math.max(1, minQty * ratio)) {
			const gap = minQty - haveQty;
			hints.push({ kind: "qty", offer, gap, missing: gap / minQty, ...scopeTarget(offer, scope) });
		}
	}

	return hints.sort((a, b) => a.missing - b.missing).slice(0, Math.max(0, limit));
}

function scopeTarget(offer: PosOffer, scope: string): Pick<DealHint, "item_code" | "item_group"> {
	if (scope === "item code") return { item_code: offer.item };
	if (scope === "item group") return { item_group: offer.item_group };
	return {};
}
