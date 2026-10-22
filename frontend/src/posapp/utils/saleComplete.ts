export type DismissSource = "button" | "card" | "scrim" | "key";

/**
 * Whether the sale-complete card may close. The Next customer button always can. A tap on the card, the
 * backdrop or any key (a scanner types keys) only closes it when there is no change to read.
 */
export function saleCompleteMayDismiss(source: DismissSource, hasChange: boolean): boolean {
	if (source === "button") return true;
	return !hasChange;
}
