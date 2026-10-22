// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NumPad from "../src/posapp/components/pos/shell/NumPad.vue";
import { useNumpadStore } from "../src/posapp/stores/numpadStore";

const setPointer = (coarse: boolean) =>
	vi.stubGlobal("matchMedia", () => ({
		matches: coarse,
		addEventListener: () => {},
		removeEventListener: () => {},
	}));

const addInput = (kind: string, value = "", label = "") => {
	const input = document.createElement("input");
	input.setAttribute("data-numpad", kind);
	if (label) input.setAttribute("data-numpad-label", label);
	input.value = value;
	document.body.appendChild(input);
	return input;
};

const mountPad = () =>
	mount(NumPad, { attachTo: document.body, global: { mocks: { __: (text: string) => text } } });

describe("NumPad", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		(globalThis as any).__ = (text: string) => text;
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		delete (globalThis as any).__;
		document.body.replaceChildren();
	});

	it("opens on a tap of an opted-in input and types into it", async () => {
		setPointer(true);
		const wrapper = mountPad();
		const input = addInput("decimal", "100.00", "Amount");
		const seen: string[] = [];
		input.addEventListener("input", () => seen.push(input.value));

		input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-testid="numpad"]').exists()).toBe(true);
		expect(wrapper.text()).toContain("Amount");

		// the tap selects the whole value, so the first key replaces it
		input.setSelectionRange(0, input.value.length);
		await wrapper.get('[data-testid="numpad-2"]').trigger("click");
		await wrapper.get('[data-testid="numpad-5"]').trigger("click");
		await wrapper.get('[data-testid="numpad-point"]').trigger("click");
		await wrapper.get('[data-testid="numpad-5"]').trigger("click");
		expect(input.value).toBe("25.5");
		expect(seen).toEqual(["2", "25", "25.", "25.5"]);
		expect(wrapper.get('[data-testid="numpad-value"]').text()).toBe("25.5");

		await wrapper.get('[data-testid="numpad-back"]').trigger("click");
		expect(input.value).toBe("25.");
		await wrapper.get('[data-testid="numpad-clear"]').trigger("click");
		expect(input.value).toBe("");
		wrapper.unmount();
	});

	it("Done sends change and Enter like a keyboard would, then closes", async () => {
		setPointer(true);
		const wrapper = mountPad();
		const input = addInput("decimal", "5");
		const events: string[] = [];
		input.addEventListener("change", () => events.push("change"));
		input.addEventListener("keydown", (e) => events.push(`keydown:${(e as KeyboardEvent).key}`));
		input.addEventListener("keyup", (e) => events.push(`keyup:${(e as KeyboardEvent).key}`));

		input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await wrapper.vm.$nextTick();
		await wrapper.get('[data-testid="numpad-done"]').trigger("click");
		expect(events).toEqual(["change", "keydown:Enter", "keyup:Enter"]);
		expect(wrapper.find('[data-testid="numpad"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it("a PIN field opens on focus, shows dots and has no decimal point", async () => {
		setPointer(true);
		const wrapper = mountPad();
		const input = addInput("pin");
		input.focus();
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-testid="numpad"]').exists()).toBe(true);
		await wrapper.get('[data-testid="numpad-1"]').trigger("click");
		await wrapper.get('[data-testid="numpad-2"]').trigger("click");
		expect(input.value).toBe("12");
		expect(wrapper.get('[data-testid="numpad-value"]').text()).toBe("••");
		expect((wrapper.get('[data-testid="numpad-point"]').element as HTMLButtonElement).disabled).toBe(true);
		wrapper.unmount();
	});

	it("a decimal field does not open on focus alone", async () => {
		setPointer(true);
		const wrapper = mountPad();
		addInput("decimal").focus();
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-testid="numpad"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it("does nothing on a mouse PC", async () => {
		setPointer(false);
		const wrapper = mountPad();
		const input = addInput("decimal", "1");
		input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-testid="numpad"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it("ignores a read-only field (an exact transfer amount)", async () => {
		setPointer(true);
		const wrapper = mountPad();
		const input = addInput("decimal", "35.00");
		input.readOnly = true;
		input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-testid="numpad"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it("multiplier mode types digits, presses * like the keyboard and closes when it is taken", async () => {
		setPointer(true);
		const wrapper = mountPad();
		const input = addInput("integer");
		const numpad = useNumpadStore();
		numpad.open(input, "multiplier", "Quantity for the next item");
		await wrapper.vm.$nextTick();
		expect(wrapper.text()).toContain("Quantity for the next item");

		const keys: string[] = [];
		input.addEventListener("keydown", (e) => {
			keys.push((e as KeyboardEvent).key);
			e.preventDefault();
		});
		await wrapper.get('[data-testid="numpad-1"]').trigger("click");
		await wrapper.get('[data-testid="numpad-2"]').trigger("click");
		expect(input.value).toBe("12");
		await wrapper.get('[data-testid="numpad-times"]').trigger("click");
		expect(keys).toEqual(["*"]);
		expect(wrapper.find('[data-testid="numpad"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it("multiplier mode stays open when the scan box does not accept the number", async () => {
		setPointer(true);
		const wrapper = mountPad();
		const input = addInput("integer");
		useNumpadStore().open(input, "multiplier");
		await wrapper.vm.$nextTick();
		await wrapper.get('[data-testid="numpad-times"]').trigger("click");
		expect(wrapper.find('[data-testid="numpad"]').exists()).toBe(true);
		await wrapper.get('[data-testid="numpad-done"]').trigger("click");
		expect(wrapper.find('[data-testid="numpad"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it("closes when the field it types into has left the page", async () => {
		setPointer(true);
		const wrapper = mountPad();
		const input = addInput("decimal", "1");
		input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await wrapper.vm.$nextTick();
		input.remove();
		await wrapper.get('[data-testid="numpad-1"]').trigger("click");
		expect(wrapper.find('[data-testid="numpad"]').exists()).toBe(false);
		wrapper.unmount();
	});
});
