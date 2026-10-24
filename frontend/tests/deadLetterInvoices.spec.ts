// @vitest-environment jsdom
// mart #189: a queued sale the server keeps refusing must never vanish. It stays
// counted and listed as failed until a person retries or discards it.

import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	db,
	getFailedOfflineInvoiceCount,
	getInvoiceOutboxRows,
	getOfflineInvoices,
	getPendingInvoiceOutboxCount,
	getPendingOfflineInvoiceCount,
	initPromise,
	memory,
	pruneOfflineStorage,
	retryOfflineInvoice,
	saveOfflineInvoice,
	setInvoiceOutboxMode,
	syncInvoiceOutboxResource,
	syncOfflineInvoices,
} from "../src/offline/index";

const SALE = {
	invoice: {
		name: "OFFLINE-SINV-DL-1",
		customer: "CUST-001",
		pos_profile: "Main POS",
		company: "Test Company",
		posa_client_request_id: "dead-letter-001",
		grand_total: 120,
		items: [{ item_code: "ITEM-1", item_name: "Item 1", qty: 1 }],
	},
	data: { idempotency_key: "dead-letter-001" },
};

describe("dead letter invoices stay visible (mart #189)", () => {
	beforeEach(async () => {
		await initPromise;
		await db.table("write_queue").clear();
		await db.table("queue").clear();
		await db.table("keyval").clear();
		await db.table("invoice_outbox").clear();
		localStorage.clear();
		memory.offline_invoices = [];
		memory.local_stock_cache = {};
		memory.pos_opening_storage = null;
		setInvoiceOutboxMode("off");
		vi.spyOn(console, "error").mockImplementation(() => {});
		(globalThis as any).frappe = { call: vi.fn() };
	});

	async function failFiveTimes() {
		(globalThis as any).frappe.call.mockRejectedValue(new Error("Shift is closed"));
		for (let attempt = 0; attempt < 5; attempt += 1) {
			await syncOfflineInvoices();
		}
	}

	it("keeps a refused sale in the count and the list, marked failed, with the error", async () => {
		await saveOfflineInvoice(structuredClone(SALE));
		await failFiveTimes();

		expect(getPendingOfflineInvoiceCount()).toBe(1);
		expect(await getFailedOfflineInvoiceCount()).toBe(1);
		expect(getOfflineInvoices()).toEqual([
			expect.objectContaining({
				status: "dead_letter",
				retry_count: 5,
				last_error: expect.stringContaining("Shift is closed"),
			}),
		]);
	});

	it("retry puts the sale back in the queue and the next sync sends it", async () => {
		await saveOfflineInvoice(structuredClone(SALE));
		await failFiveTimes();

		const [row] = getOfflineInvoices();
		expect(await retryOfflineInvoice(Number(row.queue_id))).toBe(true);
		expect(await getFailedOfflineInvoiceCount()).toBe(0);
		expect(getPendingOfflineInvoiceCount()).toBe(1);

		(globalThis as any).frappe.call.mockResolvedValue({ message: {} });
		const totals = await syncOfflineInvoices();
		expect(totals.synced).toBe(1);
		expect(getPendingOfflineInvoiceCount()).toBe(0);
	});

	it("retry refuses a row that is not dead letter", async () => {
		await saveOfflineInvoice(structuredClone(SALE));
		const [row] = getOfflineInvoices();
		expect(await retryOfflineInvoice(Number(row.queue_id))).toBe(false);
	});

	it("never prunes a dead letter sale, however old", async () => {
		await saveOfflineInvoice(structuredClone(SALE));
		await failFiveTimes();
		await pruneOfflineStorage({ now: Date.now() + 400 * 24 * 60 * 60 * 1000 });
		expect(await db.table("write_queue").count()).toBe(1);
	});

	describe("outbox path", () => {
		async function failOutboxFiveTimes() {
			const refuse = vi.fn(async () => {
				throw new Error("Shift is closed");
			});
			for (let attempt = 0; attempt < 5; attempt += 1) {
				// skip the backoff wait
				await db.table("invoice_outbox").toCollection().modify({ next_retry_at: null });
				await syncInvoiceOutboxResource(refuse);
			}
		}

		it("keeps a dead letter outbox row in the pending count and rows", async () => {
			setInvoiceOutboxMode("dual_write");
			await saveOfflineInvoice(structuredClone(SALE));
			await failOutboxFiveTimes();

			expect(await getPendingInvoiceOutboxCount()).toBe(1);
			expect(await getInvoiceOutboxRows()).toEqual([
				expect.objectContaining({ status: "dead_letter", last_error: expect.stringContaining("Shift is closed") }),
			]);
		});

		it("never prunes a dead letter outbox row", async () => {
			setInvoiceOutboxMode("dual_write");
			await saveOfflineInvoice(structuredClone(SALE));
			await failOutboxFiveTimes();
			await pruneOfflineStorage({ now: Date.now() + 400 * 24 * 60 * 60 * 1000 });
			expect(await db.table("invoice_outbox").count()).toBe(1);
		});

		it("retry makes the outbox row sendable again", async () => {
			setInvoiceOutboxMode("dual_write");
			await saveOfflineInvoice(structuredClone(SALE));
			await failOutboxFiveTimes();
			const [row] = getOfflineInvoices();
			await retryOfflineInvoice(Number(row.queue_id));

			const accept = vi.fn(async () => ({ acknowledged: true, invoice: { name: "ACC-SINV-1" } }));
			await syncInvoiceOutboxResource(accept);
			expect(accept).toHaveBeenCalledTimes(1);
			expect(await getPendingInvoiceOutboxCount()).toBe(0);
		});
	});
});
