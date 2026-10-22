// mart #121: closing a shift deletes held (draft) bills, so the cashier must see them and agree first.

export type HeldBill = {
	name?: string;
	customer_name?: string;
	grand_total?: number | string;
	currency?: string;
};

type Translate = (text: string) => string;

const identity: Translate = (text) => text;

export function describeHeldBill(bill: HeldBill): string {
	const parts = [bill.customer_name || bill.name || ""];
	const total = Number(bill.grand_total);
	if (bill.grand_total !== undefined && bill.grand_total !== null && Number.isFinite(total)) {
		parts.push(
			`${total.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${bill.currency || ""}`.trim(),
		);
	}
	return parts.filter(Boolean).join(" ");
}

/** Confirm text listing the held bills (at most 5) that closing will delete. Empty when none. */
export function buildHeldBillsPrompt(bills: HeldBill[], translate: Translate = identity): string {
	if (!bills.length) {
		return "";
	}
	const count = bills.length;
	const head =
		count === 1
			? translate("1 held bill will be DELETED when you close the shift.")
			: translate("{0} held bills will be DELETED when you close the shift.").replace(
					"{0}",
					String(count),
				);
	const lines = bills.slice(0, 5).map((bill) => `- ${describeHeldBill(bill)}`);
	if (count > 5) {
		lines.push(translate("and {0} more").replace("{0}", String(count - 5)));
	}
	return [
		head,
		...lines,
		translate("OK deletes them and closes. Cancel keeps the shift open so you can resume or cancel them."),
	].join("\n");
}
