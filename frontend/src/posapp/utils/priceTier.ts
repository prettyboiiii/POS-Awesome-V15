/**
 * Price tiers of one item: the same barcode can be sold at the shelf (retail) price, the wholesale
 * price or the cold (from the fridge) price. Retail is the default and is stored as "".
 * `prices` is what `mart_shop.api.pos.tier_prices` returns: { item_code: { wholesale?, cold? } }.
 */
export type PriceTier = "" | "wholesale" | "cold";
export type TierPrices = Record<string, Partial<Record<"wholesale" | "cold", number>>>;

const ORDER: PriceTier[] = ["", "wholesale", "cold"];

/** Retail always, then each tier the item has a price for. */
export function availableTiers(itemCode: string, prices: TierPrices): PriceTier[] {
	const own = prices?.[itemCode] || {};
	return ORDER.filter((tier) => tier === "" || Number(own[tier]) > 0);
}

/** Next tier on the chip: retail, wholesale, cold, then back to retail. */
export function nextTier(current: PriceTier, itemCode: string, prices: TierPrices): PriceTier {
	const tiers = availableTiers(itemCode, prices);
	const at = tiers.indexOf(current || "");
	return tiers[(at + 1) % tiers.length] as PriceTier;
}

/** Price for a tier, or null for retail (the line already carries it) and for a tier the item lacks. */
export function tierRate(itemCode: string, tier: PriceTier, prices: TierPrices): number | null {
	if (!tier) return null;
	const rate = Number(prices?.[itemCode]?.[tier]);
	return rate > 0 ? rate : null;
}

/** Part of the cart merge key: a cold Coke and a shelf Coke must stay on separate lines. */
export function mergeTierKey(entry: { mart_price_tier?: string | null }): string {
	return entry?.mart_price_tier || "";
}

/** English source string; the caller wraps it in __() so th.csv can translate it. */
export function tierLabel(tier: PriceTier): string {
	if (tier === "wholesale") return "Wholesale price";
	if (tier === "cold") return "Cold price";
	return "Retail price";
}

/**
 * Lines the cashier has not looked at that still sit on retail although the item has a cold price.
 * Wholesale never nags: it is a deliberate choice. A line counts as looked at when its row id is in
 * `seen` (the store keeps that, because the cart is rebuilt from the saved bill and line flags are lost).
 */
export function needsTierCheck<T extends { item_code?: string; posa_row_id?: string; mart_price_tier?: string | null }>(
	lines: T[],
	prices: TierPrices,
	seen: ReadonlySet<string> = new Set(),
): T[] {
	return (lines || []).filter(
		(line) =>
			!seen.has(String(line.posa_row_id || "")) &&
			!(line.mart_price_tier || "") &&
			tierRate(String(line.item_code || ""), "cold", prices) !== null,
	);
}

interface TierLine {
	rate?: number;
	base_rate?: number;
	price_list_rate?: number;
	base_price_list_rate?: number;
	conversion_factor?: number;
	mart_price_tier?: string;
	_manual_rate_set?: boolean;
	skip_force_update?: boolean;
	_tier_retail?: Record<string, unknown> | null;
	[key: string]: unknown;
}

/**
 * Charge a line at a tier price. `rate` is the price per stock unit (what the price list holds); a line
 * in a larger unit costs conversion_factor times as much. The retail figures are stashed once so retail
 * can be restored.
 */
export function applyTierRate(line: TierLine, tier: PriceTier, rate: number): void {
	if (!line._tier_retail) {
		line._tier_retail = {
			rate: line.rate,
			base_rate: line.base_rate,
			price_list_rate: line.price_list_rate,
			base_price_list_rate: line.base_price_list_rate,
			manual: Boolean(line._manual_rate_set),
			skip: Boolean(line.skip_force_update),
		};
	}
	const factor = Number(line.conversion_factor) || 1;
	line.mart_price_tier = tier;
	line.rate = rate * factor;
	line.price_list_rate = rate * factor;
	line.base_rate = rate;
	line.base_price_list_rate = rate;
	line._manual_rate_set = true;
	line.skip_force_update = true;
}

/** Put a line back on the retail price. Returns true when the retail price is unknown and must be refetched. */
export function restoreRetail(line: TierLine): boolean {
	const saved = line._tier_retail as Record<string, any> | null | undefined;
	line.mart_price_tier = "";
	line._tier_retail = null;
	if (!saved || !(Number(saved.price_list_rate) > 0)) {
		line._manual_rate_set = false;
		line.skip_force_update = false;
		return true;
	}
	line.rate = saved.rate;
	line.base_rate = saved.base_rate;
	line.price_list_rate = saved.price_list_rate;
	line.base_price_list_rate = saved.base_price_list_rate;
	line._manual_rate_set = Boolean(saved.manual);
	line.skip_force_update = Boolean(saved.skip);
	return false;
}

export interface TierCheckRow {
	rowId: string;
	itemName: string;
	qty: number;
	retail: number;
	cold: number;
}

/** What the PAY check shows for each line it asks about. */
export function tierCheckRows(
	lines: Array<{ posa_row_id?: string; item_code?: string; item_name?: string; qty?: number; rate?: number }>,
	prices: TierPrices,
): TierCheckRow[] {
	return (lines || []).map((line) => ({
		rowId: String(line.posa_row_id || ""),
		itemName: String(line.item_name || line.item_code || ""),
		qty: Math.abs(Number(line.qty) || 0),
		retail: Number(line.rate) || 0,
		cold: tierRate(String(line.item_code || ""), "cold", prices) ?? 0,
	}));
}
