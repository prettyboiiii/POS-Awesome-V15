import { describe, expect, it } from "vitest";

import {
	BILL_REASON_MAX,
	canChangePaidBill,
	canEditBillDiscount,
	canEditBillItemDiscount,
	canEditBillRate,
	cleanBillReason,
} from "../src/posapp/utils/billEdit";

const cashier = { name: "cashier@example.com", is_supervisor: false };
const supervisor = { name: "sup@example.com", is_supervisor: true };
const locked = {
	posa_allow_user_to_edit_rate: 0,
	posa_allow_user_to_edit_item_discount: 0,
	posa_allow_user_to_edit_additional_discount: 0,
};
const open = {
	posa_allow_user_to_edit_rate: 1,
	posa_allow_user_to_edit_item_discount: "1",
	posa_allow_user_to_edit_additional_discount: true,
};

describe("paid bill changes (issue #96)", () => {
	it("only a supervisor may change or cancel a paid bill", () => {
		expect(canChangePaidBill(cashier)).toBe(false);
		expect(canChangePaidBill(supervisor)).toBe(true);
		expect(canChangePaidBill({ is_supervisor: 1 })).toBe(true);
		expect(canChangePaidBill({ is_supervisor: "0" })).toBe(false);
		expect(canChangePaidBill(null)).toBe(false);
		expect(canChangePaidBill(undefined)).toBe(false);
	});

	it("rate follows the profile switch unless the user is a supervisor", () => {
		expect(canEditBillRate(locked, cashier)).toBe(false);
		expect(canEditBillRate(open, cashier)).toBe(true);
		expect(canEditBillRate(locked, supervisor)).toBe(true);
		expect(canEditBillRate(null, cashier)).toBe(false);
	});

	it("line discount follows the profile switch unless the user is a supervisor", () => {
		expect(canEditBillItemDiscount(locked, cashier)).toBe(false);
		expect(canEditBillItemDiscount(open, cashier)).toBe(true);
		expect(canEditBillItemDiscount(locked, supervisor)).toBe(true);
	});

	it("bill discount follows the profile switch unless the user is a supervisor", () => {
		expect(canEditBillDiscount(locked, cashier)).toBe(false);
		expect(canEditBillDiscount(open, cashier)).toBe(true);
		expect(canEditBillDiscount(locked, supervisor)).toBe(true);
	});

	it("a reason is trimmed, blank counts as none and long text is cut", () => {
		expect(cleanBillReason("  ลูกค้าคืนของ ")).toBe("ลูกค้าคืนของ");
		expect(cleanBillReason("   ")).toBe("");
		expect(cleanBillReason(null)).toBe("");
		expect(cleanBillReason("ก".repeat(BILL_REASON_MAX + 10))).toHaveLength(
			BILL_REASON_MAX,
		);
	});
});
