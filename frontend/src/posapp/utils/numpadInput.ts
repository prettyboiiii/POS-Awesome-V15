/**
 * Pure logic for the in-app numpad used on touch devices (tablet counter, no keyboard).
 * The numpad edits whichever opted-in input is focused, like a keyboard would: it replaces the
 * selection, inserts at the caret and deletes backwards. Components only apply the result.
 */

/** integer: digits; decimal: digits and one point; pin: digits, shown masked; multiplier: up to 3 digits. */
export type NumpadKind = "integer" | "decimal" | "pin" | "multiplier";

export type NumpadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back" | "clear";

export interface NumpadState {
	value: string;
	/** Selection start and end in `value` (equal when it is only a caret). */
	start: number;
	end: number;
}

export const MULTIPLIER_MAX_DIGITS = 3;

const clamp = (n: number, max: number) => Math.min(Math.max(Number.isFinite(n) ? n : max, 0), max);

/** Apply one numpad key. Returns the same state when the key does nothing (for example a second point). */
export function applyNumpadKey(state: NumpadState, key: NumpadKey, kind: NumpadKind): NumpadState {
	const value = String(state.value ?? "");
	const a = clamp(state.start, value.length);
	const b = clamp(state.end, value.length);
	const start = Math.min(a, b);
	const end = Math.max(a, b);

	if (key === "clear") return { value: "", start: 0, end: 0 };

	if (key === "back") {
		if (end > start) return { value: value.slice(0, start) + value.slice(end), start, end: start };
		if (start === 0) return { value, start, end };
		return { value: value.slice(0, start - 1) + value.slice(end), start: start - 1, end: start - 1 };
	}

	const isDigit = key >= "0" && key <= "9" && key.length === 1;
	if (!isDigit && key !== ".") return { value, start, end };
	if (key === "." && kind !== "decimal") return { value, start, end };

	const before = value.slice(0, start);
	const after = value.slice(end);
	if (key === ".") {
		if ((before + after).includes(".")) return { value, start, end };
		const insert = before === "" ? "0." : ".";
		const next = before + insert + after;
		return { value: next, start: before.length + insert.length, end: before.length + insert.length };
	}

	const next = before + key + after;
	if (kind === "multiplier" && next.replace(/\D/g, "").length > MULTIPLIER_MAX_DIGITS) {
		return { value, start, end };
	}
	return { value: next, start: before.length + 1, end: before.length + 1 };
}

/** What the numpad shows for the current value: a PIN is masked. */
export function numpadDisplay(value: string, kind: NumpadKind): string {
	const text = String(value ?? "");
	return kind === "pin" ? "•".repeat(text.length) : text;
}

/**
 * Attributes for an input that opts in. On a touch device the soft keyboard is suppressed
 * (`inputmode="none"`) so the numpad is the only way in; on a PC the input keeps its own mode.
 */
export function numpadAttrs(
	kind: NumpadKind,
	coarsePointer: boolean,
	label = "",
): Record<string, string | undefined> {
	const fallback = kind === "decimal" ? "decimal" : "numeric";
	return {
		"data-numpad": kind,
		"data-numpad-label": label || undefined,
		inputmode: coarsePointer ? "none" : fallback,
	};
}

/** PIN fields open the numpad as soon as they take focus (the unlock screen autofocuses one); others on tap. */
export function numpadOpensOnFocus(kind: NumpadKind): boolean {
	return kind === "pin";
}

export function isNumpadKind(value: unknown): value is NumpadKind {
	return value === "integer" || value === "decimal" || value === "pin" || value === "multiplier";
}
