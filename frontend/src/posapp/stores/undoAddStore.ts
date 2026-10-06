/**
 * The last item the cashier added, kept for a few seconds so one tap can take it back.
 * `qty` is how much that add put in the cart (a scan multiplier makes it more than one).
 */
import { defineStore } from "pinia";
import { ref } from "vue";

export const UNDO_ADD_MS = 5000;

export interface UndoAddEntry {
	rowId: string;
	qty: number;
	itemName: string;
}

export const useUndoAddStore = defineStore("undoAdd", () => {
	const last = ref<UndoAddEntry | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;

	const clear = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		last.value = null;
	};

	const record = (entry: UndoAddEntry) => {
		if (!(Number(entry.qty) > 0)) return;
		clear();
		last.value = entry;
		timer = setTimeout(clear, UNDO_ADD_MS);
	};

	return { last, record, clear };
});
