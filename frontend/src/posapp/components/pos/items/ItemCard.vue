<template>
	<div
		:class="['card-item-card', { 'item-highlighted': isItemHighlighted }]"
		data-pos-keyboard-target="item-card"
		:data-testid="`pos-item-card-${item.item_code}`"
		:data-item-code="item.item_code"
		tabindex="0"
		role="button"
		:aria-label="`${item.item_name || item.item_code}`"
		:style="{ '--group-color': groupColor }"
		@click="onClick"
		@keydown="onKeyboardSelect"
		:draggable="true"
		@dragstart="onDragStart"
		@dragend="onDragEnd"
	>
		<span class="card-item-stripe" aria-hidden="true"></span>
		<v-img
			v-if="item.image"
			:src="item.image"
			class="card-item-thumb"
			:alt="item.item_name"
		></v-img>
		<div class="card-item-content">
			<div class="card-item-header">
				<h4 class="card-item-name">{{ item.item_name }}</h4>
			</div>
			<div class="card-item-details">
				<div class="card-item-price">
					<div class="primary-price">
						<span class="currency-symbol">
							{{ currencySymbol(primaryCurrency) }}
						</span>
						<span class="price-amount">
							{{ formatCurrency(primaryRate, primaryCurrency, primaryPrecision) }}
						</span>
						<ItemRateInfoMenu
							v-if="showRateInfo"
							:rate-info="rateInfo"
							:currency-symbol="currencySymbol"
							:format-currency="formatCurrency"
							:rate-precision="ratePrecision"
						/>
					</div>
					<div v-if="showSecondaryPrice" class="secondary-price">
						<span class="currency-symbol">
							{{ currencySymbol(secondaryCurrency) }}
						</span>
						<span class="price-amount">
							{{ formatCurrency(secondaryRate, secondaryCurrency, secondaryPrecision) }}
						</span>
					</div>
				</div>
				<div class="card-item-stock">
					<v-icon size="small" class="stock-icon"> mdi-package-variant </v-icon>
					<span
						class="stock-amount"
						:class="{
							'negative-number': isNegative(item.actual_qty),
						}"
					>
						{{ formattedActualQty }}
					</span>
					<span class="stock-uom">{{ item.stock_uom || "" }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed } from "vue";
import ItemRateInfoMenu from "./ItemRateInfoMenu.vue";
import { priceListToSelectedCurrency } from "../../../utils/erpnextCurrency";

const props = defineProps({
	item: { type: Object, required: true },
	posProfile: { type: Object, required: true },
	context: { type: String, default: "pos" },
	selectedCurrency: { type: String, default: "" },
	selectedExchangeRate: { type: Number, default: 1 },
	selectedConversionRate: { type: Number, default: 1 },
	hideQtyDecimals: { type: Boolean, default: false },
	showRateInfo: { type: Boolean, default: false },
	getItemRateInfo: { type: Function, required: true },
	isItemHighlighted: { type: Boolean, default: false },
	currencySymbol: { type: Function, required: true },
	formatCurrency: { type: Function, required: true },
	formatNumber: { type: Function, required: true },
	ratePrecision: { type: Function, required: true },
	isNegative: { type: Function, default: (val) => val < 0 },
});

const emit = defineEmits(["click", "dragstart", "dragend"]);

// A stable colour per item group so cashiers can find "drinks" or "snacks" by eye. The stripe is a hint,
// never the only cue: the group chips above the tiles carry the same names as text.
const GROUP_COLORS = ["#0b7285", "#2b8a3e", "#e67700", "#c2255c", "#5f3dc4", "#1864ab", "#a61e4d", "#495057"];
const groupColor = computed(() => {
	const name = String(props.item.item_group || "");
	let hash = 0;
	for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
	return GROUP_COLORS[hash % GROUP_COLORS.length];
});

const primaryCurrency = computed(() => {
	if (props.context === "purchase") {
		return (
			props.item.original_currency ||
			props.item.currency ||
			props.item.price_list_currency ||
			props.posProfile.currency
		);
	}
	return (
		props.item.original_currency ||
		props.item.currency ||
		props.item.price_list_currency ||
		props.posProfile.currency
	);
});

const primaryRate = computed(() => {
	if (props.context === "purchase") {
		return props.item.original_rate ?? props.item.rate ?? props.item.standard_rate ?? 0;
	}
	return props.item.original_rate ?? props.item.rate ?? 0;
});

const primaryPrecision = computed(() => {
	return props.ratePrecision(primaryRate.value);
});

const secondaryRate = computed(() => {
	return priceListToSelectedCurrency(
		{
			pos_profile: props.posProfile,
			price_list_currency: primaryCurrency.value,
			selected_currency: props.selectedCurrency || props.posProfile.currency,
			exchange_rate: props.selectedExchangeRate,
			conversion_rate: props.selectedConversionRate,
		},
		primaryRate.value,
	);
});

const secondaryPrecision = computed(() => {
	return props.ratePrecision(secondaryRate.value);
});

const rateInfo = computed(() => props.getItemRateInfo(props.item));

const secondaryCurrency = computed(() => props.selectedCurrency);

const showSecondaryPrice = computed(() => {
	return (
		props.context !== "purchase" &&
		props.posProfile.posa_allow_multi_currency &&
		Boolean(props.selectedCurrency) &&
		props.selectedCurrency !== primaryCurrency.value
	);
});

const formattedActualQty = computed(() => {
	const numericQty = Number(props.item.actual_qty ?? 0);
	if (!Number.isFinite(numericQty)) {
		return 0;
	}
	if (props.hideQtyDecimals) {
		return props.formatNumber(Math.round(numericQty), 0);
	}
	return props.formatNumber(numericQty, 4);
});

const onClick = (event) => {
	emit("click", event, props.item);
};

const onKeyboardSelect = (event) => {
	const key = event?.key || "";
	if (key !== "Enter" && key !== " ") {
		return;
	}
	event.preventDefault?.();
	emit("click", event, props.item);
};

const onDragStart = (event) => {
	emit("dragstart", event, props.item);
};

const onDragEnd = (event) => {
	emit("dragend", event);
};
</script>

<style scoped>
.card-item-card {
	background: var(--pos-surface-raised);
	border-radius: var(--pos-radius-md);
	border: 1px solid var(--pos-border);
	overflow: hidden;
	transition:
		transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
		box-shadow 0.2s ease,
		border-color 0.2s ease,
		background-color 0.2s ease;
	cursor: pointer;
	display: flex;
	flex-direction: row;
	height: 100%;
	width: 100%;
	box-shadow: var(--pos-elevation-1);
	will-change: transform;
	backface-visibility: hidden;
	transform: translate3d(0, 0, 0);
	position: relative;
}

.card-item-card:hover {
	transform: translate3d(0, -2px, 0);
	box-shadow: var(--pos-elevation-2);
	border-color: var(--pos-primary);
}

.card-item-card.item-highlighted {
	border-color: var(--pos-primary);
	box-shadow:
		0 0 0 3px var(--pos-focus-halo),
		var(--pos-elevation-2);
	transform: translate3d(0, -1px, 0);
	background: var(--pos-primary-container);
}

.card-item-stripe {
	flex: 0 0 8px;
	background: var(--group-color, var(--pos-primary));
}

.card-item-thumb {
	flex: 0 0 72px;
	width: 72px;
	align-self: center;
	margin-left: 8px;
	border-radius: var(--pos-radius-xs);
}

.card-item-content {
	min-width: 0;
	padding: 10px 12px;
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	justify-content: space-between;
	gap: var(--pos-space-2);
}

.card-item-header {
	display: flex;
	flex-direction: column;
	gap: var(--pos-space-1);
}

.card-item-name {
	font-size: 1.1rem;
	font-weight: 650;
	margin: 0;
	line-height: 1.35;
	color: var(--pos-text-primary);
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
}

.card-item-details {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-top: auto; /* Push to bottom */
	gap: var(--pos-space-2);
}

.card-item-price {
	display: flex;
	flex-direction: column;
	gap: var(--pos-space-1);
	min-width: 0;
}

.primary-price {
	white-space: nowrap;
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	gap: var(--pos-space-1);
	font-weight: 750;
	color: var(--pos-primary);
	font-size: 1.3rem;
	font-variant-numeric: tabular-nums;
}

.secondary-price {
	font-size: 0.8rem;
	color: var(--pos-text-secondary);
}

.card-item-stock {
	text-align: right;
	font-size: 0.82rem;
	color: var(--pos-text-secondary);
	display: flex;
	flex-direction: row;
	align-items: flex-end;
	gap: 6px;
	padding: 6px 8px;
	border-radius: var(--pos-radius-xs);
	border: 1px solid var(--pos-border-light);
	background: var(--pos-surface-muted);
	white-space: nowrap;
}

.stock-amount {
	font-weight: 700;
	font-variant-numeric: tabular-nums;
}

.stock-amount.negative-number {
	color: rgb(var(--v-theme-error));
}

.stock-uom {
	display: none;
	font-size: 0.7rem;
	text-transform: uppercase;
}

</style>
