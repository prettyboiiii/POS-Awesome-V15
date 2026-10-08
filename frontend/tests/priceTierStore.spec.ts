import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COLD_MODE_IDLE_MS, usePriceTierStore } from "../src/posapp/stores/priceTierStore";

describe("price tier store", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("toggles cold mode", () => {
		const store = usePriceTierStore();
		store.toggleCold();
		expect(store.scanTier).toBe("cold");
		store.toggleCold();
		expect(store.scanTier).toBe("");
	});

	it("switches cold mode off after idle time", () => {
		const store = usePriceTierStore();
		store.toggleCold();
		vi.advanceTimersByTime(COLD_MODE_IDLE_MS + 1);
		expect(store.scanTier).toBe("");
	});

	it("stays on while the cashier keeps adding", () => {
		const store = usePriceTierStore();
		store.toggleCold();
		vi.advanceTimersByTime(COLD_MODE_IDLE_MS - 1000);
		store.touch();
		vi.advanceTimersByTime(COLD_MODE_IDLE_MS - 1000);
		expect(store.scanTier).toBe("cold");
	});

	it("fetches the prices itself when asked, once, and shares a running fetch", async () => {
		const call = vi.fn().mockResolvedValue({ message: { COKE: { cold: 20 } } });
		vi.stubGlobal("frappe", { call });
		const store = usePriceTierStore();
		await Promise.all([store.ensureLoaded(), store.ensureLoaded()]);
		expect(call).toHaveBeenCalledTimes(1);
		expect(store.prices).toEqual({ COKE: { cold: 20 } });
		await store.ensureLoaded();
		expect(call).toHaveBeenCalledTimes(1);
		vi.unstubAllGlobals();
	});

	it("tries again on the next add when the fetch failed", async () => {
		const call = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ message: { A: { cold: 9 } } });
		vi.stubGlobal("frappe", { call });
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const store = usePriceTierStore();
		await store.ensureLoaded();
		expect(store.prices).toEqual({});
		await store.ensureLoaded();
		expect(store.prices).toEqual({ A: { cold: 9 } });
		expect(call).toHaveBeenCalledTimes(2);
		vi.unstubAllGlobals();
	});
});
