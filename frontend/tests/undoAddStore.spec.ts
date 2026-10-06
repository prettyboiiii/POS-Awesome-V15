import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useUndoAddStore } from "../src/posapp/stores/undoAddStore";

const entry = { rowId: "r1", qty: 3, itemName: "Milk" };

describe("undo add store", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("records the last add", () => {
		const store = useUndoAddStore();
		store.record(entry);
		expect(store.last).toEqual(entry);
	});

	it("a new add replaces the previous one", () => {
		const store = useUndoAddStore();
		store.record(entry);
		store.record({ rowId: "r2", qty: 1, itemName: "Egg" });
		expect(store.last?.rowId).toBe("r2");
	});

	it("expires after 5 s", () => {
		const store = useUndoAddStore();
		store.record(entry);
		vi.advanceTimersByTime(4999);
		expect(store.last).not.toBeNull();
		vi.advanceTimersByTime(2);
		expect(store.last).toBeNull();
	});

	it("replacing restarts the 5 s window", () => {
		const store = useUndoAddStore();
		store.record(entry);
		vi.advanceTimersByTime(4000);
		store.record({ rowId: "r2", qty: 1, itemName: "Egg" });
		vi.advanceTimersByTime(4000);
		expect(store.last?.rowId).toBe("r2");
	});

	it("ignores an add of zero or less", () => {
		const store = useUndoAddStore();
		store.record({ ...entry, qty: 0 });
		expect(store.last).toBeNull();
	});

	it("clear empties it and stops the timer", () => {
		const store = useUndoAddStore();
		store.record(entry);
		store.clear();
		expect(store.last).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});
});
