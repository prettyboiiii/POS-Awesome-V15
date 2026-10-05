import { isOffline } from "../../../../offline/index";
import { useCustomersStore } from "../../../stores/customersStore";
import { useMemberStore, type SheetPayload, type SheetResult } from "../../../stores/memberStore";
import { useUIStore } from "../../../stores/uiStore";
import { memberSaving, nearMissHints, pointsFor, type PosOffer } from "../../../utils/memberDeals";
import { _ensurePricingRules, _resolveBaseRate, _resolvePricingQty } from "./pricing";

declare const frappe: any;

// The cashier answered for this exact cart; pressing PAY again after "back" must not ask twice.
let askedSignature = "";

const cartLines = (context: any) =>
	(context.items || []).filter((item: any) => item && !item.is_free_item && Number(item.qty) !== 0);

const signature = (context: any, total: number) =>
	`${context.customer || ""}|${total}|${cartLines(context)
		.map((item: any) => `${item.item_code}x${item.qty}`)
		.join(",")}`;

/**
 * What the cart would cost per line if the customer were a member, priced by the server with the same
 * call the cart uses (reconcile_line_prices), so it matches what the member would really be charged.
 * Per line only; a rule on the whole bill is not counted, so the saving shown is a floor.
 */
async function pricedAsMember(context: any, memberGroup: string) {
	const { ctx } = await _ensurePricingRules(context);
	if (!ctx?.price_list || !ctx.company || !ctx.currency) return [];

	const lines = cartLines(context);
	const payloadLines = lines.map((item: any) => {
		const qty = Math.abs(_resolvePricingQty(context, item));
		const listRate = Number(item.price_list_rate) || _resolveBaseRate(context, item);
		return {
			posa_row_id: item.posa_row_id,
			item_code: item.item_code,
			qty: item.qty,
			stock_qty: qty,
			base_qty: qty,
			conversion_factor: Number(item.conversion_factor) > 0 ? Number(item.conversion_factor) : undefined,
			rate: listRate,
			price_list_rate: listRate,
			discount_amount: 0,
			base_rate: listRate,
			base_price_list_rate: listRate,
			base_discount_amount: 0,
			amount: listRate * Number(item.qty),
			base_amount: listRate * Number(item.qty),
			discount_percentage: 0,
			warehouse: item.warehouse,
			uom: item.uom,
			item_group: item.item_group,
			brand: item.brand,
			pricing_rules: null,
		};
	});

	const response = await frappe.call({
		method: "posawesome.posawesome.api.pricing_rules.reconcile_line_prices",
		args: {
			cart_payload: JSON.stringify({
				context: { ...ctx, customer: null, customer_group: memberGroup },
				lines: payloadLines,
				free_lines: [],
			}),
		},
	});
	const updates = new Map<string, number>(
		(response?.message?.updates || []).map((row: any) => [String(row.row_id), Number(row.rate)]),
	);

	return lines.map((item: any, index: number) => ({
		qty: Math.abs(Number(item.qty)),
		walkRate: Number(item.rate),
		memberRate: updates.get(String(payloadLines[index].posa_row_id)) ?? Number(item.rate),
	}));
}

async function buildPayload(context: any, member: SheetPayload["member"]): Promise<SheetPayload> {
	const memberStore = useMemberStore();
	const uiStore = useUIStore();
	const profile = context.pos_profile || {};
	const company = profile.company || "";
	const total = Number(context.subtotal) || 0;

	const program = await memberStore.loadProgram(company);
	const lines = cartLines(context);

	let saving = 0;
	if (!member && program) {
		try {
			saving = memberSaving(await pricedAsMember(context, program.member_group));
		} catch (error) {
			console.error("Could not price the cart as a member", error);
		}
	}

	const hints = nearMissHints({
		offers: (uiStore.offers || []) as PosOffer[],
		lines: lines.map((item: any) => ({
			item_code: item.item_code,
			item_group: item.item_group,
			qty: item.qty,
			amount: Number(item.qty) * Number(item.rate),
		})),
		total,
		applied: (uiStore.applicableOffers || []).map((offer: any) => offer.name),
		ratio: Number(profile.mart_near_miss_ratio) || 0.2,
	}).map((hint) => ({
		kind: hint.kind,
		gap: hint.gap,
		title: hint.offer.title || hint.offer.description || hint.offer.name || "",
	}));

	return {
		company,
		total,
		currency: context.selected_currency || profile.currency || "THB",
		saving,
		earn: program ? pointsFor(total, program.baht_per_point) : 0,
		hints,
		member,
	};
}

/** Put a member from the sheet into the customer list and select them. */
async function selectChosenMember(result: SheetResult) {
	if (!result.customer) return;
	await useCustomersStore().addOrUpdateCustomer({
		name: result.customer,
		customer_name: result.customer_name || result.customer,
		mobile_no: result.mobile_no,
	});
}

/** Wait for the invoice screen to take on the selected customer, then price the cart for them. */
async function adoptCustomer(context: any, name: string) {
	for (let attempt = 0; attempt < 20 && context.customer !== name; attempt++) {
		await context.$nextTick();
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	await context.fetch_customer_details?.();
	await context.applyPricingRulesForCart?.(true);
}

/**
 * Called by show_payment before the invoice is built. Resolves true to carry on to payment, false when
 * the cashier went back to the cart. Quiet (resolves true at once) when it has nothing to ask or say.
 */
export async function askMemberBeforePay(context: any): Promise<boolean> {
	const profile = context.pos_profile || {};
	if (!Number(profile.mart_ask_member_at_pay) || isOffline()) return true;
	if (context.isReturnInvoice || context.invoice_doc?.is_return) return true;
	if (context.invoiceType && context.invoiceType !== "Invoice") return true;
	if (context.invoiceStore?.exchangeSession) return true;

	const total = Number(context.subtotal) || 0;
	if (total < Number(profile.mart_ask_member_min_total || 0)) return true;
	if (signature(context, total) === askedSignature) return true;

	const memberStore = useMemberStore();
	const walkIn = !context.customer || context.customer === profile.customer;

	let member: SheetPayload["member"] = null;
	if (!walkIn) {
		member = await memberStore.refreshSummary(context.customer, profile.company);
	}
	const payload = await buildPayload(context, member);

	// A known customer is only interrupted when there is something worth saying.
	const worthSaying =
		walkIn ||
		payload.hints.length > 0 ||
		(member && (member.points > 0 || member.outstanding > 0 || member.birthday));
	if (!worthSaying) return true;

	const result = await memberStore.openSheet("pay", payload);
	if (!result.proceed) return false;

	askedSignature = signature(context, total);
	if (result.customer && result.customer !== context.customer) {
		await selectChosenMember(result);
		await adoptCustomer(context, result.customer);
		// The cart now carries member prices, so remember this cart, not the old one.
		askedSignature = signature(context, Number(context.subtotal) || 0);
	}
	return true;
}

/** Open the sheet from the member chip, before any payment: find or sign up a member and select them. */
export async function openMemberLookup(profile: any): Promise<void> {
	const result = await useMemberStore().openSheet("start", {
		company: profile?.company || "",
		total: 0,
		currency: profile?.currency || "THB",
		saving: 0,
		earn: 0,
		hints: [],
		member: null,
	});
	if (result.proceed) await selectChosenMember(result);
}
