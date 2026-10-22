<template>
	<div
		v-if="coarsePointer && numpad.target"
		class="numpad"
		data-testid="numpad"
		role="group"
		:aria-label="__('Number pad')"
		@mousedown.prevent
	>
		<div class="numpad__head">
			<span class="numpad__label">{{ title }}</span>
			<strong class="numpad__value" data-testid="numpad-value">{{ shown || " " }}</strong>
			<button
				type="button"
				class="numpad__hide"
				data-testid="numpad-hide"
				:aria-label="__('Hide keypad')"
				@click="hide"
			>
				<span class="mdi mdi-chevron-down" aria-hidden="true"></span>
			</button>
		</div>
		<div class="numpad__grid">
			<button
				v-for="digit in ['7', '8', '9']"
				:key="digit"
				type="button"
				class="numpad__key"
				:data-testid="`numpad-${digit}`"
				@click="press(digit)"
			>
				{{ digit }}
			</button>
			<button
				type="button"
				class="numpad__key numpad__key--aux"
				data-testid="numpad-back"
				:aria-label="__('Delete last digit')"
				@click="press('back')"
			>
				<span class="mdi mdi-backspace-outline" aria-hidden="true"></span>
			</button>
			<button
				v-for="digit in ['4', '5', '6']"
				:key="digit"
				type="button"
				class="numpad__key"
				:data-testid="`numpad-${digit}`"
				@click="press(digit)"
			>
				{{ digit }}
			</button>
			<button
				type="button"
				class="numpad__key numpad__key--aux"
				data-testid="numpad-clear"
				:aria-label="__('Clear number')"
				@click="press('clear')"
			>
				C
			</button>
			<button
				v-for="digit in ['1', '2', '3']"
				:key="digit"
				type="button"
				class="numpad__key"
				:data-testid="`numpad-${digit}`"
				@click="press(digit)"
			>
				{{ digit }}
			</button>
			<button
				type="button"
				class="numpad__key numpad__key--done"
				data-testid="numpad-done"
				:aria-label="numpad.kind === 'multiplier' ? __('Close keypad') : __('Confirm number')"
				@click="done"
			>
				<span class="mdi mdi-check" aria-hidden="true"></span>
			</button>
			<button type="button" class="numpad__key numpad__key--zero" data-testid="numpad-0" @click="press('0')">
				0
			</button>
			<button
				v-if="numpad.kind === 'multiplier'"
				type="button"
				class="numpad__key numpad__key--aux"
				data-testid="numpad-times"
				:aria-label="__('Type a number, then press × to add that many')"
				@click="applyMultiplier"
			>
				×
			</button>
			<button
				v-else
				type="button"
				class="numpad__key"
				data-testid="numpad-point"
				:disabled="numpad.kind !== 'decimal'"
				@click="press('.')"
			>
				.
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useCoarsePointer } from "../../../composables/core/useCoarsePointer";
import { useNumpadStore } from "../../../stores/numpadStore";
import {
	applyNumpadKey,
	isNumpadKind,
	numpadDisplay,
	numpadOpensOnFocus,
	type NumpadKey,
} from "../../../utils/numpadInput";

declare const __: (_text: string, _args?: any[]) => string;

const { coarsePointer } = useCoarsePointer();
const numpad = useNumpadStore();
const value = ref("");

const title = computed(() => numpad.label || __("Enter a number"));
const shown = computed(() => numpadDisplay(value.value, numpad.kind));

const sync = () => {
	value.value = numpad.target?.value ?? "";
};

const fire = (el: HTMLElement, type: string) => el.dispatchEvent(new Event(type, { bubbles: true }));

const fireKey = (el: HTMLElement, type: "keydown" | "keyup", key: string) => {
	const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
	el.dispatchEvent(event);
	return event;
};

const press = (input: string) => {
	const key = input as NumpadKey;
	const el = numpad.target;
	if (!el) return;
	if (!el.isConnected) {
		numpad.close();
		return;
	}
	const text = el.value ?? "";
	const next = applyNumpadKey(
		{ value: text, start: el.selectionStart ?? text.length, end: el.selectionEnd ?? text.length },
		key,
		numpad.kind,
	);
	if (next.value !== text) {
		el.value = next.value;
		fire(el, "input");
	}
	try {
		el.setSelectionRange(next.start, next.end);
	} catch {
		/* a number input has no selection; the caret stays at the end */
	}
	sync();
};

// A script edit does not set the browser's "changed by the user" flag, so no native change event follows
// on blur. Fields that commit on change (tender amounts) need it sent by hand.
const commit = (el: HTMLElement) => fire(el, "change");

const done = () => {
	const el = numpad.target;
	if (el && numpad.kind !== "multiplier" && el.isConnected) {
		commit(el);
		fireKey(el, "keydown", "Enter");
		fireKey(el, "keyup", "Enter");
	}
	numpad.close();
};

const hide = () => {
	const el = numpad.target;
	if (el && numpad.kind !== "multiplier" && el.isConnected) {
		commit(el);
		el.blur();
	}
	numpad.close();
};

// The scan box reads "5" then "*" as "add 5 of the next item"; press the same key a keyboard would.
const applyMultiplier = () => {
	const el = numpad.target;
	if (!el) return;
	const event = fireKey(el, "keydown", "*");
	if (event.defaultPrevented) numpad.close();
};

const inputOf = (target: EventTarget | null): HTMLInputElement | null => {
	const node = target as Element | null;
	if (!node?.closest) return null;
	const direct = node.closest("input[data-numpad]");
	if (direct) return direct as HTMLInputElement;
	return (node.closest(".v-input")?.querySelector("input[data-numpad]") as HTMLInputElement | null) ?? null;
};

const openFor = (el: HTMLInputElement, select: boolean) => {
	const kind = el.dataset.numpad;
	if (!isNumpadKind(kind)) return;
	numpad.open(el, kind, el.dataset.numpadLabel || "");
	sync();
	if (select && kind !== "pin" && !el.readOnly && !el.disabled) {
		el.select?.();
		window.requestAnimationFrame?.(() => el.select?.());
	}
};

const onClick = (event: MouseEvent) => {
	if (!coarsePointer.value) return;
	const el = inputOf(event.target);
	if (!el || el.readOnly || el.disabled) return;
	openFor(el, true);
};

const onFocusIn = (event: FocusEvent) => {
	if (!coarsePointer.value) return;
	const el = inputOf(event.target);
	if (!el || el.disabled) return;
	if (isNumpadKind(el.dataset.numpad) && numpadOpensOnFocus(el.dataset.numpad)) openFor(el, false);
};

const onFocusOut = (event: FocusEvent) => {
	const el = numpad.target;
	if (!el || event.target !== el || numpad.kind === "multiplier") return;
	window.setTimeout(() => {
		if (numpad.target === el && document.activeElement !== el) numpad.close();
	}, 0);
};

const onInput = (event: Event) => {
	if (event.target === numpad.target) sync();
};

onMounted(() => {
	document.addEventListener("click", onClick, true);
	document.addEventListener("focusin", onFocusIn, true);
	document.addEventListener("focusout", onFocusOut, true);
	document.addEventListener("input", onInput, true);
});

onBeforeUnmount(() => {
	document.removeEventListener("click", onClick, true);
	document.removeEventListener("focusin", onFocusIn, true);
	document.removeEventListener("focusout", onFocusOut, true);
	document.removeEventListener("input", onInput, true);
	numpad.close();
});
</script>

<style scoped>
.numpad {
	position: fixed;
	left: 50%;
	bottom: 0;
	transform: translateX(-50%);
	z-index: 9000;
	width: min(100vw, 440px);
	padding: 10px 12px calc(12px + env(safe-area-inset-bottom, 0px));
	border-radius: 16px 16px 0 0;
	background: rgb(var(--v-theme-surface));
	color: rgb(var(--v-theme-on-surface));
	box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.35);
	user-select: none;
	-webkit-user-select: none;
	touch-action: manipulation;
}

.numpad__head {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 8px;
}

.numpad__label {
	flex: 0 1 auto;
	font-size: 1rem;
	opacity: 0.75;
}

.numpad__value {
	flex: 1 1 auto;
	text-align: end;
	font-size: 2rem;
	font-variant-numeric: tabular-nums;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.numpad__hide {
	flex: 0 0 48px;
	width: 48px;
	height: 48px;
	border: 0;
	border-radius: 12px;
	background: transparent;
	font-size: 1.8rem;
	color: inherit;
}

.numpad__grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 8px;
}

.numpad__key {
	min-height: 64px;
	border: 1px solid rgba(var(--v-border-color), 0.4);
	border-radius: 12px;
	background: rgba(var(--v-theme-on-surface), 0.06);
	color: inherit;
	font-size: 1.7rem;
	font-weight: 700;
	font-family: inherit;
}

.numpad__key:active:not(:disabled) {
	background: rgba(var(--v-theme-primary), 0.25);
}

.numpad__key:disabled {
	opacity: 0.35;
}

.numpad__key--aux {
	background: rgba(var(--v-theme-on-surface), 0.12);
}

.numpad__key--zero {
	grid-column: span 2;
}

.numpad__key--done {
	grid-column: 4;
	grid-row: 3 / span 2;
	background: rgb(var(--v-theme-primary));
	border-color: transparent;
	color: rgb(var(--v-theme-on-primary));
	font-size: 2.2rem;
}
</style>
