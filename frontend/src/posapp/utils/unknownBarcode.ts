declare const frappe: any;

// A scanned barcode that matches no item is logged for backoffice to add later. The server keeps one
// row per barcode and counts repeat scans. Fire and forget: a failed report never blocks the cashier.
const REPEAT_WINDOW_MS = 3000;

let lastCode = "";
let lastAt = 0;

// A scanner that double-fires, or a cashier who rescans straight away, counts as one report.
export function isRepeatReport(code: string, now: number): boolean {
	return code === lastCode && now - lastAt < REPEAT_WINDOW_MS;
}

export function resetUnknownBarcodeMemory() {
	lastCode = "";
	lastAt = 0;
}

export async function reportUnknownBarcode(code: string, now: number = Date.now()): Promise<boolean> {
	const barcode = (code || "").trim();
	if (!barcode || typeof frappe === "undefined" || isRepeatReport(barcode, now)) return false;
	lastCode = barcode;
	lastAt = now;
	try {
		const response = await frappe.call({
			method: "mart_shop.api.pos.report_unknown_barcode",
			args: { barcode },
			freeze: false,
			silent: true,
		});
		return Boolean(response?.message?.logged);
	} catch {
		return false;
	}
}
