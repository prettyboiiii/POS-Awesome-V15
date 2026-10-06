<template>
	<v-card
		v-if="priceCheck.result"
		class="price-check-banner"
		elevation="8"
		data-testid="price-check-banner"
		@click="priceCheck.turnOff()"
	>
		<div class="price-check-banner__name">{{ priceCheck.result.item_name }}</div>
		<div class="price-check-banner__retail" data-testid="price-check-retail">
			{{ money(priceCheck.result.retail) }}
		</div>
		<div class="price-check-banner__rows">
			<span v-if="priceCheck.result.wholesale !== null" data-testid="price-check-wholesale">
				{{ __("Wholesale price") }}: {{ money(priceCheck.result.wholesale) }}
			</span>
			<span v-if="priceCheck.result.member !== null" data-testid="price-check-member">
				{{ __("Member price") }}: {{ money(priceCheck.result.member) }}
			</span>
		</div>
	</v-card>
</template>

<script setup lang="ts">
import { usePriceCheckStore } from "../../../stores/priceCheckStore";

declare const __: (_str: string, _args?: any[]) => string;

const priceCheck = usePriceCheckStore();

const money = (value: number | null) =>
	value === null
		? __("No price")
		: `฿${Number(value).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
</script>

<style scoped>
.price-check-banner {
	position: fixed;
	left: 50%;
	top: 96px;
	transform: translateX(-50%);
	z-index: 2400;
	min-width: 320px;
	max-width: 90vw;
	padding: 16px 28px;
	text-align: center;
	border-left: 8px solid rgb(var(--v-theme-warning));
	cursor: pointer;
}
.price-check-banner__name {
	font-size: 1.25rem;
	font-weight: 600;
}
.price-check-banner__retail {
	font-size: 3rem;
	font-weight: 700;
	line-height: 1.2;
}
.price-check-banner__rows {
	display: flex;
	gap: 24px;
	justify-content: center;
	font-size: 1.1rem;
}
</style>
