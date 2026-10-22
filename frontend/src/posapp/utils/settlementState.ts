export type SettlementState = "remaining" | "change" | "balanced";

/** A float rounding error must not read as "still to pay": under half a satang is balanced. */
const EPSILON = 0.005;

/** `diff` is amount due minus amount received: above 0 still to pay, below 0 change to give. */
export function settlementStateOf(diff: unknown): SettlementState {
	const value = Number(diff) || 0;
	if (value > EPSILON) return "remaining";
	if (value < -EPSILON) return "change";
	return "balanced";
}

const translate = (text: string): string => {
	const fn = (globalThis as any).__;
	return typeof fn === "function" ? fn(text) : text;
};

/** Icon and words for the state, so the pay dialog never relies on colour alone. */
export function settlementBadge(state: SettlementState): { icon: string; text: string } {
	if (state === "remaining") return { icon: "mdi-alert-circle-outline", text: translate("Not enough yet") };
	if (state === "change") return { icon: "mdi-cash-refund", text: translate("Give change") };
	return { icon: "mdi-check-circle-outline", text: translate("Paid in full") };
}
