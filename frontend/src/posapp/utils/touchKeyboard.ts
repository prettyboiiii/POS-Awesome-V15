/**
 * Soft keyboard control for the scan box on touch devices (tablet counter).
 * A hardware scanner types into the box like a keyboard, so the on-screen keyboard only gets in the way:
 * on a touch device the box answers `inputmode="none"` until the cashier asks for the keyboard.
 */

export const COARSE_POINTER_QUERY = "(pointer: coarse)";

type MatchMediaLike = (query: string) => { matches: boolean };

/** True when the primary pointer is a finger (phone or tablet), false on a mouse PC or when unknown. */
export function isCoarsePointer(matchMedia?: MatchMediaLike | null): boolean {
	if (typeof matchMedia !== "function") return false;
	try {
		return !!matchMedia(COARSE_POINTER_QUERY)?.matches;
	} catch {
		return false;
	}
}

/**
 * `inputmode` for the scan box. Only a touch device with the keyboard switched off gets "none";
 * everything else returns undefined so the attribute is left out and nothing changes on a PC.
 */
export function scanBoxInputMode(coarsePointer: boolean, keyboardOn: boolean): "none" | undefined {
	return coarsePointer && !keyboardOn ? "none" : undefined;
}
