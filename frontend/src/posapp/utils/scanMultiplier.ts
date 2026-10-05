export const MAX_SCAN_MULTIPLIER = 999;

/** Number typed in the search box when the cashier presses `*`, or null if it is not a valid multiplier. */
export function multiplierFromKey(fieldValue: unknown, key: string): number | null {
	if (key !== "*") return null;
	const text = String(fieldValue ?? "").trim();
	if (!/^\d{1,3}$/.test(text)) return null;
	const value = Number(text);
	return value >= 1 && value <= MAX_SCAN_MULTIPLIER ? value : null;
}

/** Split `5*8850999...` into the multiplier and the bare code. */
export function splitInlineMultiplier(code: string): { qty: number | null; code: string } {
	const match = /^(\d{1,3})\*(.+)$/.exec(String(code ?? "").trim());
	if (!match) return { qty: null, code };
	const qty = multiplierFromKey(match[1], "*");
	return qty === null ? { qty: null, code } : { qty, code: match[2] as string };
}
