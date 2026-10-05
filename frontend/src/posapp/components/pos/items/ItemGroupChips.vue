<template>
	<div class="group-chips-bar">
		<button
			type="button"
			class="group-chips__arrow"
			:disabled="!canScrollLeft"
			:aria-label="__('Scroll left')"
			data-testid="group-chips-left"
			tabindex="-1"
			@click="scrollByPage(-1)"
		>
			<v-icon>mdi-chevron-left</v-icon>
		</button>
		<div
			ref="scroller"
			class="group-chips"
			role="toolbar"
			:aria-label="__('Items Group')"
			@wheel="onWheel"
			@scroll.passive="updateArrows"
			@keydown="onKeydown"
		>
			<button
				v-for="(group, index) in allChips"
				:key="group.value"
				type="button"
				class="group-chip"
				:class="{ 'group-chip--active': group.value === current }"
				:aria-pressed="group.value === current ? 'true' : 'false'"
				:tabindex="index === focusIndex ? 0 : -1"
				:data-testid="group.value === 'ALL' ? 'group-chip-all' : 'group-chip'"
				@click="select(group.value, index)"
				@focus="focusIndex = index"
			>
				{{ group.label }}
			</button>
		</div>
		<button
			type="button"
			class="group-chips__arrow"
			:disabled="!canScrollRight"
			:aria-label="__('Scroll right')"
			data-testid="group-chips-right"
			tabindex="-1"
			@click="scrollByPage(1)"
		>
			<v-icon>mdi-chevron-right</v-icon>
		</button>
	</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const __ = window.__;

const props = defineProps({
	modelValue: { type: String, default: "ALL" },
	groups: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:modelValue"]);

const scroller = ref(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const focusIndex = ref(0);

const current = computed(() => (!props.modelValue ? "ALL" : props.modelValue));

// Fixed order: "All" first, then every group alphabetically (Thai collation). The order never depends on
// clicks or on how many items have loaded, so a chip stays where the cashier last saw it.
const allChips = computed(() => {
	const names = [...new Set(props.groups.filter((group) => group && group !== "ALL"))].sort((a, b) =>
		a.localeCompare(b, "th"),
	);
	return [{ value: "ALL", label: __("All") }, ...names.map((name) => ({ value: name, label: name }))];
});

const updateArrows = () => {
	const el = scroller.value;
	if (!el) return;
	canScrollLeft.value = el.scrollLeft > 2;
	canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
};

const scrollByPage = (direction) => {
	const el = scroller.value;
	if (!el) return;
	el.scrollBy({ left: direction * el.clientWidth * 0.75, behavior: "smooth" });
};

// A mouse wheel only scrolls vertically; turn it into a horizontal scroll over the chips.
const onWheel = (event) => {
	const el = scroller.value;
	if (!el || el.scrollWidth <= el.clientWidth) return;
	if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
		event.preventDefault();
		el.scrollLeft += event.deltaY;
	}
};

const chipButtons = () => Array.from(scroller.value?.querySelectorAll(".group-chip") || []);

const focusChip = (index) => {
	const buttons = chipButtons();
	if (!buttons.length) return;
	const next = Math.max(0, Math.min(buttons.length - 1, index));
	focusIndex.value = next;
	buttons[next].focus();
	buttons[next].scrollIntoView({ block: "nearest", inline: "nearest" });
};

// Arrow keys move between chips, Home/End jump to the ends, Enter or Space picks (native button).
const onKeydown = (event) => {
	const keys = { ArrowRight: 1, ArrowLeft: -1 };
	if (event.key in keys) {
		event.preventDefault();
		focusChip(focusIndex.value + keys[event.key]);
	} else if (event.key === "Home") {
		event.preventDefault();
		focusChip(0);
	} else if (event.key === "End") {
		event.preventDefault();
		focusChip(allChips.value.length - 1);
	}
};

const select = (group, index) => {
	focusIndex.value = index;
	emit("update:modelValue", group);
};

const revealActive = async () => {
	await nextTick();
	const index = allChips.value.findIndex((chip) => chip.value === current.value);
	if (index < 0) return;
	focusIndex.value = index;
	chipButtons()[index]?.scrollIntoView({ block: "nearest", inline: "center" });
};

let resizeObserver = null;
onMounted(() => {
	updateArrows();
	revealActive();
	if (typeof ResizeObserver !== "undefined" && scroller.value) {
		resizeObserver = new ResizeObserver(updateArrows);
		resizeObserver.observe(scroller.value);
	}
});
onBeforeUnmount(() => resizeObserver?.disconnect());

watch(current, revealActive);
watch(allChips, async () => {
	await nextTick();
	updateArrows();
});
</script>

<style scoped>
.group-chips-bar {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 4px 4px 8px;
}

.group-chips {
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	gap: 8px;
	overflow-x: auto;
	scrollbar-width: none;
	-webkit-overflow-scrolling: touch;
	padding: 2px;
}

.group-chips::-webkit-scrollbar {
	display: none;
}

.group-chips__arrow {
	flex: 0 0 44px;
	height: 48px;
	border-radius: 24px;
	border: 1px solid var(--pos-border);
	background: var(--pos-surface-raised);
	color: var(--pos-text-primary);
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.group-chips__arrow:disabled {
	opacity: 0.35;
	cursor: default;
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
}

.group-chip:hover {
	border-color: var(--pos-primary);
}

.group-chip--active {
	background: var(--pos-primary);
	border-color: var(--pos-primary);
	color: #fff;
}

.group-chip:focus-visible,
.group-chips__arrow:focus-visible {
	outline: 3px solid var(--pos-focus-halo, rgba(11, 114, 133, 0.5));
	outline-offset: 2px;
}
</style>
