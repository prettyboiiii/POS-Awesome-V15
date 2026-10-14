<template>
	<!-- Confirms changing a paid bill and asks why (issue #96); replaces the browser confirm(). -->
	<v-dialog
		:model-value="modelValue"
		max-width="520"
		persistent
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<v-card data-testid="bill-change-confirm">
			<v-card-title class="text-wrap">{{ __("Change a paid bill") }}</v-card-title>
			<v-card-text>
				<p class="mb-4">
					{{ __("Cancel {0} and submit a corrected amendment?", [invoiceName]) }}
				</p>
				<v-textarea
					ref="reasonInput"
					v-model="reason"
					data-testid="bill-change-reason"
					:label="__('Reason for Change')"
					:counter="BILL_REASON_MAX"
					:maxlength="BILL_REASON_MAX"
					rows="3"
					auto-grow
					variant="outlined"
					:rules="[() => canConfirm || __('Reason is required')]"
					@keydown.ctrl.enter="confirm"
				/>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn variant="text" data-testid="bill-change-back" @click="$emit('cancel')">
					{{ __("Do not change") }}
				</v-btn>
				<v-btn
					color="primary"
					variant="flat"
					data-testid="bill-change-confirm-submit"
					:disabled="!canConfirm"
					@click="confirm"
				>
					{{ __("Confirm Change") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import { BILL_REASON_MAX, cleanBillReason } from "../../../utils/billEdit";

declare const __: (_text: string, _args?: any[]) => string;

const props = defineProps<{ modelValue: boolean; invoiceName: string }>();
const emit = defineEmits<{
	(_event: "update:modelValue", _value: boolean): void;
	(_event: "confirm", _reason: string): void;
	(_event: "cancel"): void;
}>();

const reason = ref("");
const reasonInput = ref<any>(null);
const canConfirm = computed(() => Boolean(cleanBillReason(reason.value)));

const confirm = () => {
	if (canConfirm.value) emit("confirm", cleanBillReason(reason.value));
};

watch(
	() => props.modelValue,
	async (open) => {
		if (!open) return;
		reason.value = "";
		await nextTick();
		reasonInput.value?.focus?.();
	},
);
</script>
