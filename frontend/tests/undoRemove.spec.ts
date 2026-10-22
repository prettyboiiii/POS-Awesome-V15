import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UNDO_REMOVE_MS, useUndoRemoveStore } from "../src/posapp/stores/undoRemoveStore";
import { canUndoRemove, restoreIndex, snapshotLine } from "../src/posapp/utils/undoRemove";

const line = { posa_row_id: "r1", item_code: "ITEM-1", item_name: "Milk", qty: 2, rate: 20 };

describe("undo remove helpers", () => {
	it("only a cashier's own line can be taken back", () => {
		expect(canUndoRemove(line)).toBe(true);
		expect(canUndoRemove({ ...line, posa_is_offer: 1 })).toBe(false);
		expect(canUndoRemove({ ...line, is_free_item: 1 })).toBe(false);
		expect(canUndoRemove({ ...line, is_bundle: 1 })).toBe(false);
		expect(canUndoRemove({ ...line, posa_is_replace: 1 })).toBe(false);
		expect(canUndoRemove({ item_code: "x" })).toBe(false);
		expect(canUndoRemove(null)).toBe(false);
	});

	it("snapshot is detached from the live line", () => {
		const live = { ...line, nested: { a: 1 } };
		const copy = snapshotLine(live);
		live.qty = 9;
		live.nested.a = 2;
		expect(copy.qty).toBe(2);
		expect(copy.nested.a).toBe(1);
	});

	it("restores to the old position, or the end when the cart is shorter", () => {
		expect(restoreIndex(1, 3)).toBe(1);
		expect(restoreIndex(0, 0)).toBe(-1);
		expect(restoreIndex(5, 3)).toBe(-1);
		expect(restoreIndex(-1, 3)).toBe(-1);
		expect(restoreIndex(Number.NaN, 3)).toBe(-1);
	});
});

describe("undo remove store", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("records a snapshot, position and name", () => {
		const store = useUndoRemoveStore();
		store.record(line, 2);
		expect(store.last).toEqual({ line, index: 2, itemName: "Milk" });
	});

	it("ignores a line it cannot restore", () => {
		const store = useUndoRemoveStore();
		store.record({ ...line, posa_is_offer: 1 }, 0);
		expect(store.last).toBeNull();
	});

	it("keeps the line it saw even if the cart line changes later", () => {
		const store = useUndoRemoveStore();
		const live = { ...line };
		store.record(live, 0);
		live.qty = 7;
		expect(store.last?.line.qty).toBe(2);
	});

	it("a new removal replaces the previous one", () => {
		const store = useUndoRemoveStore();
		store.record(line, 0);
		store.record({ ...line, posa_row_id: "r2", item_name: "Egg" }, 1);
		expect(store.last?.itemName).toBe("Egg");
	});

	it("expires", () => {
		const store = useUndoRemoveStore();
		store.record(line, 0);
		vi.advanceTimersByTime(UNDO_REMOVE_MS - 1);
		expect(store.last).not.toBeNull();
		vi.advanceTimersByTime(2);
		expect(store.last).toBeNull();
	});

	it("clear drops the entry and its timer", () => {
		const store = useUndoRemoveStore();
		store.record(line, 0);
		store.clear();
		expect(store.last).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});
});
