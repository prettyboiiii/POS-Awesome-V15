/**
 * Shop membership on the cashier screen (mart_shop.api.pos).
 *
 * - `summary`: points, birthday, credit and debt of the selected customer (the member chip).
 * - `program`: the points rule, fetched once, used to say "you would earn N points".
 * - `sheet`: the before-pay sheet. `openSheet()` returns a promise that settles when the cashier
 *   chooses, so `show_payment` can simply await it.
 *
 * Everything here needs the server; offline the calls fail quietly and the sheet is skipped.
 */
import { defineStore } from "pinia";
import { ref } from "vue";

declare const frappe: any;

export type MemberSummary = {
	customer: string;
	customer_name: string;
	is_member: number;
	points: number;
	points_value: number;
	birthday: "today" | "month" | null;
	credit_limit: number;
	outstanding: number;
	line_linked: number;
};

export type MemberProgram = {
	member_group: string;
	baht_per_point: number;
	point_value: number;
};

export type SheetMode = "start" | "pay";

// What the sheet shows; built by beforePay.ts from the cart.
export type SheetPayload = {
	company: string;
	total: number;
	currency: string;
	saving: number;
	earn: number;
	hints: Array<{ kind: "amount" | "qty"; gap: number; title: string }>;
	member: MemberSummary | null;
};

export type SheetResult = { proceed: boolean; customer?: string; customer_name?: string; mobile_no?: string };

const API = "mart_shop.api.pos";

/** Plain text of the first message Frappe returned with an error, or a fallback. */
export function serverMessage(error: any, fallback: string): string {
	try {
		const raw = error?.responseJSON?._server_messages ?? error?._server_messages;
		const first = JSON.parse(raw)[0];
		const text = JSON.parse(first).message as string;
		return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || fallback;
	} catch {
		return fallback;
	}
}

const call = <T>(method: string, args: Record<string, unknown>): Promise<T> =>
	new Promise((resolve, reject) => {
		frappe.call({
			method: `${API}.${method}`,
			args,
			freeze: false,
			callback: (r: any) => resolve(r?.message as T),
			error: (xhr: any) => reject(xhr),
		});
	});

export const useMemberStore = defineStore("member", () => {
	const program = ref<MemberProgram | null>(null);
	const summary = ref<MemberSummary | null>(null);
	const sheet = ref<{ open: boolean; mode: SheetMode; payload: SheetPayload | null }>({
		open: false,
		mode: "pay",
		payload: null,
	});
	let settle: ((result: SheetResult) => void) | null = null;
	let summaryRequest = 0;

	async function loadProgram(company: string): Promise<MemberProgram | null> {
		if (program.value) return program.value;
		try {
			program.value = await call<MemberProgram>("member_program", { company });
		} catch {
			program.value = null;
		}
		return program.value;
	}

	/** Refresh the chip for `customer`; clears it for the walk-in and when offline. */
	async function refreshSummary(customer: string | null, company: string): Promise<MemberSummary | null> {
		const request = ++summaryRequest;
		if (!customer) {
			summary.value = null;
			return null;
		}
		try {
			const result = await call<MemberSummary>("member_summary", { customer, company });
			if (request === summaryRequest) summary.value = result?.customer ? result : null;
		} catch {
			if (request === summaryRequest) summary.value = null;
		}
		return summary.value;
	}

	async function findMember(mobile_no: string, company: string): Promise<MemberSummary | null> {
		const result = await call<MemberSummary | Record<string, never>>("find_member", { mobile_no, company });
		return result && "customer" in result ? (result as MemberSummary) : null;
	}

	async function signup(args: {
		customer_name: string;
		mobile_no: string;
		company: string;
		birthday?: string | null;
		consent: boolean;
	}): Promise<MemberSummary> {
		return call<MemberSummary>("signup_member", {
			customer_name: args.customer_name,
			mobile_no: args.mobile_no,
			company: args.company,
			birthday: args.birthday || null,
			consent: args.consent ? 1 : 0,
		});
	}

	function openSheet(mode: SheetMode, payload: SheetPayload): Promise<SheetResult> {
		// A second request replaces the first rather than leaving it hanging.
		settle?.({ proceed: false });
		sheet.value = { open: true, mode, payload };
		return new Promise((resolve) => {
			settle = resolve;
		});
	}

	function closeSheet(result: SheetResult) {
		sheet.value = { ...sheet.value, open: false };
		const done = settle;
		settle = null;
		done?.(result);
	}

	return { program, summary, sheet, loadProgram, refreshSummary, findMember, signup, openSheet, closeSheet };
});
