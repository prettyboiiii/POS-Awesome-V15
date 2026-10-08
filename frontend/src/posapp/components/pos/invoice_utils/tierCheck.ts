import { usePriceTierStore } from "../../../stores/priceTierStore";
import { needsTierCheck, tierCheckRows } from "../../../utils/priceTier";

/**
 * Before PAY: if some lines have a cold price but are still on the shelf price and the cashier never
 * looked at them, ask once. Returns false when the cashier goes back to the cart.
 */
export async function askTierBeforePay(context: any): Promise<boolean> {
	if (context.isReturnInvoice || context.invoice_doc?.is_return) return true;
	if (context.invoiceType && context.invoiceType !== "Invoice") return true;

	const store = usePriceTierStore();
	const lines = needsTierCheck(
		(context.items || []).filter((item: any) => item && !item.is_free_item && Number(item.qty) > 0),
		store.prices,
		store.seenRows,
	);
	if (!lines.length) return true;

	const answer = await store.openCheck(tierCheckRows(lines, store.prices));
	if (answer === "back") return false;

	for (const line of lines) {
		if (answer === "cold" && typeof context.set_price_tier === "function") {
			context.set_price_tier(line, "cold");
		} else {
			// Kept on the shelf price on purpose: do not ask about this line again.
			store.markSeen(line.posa_row_id);
		}
	}
	return true;
}
