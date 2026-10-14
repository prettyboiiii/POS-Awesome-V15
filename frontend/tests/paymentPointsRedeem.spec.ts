// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import PaymentPointsRedeem from "../src/posapp/components/pos/payments/PaymentPointsRedeem.vue";
import paymentsSource from "../src/posapp/components/pos/Payments.vue?raw";

const baseProps = {
	invoiceDoc: { currency: "THB", is_return: 0, grand_total: 250, rounded_total: 250 },
	customerInfo: { loyalty_points: 400, conversion_factor: 0.25 },
	loyaltyAmount: 0,
	formatCurrency: (v: number) => String(v),
	currencySymbol: () => "฿",
};

describe("PaymentPointsRedeem", () => {
	beforeEach(() => {
		(window as any).frappe = {
			_: (text: string, args?: unknown[]) =>
				Array.isArray(args) ? text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)])) : text,
		};
	});

	it("shows the points and their baht value for a member with points", () => {
		const wrapper = mount(PaymentPointsRedeem, { props: baseProps });
		expect(wrapper.get('[data-testid="points-redeem-have"]').text()).toBe("400 points (worth ฿100)");
	});

	it("is absent for a walk-in, zero points or a return", () => {
		expect(mount(PaymentPointsRedeem, { props: { ...baseProps, customerInfo: {} } }).html()).toBe("<!--v-if-->");
		expect(
			mount(PaymentPointsRedeem, { props: { ...baseProps, customerInfo: { loyalty_points: 0 } } }).html(),
		).toBe("<!--v-if-->");
		expect(
			mount(PaymentPointsRedeem, {
				props: { ...baseProps, invoiceDoc: { ...baseProps.invoiceDoc, is_return: 1 } },
			}).html(),
		).toBe("<!--v-if-->");
	});

	it("use all asks for every point that fits in the bill", async () => {
		const onSetAmount = vi.fn();
		const wrapper = mount(PaymentPointsRedeem, { props: { ...baseProps, onSetAmount } });
		await wrapper.get('[data-testid="points-redeem-all"]').trigger("click");
		expect(onSetAmount).toHaveBeenLastCalledWith(100);

		const onSmall = vi.fn();
		const small = mount(PaymentPointsRedeem, {
			props: {
				...baseProps,
				onSetAmount: onSmall,
				invoiceDoc: { ...baseProps.invoiceDoc, grand_total: 60, rounded_total: 60 },
			},
		});
		await small.get('[data-testid="points-redeem-all"]').trigger("click");
		expect(onSmall).toHaveBeenLastCalledWith(60);
	});

	it("with points already used, use all and typing never exceed the bill", async () => {
		// 20 THB bill with 60 points (15 THB) already redeemed. The bill total does not include the
		// redemption, so the cap is the bill: 20 THB (80 points), not 20 + 15.
		const onSetAmount = vi.fn();
		const wrapper = mount(PaymentPointsRedeem, {
			props: {
				...baseProps,
				loyaltyAmount: 15,
				onSetAmount,
				invoiceDoc: { ...baseProps.invoiceDoc, grand_total: 20, rounded_total: 20 },
			},
		});
		await wrapper.get('[data-testid="points-redeem-all"]').trigger("click");
		expect(onSetAmount).toHaveBeenLastCalledWith(20);
		const input = wrapper.get('[data-testid="points-redeem-input"]');
		(input.element as HTMLInputElement).value = "140";
		await input.trigger("change");
		expect(onSetAmount).toHaveBeenLastCalledWith(20);
	});

	it("leaves out what stored credit already covers", async () => {
		const onSetAmount = vi.fn();
		const wrapper = mount(PaymentPointsRedeem, {
			props: {
				...baseProps,
				onSetAmount,
				otherCoveredAmount: 15,
				invoiceDoc: { ...baseProps.invoiceDoc, grand_total: 60, rounded_total: 60 },
			},
		});
		await wrapper.get('[data-testid="points-redeem-all"]').trigger("click");
		expect(onSetAmount).toHaveBeenLastCalledWith(45);
	});

	it("typed points become baht and are capped", async () => {
		const onSetAmount = vi.fn();
		const wrapper = mount(PaymentPointsRedeem, { props: { ...baseProps, onSetAmount } });
		const input = wrapper.get('[data-testid="points-redeem-input"]');
		(input.element as HTMLInputElement).value = "120";
		await input.trigger("change");
		expect(onSetAmount).toHaveBeenLastCalledWith(30);
		(input.element as HTMLInputElement).value = "9999";
		await input.trigger("change");
		expect(onSetAmount).toHaveBeenLastCalledWith(100);
	});

	it("shows what is used and can clear it", async () => {
		const onSetAmount = vi.fn();
		const wrapper = mount(PaymentPointsRedeem, { props: { ...baseProps, loyaltyAmount: 30, onSetAmount } });
		expect(wrapper.get('[data-testid="points-redeem-used"]').text()).toContain("Using 120 points");
		await wrapper.get('[data-testid="points-redeem-clear"]').trigger("click");
		expect(onSetAmount).toHaveBeenLastCalledWith(0);
	});

	it("is wired into Payments.vue outside the hidden adjustments section", () => {
		const adjustments = paymentsSource.indexOf('<section class="payment-section payment-section--adjustments">');
		const loyalty = paymentsSource.indexOf("<PaymentPointsRedeem");
		expect(loyalty).toBeGreaterThan(-1);
		expect(adjustments).toBeGreaterThan(loyalty);
	});

	it("switching to pay-later clears the redemption", () => {
		const start = paymentsSource.indexOf("watch(is_credit_sale");
		expect(start).toBeGreaterThan(-1);
		const body = paymentsSource.slice(start, start + 700);
		expect(body).toContain("clearLoyaltyRedemption(doc)");
		expect(body).toContain("loyalty_amount.value = 0");
	});
});
