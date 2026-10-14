<template>
	<div v-if="visible" class="points-redeem" data-testid="points-redeem">
		<div class="points-redeem__info">
			<v-icon icon="mdi-star-circle-outline" size="22" class="points-redeem__icon" />
			<div class="points-redeem__text">
				<strong class="points-redeem__title">{{ __("Use points") }}</strong>
				<span class="points-redeem__have" data-testid="points-redeem-have">{{
					__("{0} points (worth {1})", [points, money(availableAmount)])
				}}</span>
			</div>
		</div>
		<div v-if="usedPoints > 0" class="points-redeem__used" data-testid="points-redeem-used">
			<span>{{ __("Using {0} points", [usedPoints]) }}</span>
			<strong>- {{ money(loyaltyAmount) }}</strong>
		</div>
		<div class="points-redeem__actions">
			<input
				class="points-redeem__input"
				type="number"
				inputmode="numeric"
				min="0"
				:max="maxPoints"
				step="1"
				:value="usedPoints || ''"
				:placeholder="__('Points to use')"
				:aria-label="__('Points to use')"
				data-testid="points-redeem-input"
				@change="onTyped"
			/>
			<button
				type="button"
				class="points-redeem__btn points-redeem__btn--all"
				data-testid="points-redeem-all"
				:disabled="maxPoints <= 0 || usedPoints === maxPoints"
				@click="useAll"
			>
				{{ __("Use all") }}
			</button>
			<button
				v-if="usedPoints > 0"
				type="button"
				class="points-redeem__btn"
				data-testid="points-redeem-clear"
				@click="clear"
			>
				{{ __("Do not use") }}
			</button>
		</div>
	</div>
</template>

<script setup>
import { computed } from "vue";
import { amountForPoints, maxRedeemablePoints, pointsFromInput } from "../../../utils/pointsRedeem";

// mart: the one piece of ERPNext's loyalty redemption the shop's simplified pay dialog keeps.
// The full PaymentRedemption block (baht field) stays hidden; this one speaks points.
const props = defineProps({
	invoiceDoc: { type: Object, default: null },
	customerInfo: { type: [Object, String], default: () => ({}) },
	loyaltyAmount: { type: Number, default: 0 },
	formatCurrency: { type: Function, required: true },
	currencySymbol: { type: Function, required: true },
	disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["set-amount"]);

const __ = (text, args) => (window.frappe?._ ? window.frappe._(text, args) : text);

const info = computed(() => (props.customerInfo && typeof props.customerInfo === "object" ? props.customerInfo : {}));
const points = computed(() => Math.floor(Number(info.value.loyalty_points || 0)) || 0);
const factor = computed(() => Number(info.value.conversion_factor || 1) || 1);
const availableAmount = computed(() => amountForPoints(points.value, factor.value));
const invoiceTotal = computed(() =>
	Number(props.invoiceDoc?.rounded_total || props.invoiceDoc?.grand_total || 0),
);
// the bill total before points: loyalty_amount is already inside grand_total only after a recalculation, so
// the cap uses total plus what is currently redeemed.
const maxPoints = computed(() =>
	maxRedeemablePoints({
		points: points.value,
		conversionFactor: factor.value,
		invoiceTotal: invoiceTotal.value + Number(props.loyaltyAmount || 0),
	}),
);
const usedPoints = computed(() => Math.round(Number(props.loyaltyAmount || 0) / factor.value));
const visible = computed(
	() => Boolean(props.invoiceDoc) && !props.invoiceDoc.is_return && !props.disabled && points.value > 0,
);

const money = (value) => `${props.currencySymbol(props.invoiceDoc?.currency)}${props.formatCurrency(value)}`;

const setPoints = (n) => emit("set-amount", amountForPoints(n, factor.value));
const useAll = () => setPoints(maxPoints.value);
const clear = () => setPoints(0);
const onTyped = (event) => setPoints(pointsFromInput(event.target.value, maxPoints.value));
</script>

<style scoped>
.points-redeem {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.points-redeem__info {
	display: flex;
	align-items: center;
	gap: 10px;
}
.points-redeem__icon {
	color: var(--pos-primary);
}
.points-redeem__text {
	display: flex;
	flex-direction: column;
}
.points-redeem__title {
	font-size: 1rem;
}
.points-redeem__have {
	font-size: 0.95rem;
	opacity: 0.8;
}
.points-redeem__used {
	display: flex;
	justify-content: space-between;
	font-size: 1.05rem;
}
.points-redeem__actions {
	display: flex;
	gap: 8px;
	align-items: stretch;
}
.points-redeem__input {
	flex: 1 1 0;
	min-width: 0;
	min-height: 48px;
	padding: 0 12px;
	font-size: 1.1rem;
	border: 1px solid var(--pos-border);
	border-radius: var(--pos-radius-md);
	background: var(--pos-surface-raised);
	color: inherit;
}
.points-redeem__btn {
	min-height: 48px;
	padding: 0 16px;
	font-size: 1rem;
	font-weight: 600;
	border: 1px solid var(--pos-border);
	border-radius: var(--pos-radius-md);
	background: var(--pos-surface-raised);
	color: inherit;
	cursor: pointer;
}
.points-redeem__btn--all {
	background: var(--pos-primary);
	border-color: var(--pos-primary);
	color: var(--pos-on-primary, #fff);
}
.points-redeem__btn:disabled {
	opacity: 0.45;
	cursor: default;
}
</style>
