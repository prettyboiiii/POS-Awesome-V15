<template>
	<v-dialog :model-value="modelValue" max-width="380" persistent transition="dialog-bottom-transition">
		<v-card>
			<v-card-title class="text-h5">
				<span class="text-h5 text-primary">{{ __("Unfinished bill found") }}</span>
			</v-card-title>
			<v-card-text>
				<div>{{ __("The page was reloaded in the middle of a sale.") }}</div>
				<div class="mt-2 font-weight-bold">{{ summary }}</div>
			</v-card-text>
			<v-card-actions>
				<v-btn color="error" variant="text" data-testid="resume-cart-discard" @click="$emit('discard')">
					{{ __("Discard bill") }}
				</v-btn>
				<v-spacer></v-spacer>
				<v-btn
					ref="resumeBtn"
					color="primary"
					variant="elevated"
					autofocus
					data-testid="resume-cart-resume"
					@click="$emit('resume')"
				>
					{{ __("Resume bill") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";

defineOptions({
	name: "ResumeCartDialog",
});

const props = defineProps({
	modelValue: Boolean,
	lineCount: { type: Number, default: 0 },
	totalQty: { type: Number, default: 0 },
});

defineEmits(["resume", "discard"]);
const resumeBtn = ref(null);
const __ = window.__ || ((text) => text);

const summary = computed(() => __("{0} lines, {1} pieces", [props.lineCount, props.totalQty]));

watch(
	() => props.modelValue,
	(val) => {
		if (val) {
			nextTick(() => {
				setTimeout(() => {
					resumeBtn.value?.$el?.focus();
				}, 100);
			});
		}
	},
);
</script>
