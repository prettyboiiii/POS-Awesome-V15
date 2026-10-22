// @vitest-environment jsdom

import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useNumpadStore } from "../src/posapp/stores/numpadStore";
import ItemHeader from "../src/posapp/components/pos/items/ItemHeader.vue";

const VRowStub = defineComponent({
	setup(_, { slots }) {
		return () => h("div", { class: "v-row-stub" }, slots.default?.());
	},
});

const VColStub = defineComponent({
	setup(_, { slots }) {
		return () => h("div", { class: "v-col-stub" }, slots.default?.());
	},
});

const VBtnStub = defineComponent({
	setup(_, { attrs, slots }) {
		return () =>
			h(
				"button",
				{
					...attrs,
					type: "button",
				},
				slots.default?.(),
			);
	},
});

const VExpandTransitionStub = defineComponent({
	setup(_, { slots }) {
		return () =>
			h("div", { class: "expand-transition-stub" }, slots.default?.());
	},
});

const VProgressLinearStub = defineComponent({
	props: {
		modelValue: { type: Number, default: 0 },
	},
	setup(props, { attrs }) {
		return () =>
			h("div", {
				...attrs,
				class: ["v-progress-linear-stub", attrs.class],
				"data-model-value": String(props.modelValue),
			});
	},
});

const VTextFieldStub = defineComponent({
	props: {
		modelValue: { type: String, default: "" },
		label: { type: String, default: "" },
		disabled: { type: Boolean, default: false },
	},
	emits: ["update:modelValue", "keydown"],
	setup(props, { attrs, emit, slots }) {
		return () =>
			h("label", { class: "v-text-field-stub" }, [
				h("span", { class: "field-label" }, props.label),
				h("input", {
					...attrs,
					"data-test": attrs["data-test"] ?? "text-field-input",
					value: props.modelValue,
					disabled: props.disabled,
					onInput: (event: Event) =>
						emit(
							"update:modelValue",
							(event.target as HTMLInputElement).value,
						),
					onKeydown: (event: KeyboardEvent) => emit("keydown", event),
				}),
				slots["append-inner"]?.(),
			]);
	},
});

describe("ItemHeader", () => {
	beforeEach(() => setActivePinia(createPinia()));

	it("shows a non-blocking sync progress bar while keeping search input enabled", () => {
		const wrapper = mount(ItemHeader, {
			props: {
				searchInput: "tea",
				qtyInput: 1,
				posProfile: {
					posa_input_qty: false,
					posa_enable_camera_scanning: false,
				},
				enableBackgroundSync: true,
				showSyncProgress: true,
				syncProgress: 42,
				syncItemsCount: 128,
				syncStatus: "Syncing offline catalog...",
			},
			global: {
				mocks: {
					frappe: { _: (value: string) => value },
					__: (value: string) => value,
				},
				components: {
					VRow: VRowStub,
					VCol: VColStub,
					VBtn: VBtnStub,
					VExpandTransition: VExpandTransitionStub,
					VProgressLinear: VProgressLinearStub,
					VTextField: VTextFieldStub,
				},
			},
		});

		const input = wrapper.get('input[data-test="text-field-input"]');
		expect((input.element as HTMLInputElement).disabled).toBe(false);

		const progressBar = wrapper.get('[data-test="item-search-sync-bar"]');
		expect(progressBar.attributes("data-model-value")).toBe("42");
		expect(wrapper.text()).toContain("Syncing offline catalog...");
		expect(wrapper.text()).toContain("128 items synced");
	});

	it("exposes Counter Grid search as a linked active-descendant combobox", async () => {
		const wrapper = mount(ItemHeader, {
			props: {
				searchInput: "panadol",
				qtyInput: 1,
				posProfile: {
					posa_input_qty: false,
					posa_enable_camera_scanning: false,
				},
				searchCombobox: true,
				searchExpanded: true,
				searchControls: "pharmacy-item-search-results-grid",
				searchActiveDescendant: "pharmacy-item-result-41-33-31-30-36",
			},
			global: {
				mocks: {
					frappe: { _: (value: string) => value },
					__: (value: string) => value,
				},
				components: {
					VRow: VRowStub,
					VCol: VColStub,
					VBtn: VBtnStub,
					VExpandTransition: VExpandTransitionStub,
					VProgressLinear: VProgressLinearStub,
					VTextField: VTextFieldStub,
				},
			},
		});

		const input = wrapper.get('input[data-testid="pos-item-search"]');
		expect(input.attributes()).toMatchObject({
			role: "combobox",
			"aria-label": "Search saleable items",
			"aria-autocomplete": "list",
			"aria-expanded": "true",
			"aria-controls": "pharmacy-item-search-results-grid",
			"aria-activedescendant": "pharmacy-item-result-41-33-31-30-36",
		});
		expect(wrapper.findAll('[role="combobox"]')).toHaveLength(1);
	});

	describe("soft keyboard on touch devices", () => {
		const mountHeader = (extra: Record<string, unknown> = {}) =>
			mount(ItemHeader, {
				attachTo: document.body,
				props: {
					searchInput: "",
					qtyInput: 1,
					posProfile: { posa_input_qty: false, posa_enable_camera_scanning: false },
					...extra,
				},
				global: {
					mocks: {
						frappe: { _: (value: string) => value },
						__: (value: string) => value,
					},
					components: {
						VRow: VRowStub,
						VCol: VColStub,
						VBtn: VBtnStub,
						VExpandTransition: VExpandTransitionStub,
						VProgressLinear: VProgressLinearStub,
						VTextField: VTextFieldStub,
					},
				},
			});
		const setPointer = (coarse: boolean) =>
			vi.stubGlobal("matchMedia", () => ({
				matches: coarse,
				addEventListener: () => {},
				removeEventListener: () => {},
			}));

		afterEach(() => vi.unstubAllGlobals());

		it("keeps the scan box on inputmode none and shows a keyboard button on a tablet", async () => {
			setPointer(true);
			const wrapper = mountHeader();
			await wrapper.vm.$nextTick();
			const input = wrapper.get('input[data-testid="pos-item-search"]');
			expect(input.attributes("inputmode")).toBe("none");
			expect(wrapper.find('[data-testid="scan-keyboard-btn"]').exists()).toBe(true);
			wrapper.unmount();
		});

		it("opens the keyboard on request and closes it after Enter", async () => {
			setPointer(true);
			const wrapper = mountHeader();
			await wrapper.vm.$nextTick();
			await wrapper.get('[data-testid="scan-keyboard-btn"]').trigger("click");
			await wrapper.vm.$nextTick();
			const input = wrapper.get('input[data-testid="pos-item-search"]');
			expect(input.attributes("inputmode")).toBeUndefined();
			await input.trigger("keydown", { key: "Enter" });
			await wrapper.vm.$nextTick();
			expect(wrapper.get('input[data-testid="pos-item-search"]').attributes("inputmode")).toBe("none");
			wrapper.unmount();
		});

		it("opens the numpad on the scan box from the multiplier button on a tablet", async () => {
			setPointer(true);
			const wrapper = mountHeader({ context: "pos" });
			await wrapper.vm.$nextTick();
			await wrapper.get('[data-testid="scan-multiplier-btn"]').trigger("click");
			const numpad = useNumpadStore();
			expect(numpad.target).toBe(wrapper.get('input[data-testid="pos-item-search"]').element);
			expect(numpad.kind).toBe("multiplier");
			numpad.close();
			wrapper.unmount();
		});

		it("leaves the scan box alone on a mouse PC", async () => {
			setPointer(false);
			const wrapper = mountHeader();
			await wrapper.vm.$nextTick();
			const input = wrapper.get('input[data-testid="pos-item-search"]');
			expect(input.attributes("inputmode")).toBeUndefined();
			expect(wrapper.find('[data-testid="scan-keyboard-btn"]').exists()).toBe(false);
			wrapper.unmount();
		});
	});
});
