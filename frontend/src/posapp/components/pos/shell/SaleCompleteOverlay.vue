<template>
	<v-dialog
		:model-value="Boolean(sale)"
		persistent
		max-width="720"
		scrim="rgba(0,0,0,0.55)"
		@update:model-value="dismiss"
	>
		<v-card v-if="sale" class="sale-complete" data-testid="sale-complete" @click="dismiss">
			<div class="sale-complete__head">
				<v-icon size="44" color="success">mdi-check-circle</v-icon>
				<h2>{{ __("Sale completed") }}</h2>
			</div>
			<dl class="sale-complete__rows">
				<div>
					<dt>{{ __("Total") }}</dt>
					<dd>{{ money(sale.total) }}</dd>
				</div>
				<div>
					<dt>{{ __("Received") }}</dt>
					<dd>{{ money(sale.received) }}</dd>
				</div>
			</dl>
			<div v-if="sale.change > 0" class="sale-complete__change" data-testid="sale-complete-change">
				<span>{{ __("Give change") }}</span>
				<strong>{{ money(sale.change) }}</strong>
			</div>
			<v-btn
				color="primary"
				size="x-large"
				block
				class="sale-complete__next"
				data-testid="sale-complete-next"
				@click.stop="dismiss"
			>
				{{ __("Next customer") }}
			</v-btn>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import { storeToRefs } from "pinia";
import { useUIStore } from "../../../stores/uiStore";

declare const __: (_text: string, _args?: any[]) => string;

const uiStore = useUIStore();
const { saleComplete: sale } = storeToRefs(uiStore);

const symbol = computed(() => {
	try {
		const parts = new Intl.NumberFormat("th-TH", { style: "currency", currency: sale.value?.currency || "THB" })
			.formatToParts(0)
			.find((part) => part.type === "currency");
		return parts?.value || "";
	} catch {
		return "";
	}
});

const money = (value: number) =>
	`${symbol.value}${Number(value || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dismiss = () => {
	uiStore.dismissSaleComplete();
	// Back to the scan box, ready for the next customer.
	uiStore.triggerItemSearchFocus?.();
};

let timer: ReturnType<typeof setTimeout> | null = null;
// Any key (a scanner types one) closes it so the next scan is never lost. With change to hand back it
// stays until tapped or a key is pressed; without change it closes by itself.
const onKey = () => dismiss();

watch(
	sale,
	(value) => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		window.removeEventListener("keydown", onKey, true);
		if (!value) return;
		window.addEventListener("keydown", onKey, true);
		if (!(value.change > 0)) timer = setTimeout(dismiss, 2500);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	if (timer) clearTimeout(timer);
	window.removeEventListener("keydown", onKey, true);
});
</script>

<style scoped>
.sale-complete {
	padding: 28px 32px 32px;
	text-align: center;
}

.sale-complete__head {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
}

.sale-complete__head h2 {
	font-size: 2rem;
	margin: 0;
}

.sale-complete__rows {
	margin: 20px 0;
	display: grid;
	gap: 8px;
	font-size: 1.6rem;
}

.sale-complete__rows > div {
	display: flex;
	justify-content: space-between;
}

.sale-complete__rows dd {
	margin: 0;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
}

.sale-complete__change {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 16px;
	margin-bottom: 20px;
	border-radius: 16px;
	background: #fff4e0;
	color: #7a3e00;
	border: 2px solid #e67700;
}

.sale-complete__change span {
	font-size: 1.5rem;
	font-weight: 600;
}

.sale-complete__change strong {
	font-size: 4.2rem;
	line-height: 1.1;
	font-variant-numeric: tabular-nums;
}

.sale-complete__next {
	min-height: 64px;
	font-size: 1.4rem;
}
</style>
