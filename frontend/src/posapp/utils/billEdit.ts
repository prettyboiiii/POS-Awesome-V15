// Changing a paid bill from the bill history (issue #96). Only a supervisor may amend or cancel one; the
// server (mart_shop.api.posa_bill_edits and a before_cancel hook) enforces it, this only shapes the screen.
// Inside the edit dialog the rate and discount fields follow the same POS Profile switches as the cart.

type Cashier = { is_supervisor?: unknown } | null | undefined;
type Profile = Record<string, unknown> | null | undefined;

// Same limit as the server (mart_shop.bill_edit_rules.REASON_MAX).
export const BILL_REASON_MAX = 240;

const on = (value: unknown) =>
	value === true || value === 1 || value === "1" || value === "true";

export function canChangePaidBill(cashier: Cashier): boolean {
	return on(cashier?.is_supervisor);
}

export function canEditBillRate(profile: Profile, cashier: Cashier): boolean {
	return (
		canChangePaidBill(cashier) || on(profile?.posa_allow_user_to_edit_rate)
	);
}

export function canEditBillItemDiscount(
	profile: Profile,
	cashier: Cashier,
): boolean {
	return (
		canChangePaidBill(cashier) ||
		on(profile?.posa_allow_user_to_edit_item_discount)
	);
}

export function canEditBillDiscount(
	profile: Profile,
	cashier: Cashier,
): boolean {
	return (
		canChangePaidBill(cashier) ||
		on(profile?.posa_allow_user_to_edit_additional_discount)
	);
}

export function cleanBillReason(text: unknown): string {
	return String(text ?? "")
		.trim()
		.slice(0, BILL_REASON_MAX);
}
