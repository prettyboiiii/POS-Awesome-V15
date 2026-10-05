<template>
	<div class="group-chips" role="group" :aria-label="__('Items Group')">
		<button
			type="button"
			class="group-chip"
			:class="{ 'group-chip--active': isAll }"
			:aria-pressed="isAll ? 'true' : 'false'"
			data-testid="group-chip-all"
			@click="select('ALL')"
		>
			{{ __("All") }}
		</button>
		<button
			v-for="group in chipGroups"
			:key="group"
			type="button"
			class="group-chip"
			:class="{ 'group-chip--active': group === modelValue }"
			:aria-pressed="group === modelValue ? 'true' : 'false'"
			data-testid="group-chip"
			@click="select(group)"
		>
			{{ group }}
		</button>
		<v-menu v-if="otherGroups.length" location="bottom end" :close-on-content-click="true">
			<template #activator="{ props: menuProps }">
				<button
					v-bind="menuProps"
					type="button"
					class="group-chip group-chip--more"
					data-testid="group-chip-more"
				>
					{{ __("More") }}
					<v-icon size="small">mdi-chevron-down</v-icon>
				</button>
			</template>
			<v-list class="group-chips__menu">
				<v-list-item
					v-for="group in otherGroups"
					:key="group"
					:active="group === modelValue"
					@click="select(group)"
				>
					<v-list-item-title>{{ group }}</v-list-item-title>
				</v-list-item>
			</v-list>
		</v-menu>
	</div>
</template>

<script setup>
import { computed } from "vue";

const __ = window.__;

const props = defineProps({
	modelValue: { type: String, default: "ALL" },
	groups: { type: Array, default: () => [] },
	// item_group -> number of items; groups with the most items get a chip of their own.
	counts: { type: Object, default: () => ({}) },
	maxChips: { type: Number, default: 10 },
});

const emit = defineEmits(["update:modelValue"]);

const isAll = computed(() => !props.modelValue || props.modelValue === "ALL");

const realGroups = computed(() => props.groups.filter((group) => group && group !== "ALL"));

const ranked = computed(() =>
	[...realGroups.value].sort(
		(a, b) => (props.counts[b] || 0) - (props.counts[a] || 0) || a.localeCompare(b, "th"),
	),
);

// The selected group always stays visible, even when it is outside the top few.
const chipGroups = computed(() => {
	const top = ranked.value.slice(0, props.maxChips);
	if (!isAll.value && !top.includes(props.modelValue) && realGroups.value.includes(props.modelValue)) {
		top.push(props.modelValue);
	}
	return top;
});

const otherGroups = computed(() =>
	realGroups.value.filter((group) => !chipGroups.value.includes(group)).sort((a, b) => a.localeCompare(b, "th")),
);

const select = (group) => emit("update:modelValue", group);
</script>

<style scoped>
.group-chips {
	display: flex;
	gap: 8px;
	padding: 4px 4px 8px;
	overflow-x: auto;
	scrollbar-width: none;
	-webkit-overflow-scrolling: touch;
}

.group-chips::-webkit-scrollbar {
	display: none;
}

.group-chip {
	flex: 0 0 auto;
	min-height: 48px;
	padding: 0 18px;
	border-radius: 24px;
	border: 1px solid var(--pos-border);
	background: var(--pos-surface-raised);
	color: var(--pos-text-primary);
	font-size: 1.05rem;
	font-weight: 600;
	white-space: nowrap;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.group-chip--active {
	background: var(--pos-primary);
	border-color: var(--pos-primary);
	color: #fff;
}

.group-chip:focus-visible {
	outline: 3px solid var(--pos-focus-halo, rgba(11, 114, 133, 0.5));
	outline-offset: 2px;
}

.group-chips__menu {
	max-height: 60vh;
	overflow-y: auto;
}

.group-chips__menu :deep(.v-list-item) {
	min-height: 52px;
}
</style>
