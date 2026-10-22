/**
 * Pure helpers for taking back a removed cart line (mart #158).
 * A line is copied before it is removed and put back at the same spot if the cashier taps Undo.
 */

type Line = Record<string, any>;

/** Lines the pricing engine or a bundle owns come back by themselves; only a cashier's own line is undoable. */
export function canUndoRemove(line: Line | null | undefined): boolean {
	if (!line || !line.posa_row_id) return false;
	if (line.posa_is_offer || line.is_free_item || line.is_bundle || line.bundle_id || line.posa_is_replace) return false;
	return true;
}

/** Detached copy of a line, so later edits to the cart cannot change what Undo restores. */
export function snapshotLine(line: Line): Line {
	return JSON.parse(JSON.stringify(line));
}

/** Where to put the line back: its old position if the cart is still that long, else the end (-1). */
export function restoreIndex(index: number, cartLength: number): number {
	if (!Number.isInteger(index) || index < 0 || index >= cartLength) return -1;
	return index;
}
