/**
 * The last cart line the cashier removed, kept for a few seconds so one tap can put it back.
 * Same shape as `undoAddStore`; `line` is a snapshot taken before the removal, `index` its old position.
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import { canUndoRemove, snapshotLine } from "../utils/undoRemove";

export const UNDO_REMOVE_MS = 8000;

export interface UndoRemoveEntry {
	line: Record<string, any>;
	index: number;
	itemName: string;
}

export const useUndoRemoveStore = defineStore("undoRemove", () => {
	const last = ref<UndoRemoveEntry | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;

	const clear = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		last.value = null;
	};

	/** Call before the line is removed. Ignores lines that are not the cashier's own. */
	const record = (line: Record<string, any> | null | undefined, index: number) => {
		if (!canUndoRemove(line)) return;
		clear();
		last.value = {
			line: snapshotLine(line as Record<string, any>),
			index,
			itemName: String((line as any).item_name || (line as any).item_code || ""),
		};
		timer = setTimeout(clear, UNDO_REMOVE_MS);
	};

	return { last, record, clear };
});
