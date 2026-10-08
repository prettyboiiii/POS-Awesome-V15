import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	isRepeatReport,
	reportUnknownBarcode,
	resetUnknownBarcodeMemory,
} from "../src/posapp/utils/unknownBarcode";

describe("unknown barcode report", () => {
	beforeEach(() => {
		resetUnknownBarcodeMemory();
		vi.stubGlobal("frappe", { call: vi.fn().mockResolvedValue({ message: { logged: true } }) });
	});

	it("sends the trimmed barcode to the server", async () => {
		expect(await reportUnknownBarcode(" 8850001 ", 1000)).toBe(true);
		expect((globalThis as any).frappe.call.mock.calls[0][0].args).toEqual({ barcode: "8850001" });
	});

	it("ignores the same barcode inside the repeat window only", async () => {
		await reportUnknownBarcode("111", 1000);
		expect(isRepeatReport("111", 2000)).toBe(true);
		expect(isRepeatReport("222", 2000)).toBe(false);
		expect(isRepeatReport("111", 5000)).toBe(false);
	});

	it("skips blank codes and swallows server errors", async () => {
		expect(await reportUnknownBarcode("  ", 1000)).toBe(false);
		(globalThis as any).frappe.call.mockRejectedValue(new Error("offline"));
		expect(await reportUnknownBarcode("333", 9000)).toBe(false);
	});
});
