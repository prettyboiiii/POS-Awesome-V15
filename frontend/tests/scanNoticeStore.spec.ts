import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SCAN_NOTICE_MS, useScanNoticeStore } from "../src/posapp/stores/scanNoticeStore";

describe("scan notice store", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("records the notice", () => {
		const store = useScanNoticeStore();
		store.record({ message: "Barcode not found", code: "123" });
		expect(store.last).toEqual({ message: "Barcode not found", code: "123" });
	});

	it("a new notice replaces the old one and restarts the timer", () => {
		const store = useScanNoticeStore();
		store.record({ message: "a", code: "1" });
		vi.advanceTimersByTime(SCAN_NOTICE_MS - 100);
		store.record({ message: "b", code: "2" });
		vi.advanceTimersByTime(200);
		expect(store.last?.code).toBe("2");
	});

	it("clears itself after the timeout", () => {
		const store = useScanNoticeStore();
		store.record({ message: "a", code: "1" });
		vi.advanceTimersByTime(SCAN_NOTICE_MS);
		expect(store.last).toBeNull();
	});
});
