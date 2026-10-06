import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePriceCheckStore } from "../src/posapp/stores/priceCheckStore";

const result = { item_code: "A1", item_name: "Milk", retail: 12, wholesale: 10, member: null };

describe("price check store", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("toggles on and off", () => {
		const store = usePriceCheckStore();
		expect(store.active).toBe(false);
		store.toggle();
		expect(store.active).toBe(true);
		store.toggle();
		expect(store.active).toBe(false);
	});

	it("turns itself off and clears the result after 15 s idle", () => {
		const store = usePriceCheckStore();
		store.toggle();
		store.show(result);
		vi.advanceTimersByTime(14999);
		expect(store.active).toBe(true);
		vi.advanceTimersByTime(2);
		expect(store.active).toBe(false);
		expect(store.result).toBeNull();
	});

	it("a new lookup restarts the idle timer", () => {
		const store = usePriceCheckStore();
		store.toggle();
		vi.advanceTimersByTime(10000);
		store.show(result);
		vi.advanceTimersByTime(10000);
		expect(store.active).toBe(true);
		expect(store.result).toEqual(result);
	});

	it("turnOff clears everything and stops the timer", () => {
		const store = usePriceCheckStore();
		store.toggle();
		store.show(result);
		store.turnOff();
		expect(store.active).toBe(false);
		expect(store.result).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("show is ignored while the mode is off", () => {
		const store = usePriceCheckStore();
		store.show(result);
		expect(store.result).toBeNull();
	});
});
