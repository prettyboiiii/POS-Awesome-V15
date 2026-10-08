<template>
	<v-dialog
		:model-value="check.open"
		persistent
		max-width="560"
		scrim="rgba(0,0,0,0.55)"
		:retain-focus="false"
		@keydown.esc.stop="answer('back')"
	>
		<v-card class="tier-check" data-testid="tier-check">
			<h2>{{ __("Cold price?") }}</h2>
			<p class="tier-check__lead">{{ __("These items are still at the shelf price. Charge the cold price?") }}</p>
			<ul class="tier-check__rows">
				<li v-for="row in check.rows" :key="row.rowId" data-testid="tier-check-row">
					<span class="tier-check__name">{{ row.itemName }} × {{ row.qty }}</span>
					<span class="tier-check__prices">{{ money(row.retail) }} → {{ money(row.cold) }}</span>
				</li>
			</ul>
			<footer class="tier-check__actions">
				<v-btn variant="text" size="large" data-testid="tier-check-back" @click="answer('back')">
					{{ __("Back to cart") }}
				</v-btn>
				<v-btn variant="tonal" size="large" data-testid="tier-check-keep" @click="answer('keep')">
					{{ __("Keep shelf price") }}
				</v-btn>
				<v-btn color="primary" size="large" data-testid="tier-check-cold" @click="answer('cold')">
					{{ __("Charge cold price") }}
				</v-btn>
			</footer>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

import { usePriceTierStore, type TierCheckAnswer } from "../../../stores/priceTierStore";

declare const __: (_text: string, _args?: any[]) => string;

const store = usePriceTierStore();
const { check } = storeToRefs(store);

const money = (value: number) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const answer = (value: TierCheckAnswer) => store.answerCheck(value);
</script>

<style scoped>
.tier-check {
	padding: 24px 28px 28px;
	display: grid;
	gap: 16px;
}

.tier-check h2 {
	font-size: 1.8rem;
	margin: 0;
}

.tier-check__lead {
	margin: 0;
	font-size: 1.2rem;
}

.tier-check__rows {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	gap: 8px;
}

.tier-check__rows li {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 14px;
	border-radius: 12px;
	background: #e3f2fd;
	font-size: 1.15rem;
}

.tier-check__prices {
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.tier-check__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;
}
</style>
