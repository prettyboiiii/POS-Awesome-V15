<template>
	<div class="member-chip" data-testid="member-chip">
		<v-btn
			v-if="!summary || !summary.is_member"
			variant="tonal"
			color="primary"
			size="small"
			block
			prepend-icon="mdi-card-account-details-outline"
			data-testid="member-chip-find"
			@click="openLookup"
		>
			{{ __("Member? Tap to find or sign up") }}
		</v-btn>
		<div v-else class="member-chip__info" data-testid="member-chip-info">
			<span class="member-chip__item">
				<v-icon size="small" color="success">mdi-star-circle</v-icon>
				{{ __("{0} points", [summary.points]) }}
			</span>
			<span v-if="summary.birthday === 'today'" class="member-chip__item member-chip__birthday">
				🎂 {{ __("Birthday today") }}
			</span>
			<span v-else-if="summary.birthday === 'month'" class="member-chip__item">
				🎂 {{ __("Birthday this month") }}
			</span>
			<span v-if="summary.outstanding > 0" class="member-chip__item member-chip__debt">
				{{ __("Owes {0}", [owed]) }}
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useCustomersStore } from "../../../stores/customersStore";
import { useMemberStore } from "../../../stores/memberStore";
import { useUIStore } from "../../../stores/uiStore";
import { formatMoney } from "../../../utils/memberDeals";
import { openMemberLookup } from "../invoice_utils/beforePay";

declare const __: (_text: string, _args?: any[]) => string;

const customersStore = useCustomersStore();
const memberStore = useMemberStore();
const uiStore = useUIStore();
const { selectedCustomer } = storeToRefs(customersStore);
const { summary } = storeToRefs(memberStore);

const profile = computed(() => (uiStore.posProfile || {}) as any);
const owed = computed(() => formatMoney(summary.value?.outstanding || 0, profile.value.currency || "THB"));

// The walk-in is never a member, so skip the round trip for it.
watch(
	[selectedCustomer, () => profile.value.company],
	([customer, company]) => {
		const isWalkIn = !customer || customer === profile.value.customer;
		memberStore.refreshSummary(isWalkIn || !company ? null : (customer as string), company as string);
	},
	{ immediate: true },
);

const openLookup = () => openMemberLookup(profile.value);
</script>

<style scoped>
.member-chip {
	margin-top: 8px;
}

.member-chip__info {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 14px;
	font-size: 0.95rem;
	font-weight: 600;
}

.member-chip__item {
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.member-chip__birthday {
	color: #b45309;
}

.member-chip__debt {
	color: #b91c1c;
}
</style>
