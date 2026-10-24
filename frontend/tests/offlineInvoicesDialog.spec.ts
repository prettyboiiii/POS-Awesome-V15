// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

const offlineMocks = vi.hoisted(() => ({
	getOfflineInvoices: vi.fn(),
	deleteOfflineInvoice: vi.fn(async () => undefined),
	getPendingOfflineInvoiceCount: vi.fn(() => 0),
	retryOfflineInvoice: vi.fn(async () => true),
}));

vi.mock("../src/offline/index", () => offlineMocks);

import OfflineInvoicesDialog from "../src/posapp/components/OfflineInvoices.vue";

describe("OfflineInvoicesDialog queue refresh", () => {
	beforeEach(() => {
		offlineMocks.getOfflineInvoices.mockReset();
		vi.stubGlobal("__", (value: string) => value);
		(window as any).get_currency_symbol = () => "Rs";
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		delete (window as any).get_currency_symbol;
	});

	it("reloads the visible list when the shared pending count changes after sync", async () => {
		offlineMocks.getOfflineInvoices
			.mockReturnValueOnce([
				{
					invoice: {
						customer: "Walk-In",
						posting_date: "2026-09-04",
						grand_total: 270,
					},
				},
			])
			.mockReturnValueOnce([]);

		const wrapper = shallowMount(OfflineInvoicesDialog, {
			props: {
				modelValue: false,
				pendingCount: 1,
			},
		});

		await wrapper.setProps({ modelValue: true });
		expect(offlineMocks.getOfflineInvoices).toHaveBeenCalledTimes(1);

		await wrapper.setProps({ pendingCount: 0 });
		expect(offlineMocks.getOfflineInvoices).toHaveBeenCalledTimes(2);
	});

	it("shows a failed sale in red with the error instead of hiding it (mart #189)", async () => {
		offlineMocks.getOfflineInvoices.mockReturnValue([
			{
				queue_id: 7,
				status: "dead_letter",
				last_error: "Shift is closed",
				invoice: { customer: "Walk-In", posting_date: "2026-09-04", grand_total: 270 },
			},
		]);

		const wrapper = shallowMount(OfflineInvoicesDialog, {
			props: { modelValue: false, pendingCount: 1, failedCount: 1 },
		});
		await wrapper.setProps({ modelValue: true });

		expect(wrapper.find('[data-test="failed-invoices-alert"]').exists()).toBe(true);
		expect(wrapper.html()).not.toContain("All Synchronized");
	});
});
