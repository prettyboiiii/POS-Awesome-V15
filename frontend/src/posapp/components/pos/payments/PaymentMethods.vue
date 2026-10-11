<template>
	<div v-if="payments && payments.length" class="payment-methods">
		<!-- mart: pick the method first (cash is preselected), then the amount. -->
		<div
			v-if="methodPicker && payments.length > 1"
			class="payment-mode-picker"
			role="radiogroup"
			:aria-label="__('Payment Method')"
		>
			<v-btn
				v-for="payment in payments"
				:key="`mode-${payment.name || payment.mode_of_payment}`"
				role="radio"
				:aria-checked="selectedMode === payment.mode_of_payment"
				:class="[
					'payment-mode-picker__btn',
					{ 'payment-mode-picker__btn--active': selectedMode === payment.mode_of_payment },
				]"
				:data-test="`payment-mode-${payment.mode_of_payment}`"
				variant="flat"
				@click="chooseMode(payment)"
			>
				<v-icon start>{{ isCashLikePayment(payment) ? "mdi-cash" : "mdi-qrcode" }}</v-icon>
				{{ payment.mode_of_payment }}
			</v-btn>
			<v-btn
				role="radio"
				:aria-checked="isSplit"
				:class="['payment-mode-picker__btn', { 'payment-mode-picker__btn--active': isSplit }]"
				data-test="payment-mode-split"
				variant="flat"
				@click="selectedMode = SPLIT"
			>
				<v-icon start>mdi-call-split</v-icon>
				{{ __("Split payment") }}
			</v-btn>
		</div>
		<div
			v-for="(payment, paymentIndex) in shownPayments"
			:key="payment.name"
			class="payment-method-card"
			:class="{ 'payment-method-card--active': Number(payment.amount || 0) !== 0 }"
			:data-state="Number(payment.amount || 0) !== 0 ? 'active' : 'idle'"
			:data-payment-shortcut-index="
				showKeyboardShortcuts && paymentIndex < 9 ? paymentIndex + 1 : undefined
			"
		>
			<div v-if="!singleMode || isReturn" class="payment-method-card__header">
				<div>
					<p class="payment-method-card__label">{{ frappe._("Method") }}</p>
					<h4 class="payment-method-card__title">{{ payment.mode_of_payment }}</h4>
				</div>
				<div class="payment-method-card__badges">
					<span
						v-if="isReturn"
						class="payment-method-card__badge payment-method-card__badge--refund"
					>
						{{ __("Refund") }}
					</span>
					<span v-if="payment.default === 1" class="payment-method-card__badge">
						{{ __("Default") }}
					</span>
					<span
						v-if="payment._posa_auto_remainder"
						class="payment-method-card__badge payment-method-card__badge--auto"
					>
						{{ __("Auto remainder") }}
					</span>
					<v-btn
						v-if="!isMpesaC2bPayment(payment) && !isGiftCardPayment(payment)"
						icon
						size="x-small"
						variant="text"
						:color="payment._posa_remainder_locked ? 'warning' : 'secondary'"
						:title="remainderLockTitle(payment)"
						:data-test="`payment-remainder-lock-${payment.mode_of_payment}`"
						@click="$emit('toggle-remainder-lock', payment)"
					>
						<v-icon size="16">
							{{ payment._posa_remainder_locked ? "mdi-lock" : "mdi-lock-open-variant" }}
						</v-icon>
					</v-btn>
					<kbd
						v-if="showKeyboardShortcuts && paymentIndex < 9"
						class="payment-method-card__shortcut"
					>
						Ctrl/⌘+{{ paymentIndex + 1 }}
					</kbd>
				</div>
			</div>

			<v-row class="payments ma-0" dense>
				<v-col v-if="!isMpesaC2bPayment(payment) && multiCurrencyEnabled" cols="12" md="3">
					<v-select
						density="compact"
						variant="solo"
						class="sleek-field pos-themed-input"
						hide-details
						:label="frappe._('Tender Currency')"
						:items="allowedCurrencies"
						:model-value="payment.posa_payment_currency || currency"
						:readonly="!allowCurrencySelection"
						@update:model-value="$emit('update-currency', payment, $event)"
					></v-select>
				</v-col>
				<v-col
					cols="12"
					:md="singleMode ? 12 : multiCurrencyEnabled ? 4 : 7"
					v-if="!isMpesaC2bPayment(payment)"
				>
					<v-text-field
						data-pos-keyboard-target="payment-amount"
						:data-testid="`payment-amount-${payment.mode_of_payment}`"
						density="compact"
						variant="solo"
						:color="isReturn ? 'error' : 'primary'"
						:label="frappe._('Amount')"
						:class="['sleek-field pos-themed-input', isReturn ? 'pos-themed-input--refund' : '']"
						hide-details
						:model-value="formatCurrency(payment.posa_original_amount ?? payment.amount)"
						@focusin="$emit('set-rest-amount', payment, isReturn)"
						@change="$emit('update-amount', payment, $event)"
						:rules="[isNumber]"
						:prefix="currencySymbol(payment.posa_payment_currency || currency)"
						@keydown.enter="blurTarget"
						@keydown.esc="blurTarget"
						:readonly="isGiftCardPayment(payment) || isExactTransfer(payment)"
					></v-text-field>
					<p
						v-if="isExactTransfer(payment)"
						class="payment-method-card__hint"
						data-test="payment-transfer-hint"
					>
						{{
							__("Ask for a transfer of exactly {0} and check it in the bank app before you confirm.", [
								`${currencySymbol(payment.posa_payment_currency || currency)}${formatCurrency(payment.amount)}`,
							])
						}}
					</p>
					<div v-if="multiCurrencyEnabled" class="payment-currency-equivalent">
						<span v-if="payment._posa_rate_error" class="payment-currency-equivalent--error">
							{{ __("Exchange rate unavailable") }}
						</span>
						<span v-else>
							{{ __("Invoice equivalent") }}: {{ currencySymbol(currency)
							}}{{ formatCurrency(payment.amount) }}
						</span>
					</div>
				</v-col>
				<v-col cols="12" :md="multiCurrencyEnabled ? 5 : 5" v-if="!isMpesaC2bPayment(payment) && !singleMode">
					<v-text-field
						v-if="allowManualRate && payment.posa_payment_currency !== currency"
						density="compact"
						variant="solo"
						class="sleek-field pos-themed-input mb-2"
						hide-details
						type="number"
						min="0"
						step="any"
						:label="frappe._('Rate to Invoice Currency')"
						:model-value="payment.posa_exchange_rate"
						@change="$emit('update-rate', payment, $event)"
					></v-text-field>
					<div class="payment-method-actions">
						<v-btn
							block
							color="primary"
							variant="flat"
							class="payment-method-action-btn"
							data-pos-keyboard-target="payment-action"
							:data-test="`payment-method-action-${payment.mode_of_payment}`"
							:aria-keyshortcuts="
								showKeyboardShortcuts && paymentIndex < 9
									? `Control+${paymentIndex + 1} Meta+${paymentIndex + 1}`
									: undefined
							"
							@click="handlePrimaryAction(payment)"
						>
							<!-- mart: the card title already names the method; say what the button does. -->
							{{ isGiftCardPayment(payment) ? __("Redeem / Scan") : __("Pay in full") }}
						</v-btn>
					</div>
				</v-col>

				<v-col
					cols="12"
					v-if="
						payment.default === 1 &&
						isCashLikePayment(payment) &&
						getVisibleDenominations(payment).length
					"
					class="pa-0"
				>
					<div class="payment-denominations">
						<v-btn
							v-for="d in getVisibleDenominations(payment)"
							:key="d"
							size="small"
							color="secondary"
							variant="tonal"
							class="payment-denominations__btn"
							data-pos-keyboard-target="payment-denomination"
							@click="$emit('set-denomination', payment, d)"
						>
							{{ formatCurrency(d) }}
						</v-btn>
					</div>
				</v-col>

				<v-col cols="12" v-if="isMpesaC2bPayment(payment)" class="pa-0">
					<v-btn
						block
						color="success"
						variant="flat"
						class="payment-method-action-btn payment-method-action-btn--success"
						data-pos-keyboard-target="payment-action"
						:aria-keyshortcuts="
							showKeyboardShortcuts && paymentIndex < 9
								? `Control+${paymentIndex + 1} Meta+${paymentIndex + 1}`
								: undefined
						"
						@click="$emit('mpesa-dialog', payment)"
					>
						{{ __("Get Payments") }}
					</v-btn>
				</v-col>

				<v-col
					cols="12"
					v-if="payment.type === 'Phone' && payment.amount > 0 && requestPaymentField"
					class="pa-0"
				>
					<v-btn
						block
						color="success"
						variant="tonal"
						class="payment-method-action-btn payment-method-action-btn--secondary"
						data-pos-keyboard-target="payment-action"
						:disabled="payment.amount === 0"
						@click="$emit('request-payment', payment)"
					>
						{{ __("Request Payment") }}
					</v-btn>
				</v-col>
			</v-row>
		</div>
	</div>
</template>

<script setup>
import { computed, ref, watch } from "vue";

const frappe = window.frappe;
const __ = window.__;

const props = defineProps({
	payments: Array,
	currency: String,
	isReturn: Boolean,
	requestPaymentField: Boolean,
	multiCurrencyEnabled: Boolean,
	allowCurrencySelection: Boolean,
	allowManualRate: Boolean,
	allowedCurrencies: {
		type: Array,
		default: () => [],
	},
	currencySymbol: Function,
	formatCurrency: Function,
	isNumber: Function,
	getVisibleDenominations: Function,
	isCashLikePayment: Function,
	isMpesaC2bPayment: Function,
	isGiftCardPayment: {
		type: Function,
		default: () => false,
	},
	showKeyboardShortcuts: Boolean,
	// mart: show a method picker and only the chosen method's card (or every card for a split payment).
	methodPicker: Boolean,
});

const emit = defineEmits([
	"update-amount",
	"update-currency",
	"update-rate",
	"set-rest-amount",
	"toggle-remainder-lock",
	"set-full-amount",
	"set-denomination",
	"mpesa-dialog",
	"request-payment",
	"open-gift-card",
]);

const SPLIT = "__split__";
const selectedMode = ref("");
const isSplit = computed(() => selectedMode.value === SPLIT);
const singleMode = computed(() => props.methodPicker && props.payments?.length > 1 && !isSplit.value);
const shownPayments = computed(() => {
	if (!singleMode.value) return props.payments || [];
	const chosen = props.payments.find((p) => p.mode_of_payment === selectedMode.value);
	return chosen ? [chosen] : props.payments;
});

// A transfer (PromptPay) is always the exact bill: nothing to type and no change to give.
const isExactTransfer = (payment) =>
	singleMode.value && !props.isCashLikePayment(payment) && !props.isGiftCardPayment(payment);

const paidRows = () => (props.payments || []).filter((p) => Number(p.amount || 0) !== 0);

const initialMode = () => {
	const paid = paidRows();
	if (paid.length > 1) return SPLIT;
	if (paid.length === 1) return paid[0].mode_of_payment;
	const preferred = (props.payments || []).find((p) => p.default === 1) || props.payments?.[0];
	return preferred?.mode_of_payment || "";
};

const chooseMode = (payment) => {
	selectedMode.value = payment.mode_of_payment;
	emit("set-full-amount", payment, props.isReturn);
};

// A new invoice starts from its own amounts (the default method is already filled in).
watch(
	() => props.payments,
	() => {
		selectedMode.value = initialMode();
	},
	{ immediate: true },
);

// Keep the picker in step when amounts move from elsewhere (keyboard shortcuts, a reloaded draft).
watch(
	() => (props.payments || []).map((p) => Number(p.amount || 0)).join("|"),
	() => {
		if (!props.methodPicker || isSplit.value) return;
		const paid = paidRows();
		if (paid.length > 1) selectedMode.value = SPLIT;
		else if (paid.length === 1) selectedMode.value = paid[0].mode_of_payment;
	},
);

const remainderLockTitle = (payment) =>
	payment?._posa_remainder_locked ? __("Unlock automatic remainder") : __("Lock automatic remainder");

const handlePrimaryAction = (payment) => {
	if (props.isGiftCardPayment(payment)) {
		emit("open-gift-card", payment);
		return;
	}
	emit("set-full-amount", payment, props.isReturn);
};

const blurTarget = (event) => {
	event?.target?.blur?.();
};
</script>

<style scoped>
.payment-mode-picker {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
	gap: var(--pos-space-2);
}

.payment-mode-picker__btn {
	min-height: 64px !important;
	border: 2px solid var(--pos-border) !important;
	border-radius: var(--pos-radius-sm) !important;
	background: var(--pos-surface-raised) !important;
	color: var(--pos-text-primary) !important;
	font-size: 1.15rem;
	font-weight: 700;
	text-transform: none;
	letter-spacing: 0;
}

.payment-mode-picker__btn--active {
	border-color: var(--pos-primary) !important;
	background: var(--pos-primary-container) !important;
	color: var(--pos-primary-variant) !important;
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--pos-primary) 35%, transparent);
}

.payment-method-card__hint {
	margin: 8px 4px 0;
	font-size: 0.95rem;
	color: var(--pos-text-secondary);
}

.payment-methods {
	display: flex;
	flex-direction: column;
	gap: var(--pos-space-2);
}

.payment-method-card {
	position: relative;
	background: var(--pos-surface-raised);
	border: 1px solid var(--pos-border);
	border-radius: var(--pos-radius-md);
	padding: var(--pos-space-3);
	display: flex;
	flex-direction: column;
	gap: var(--pos-space-3);
	overflow: hidden;
	transition:
		border-color 140ms ease,
		box-shadow 140ms ease,
		background-color 140ms ease;
}

.payment-method-card::before {
	content: "";
	position: absolute;
	inset-block: 0;
	inset-inline-start: 0;
	width: 4px;
	background: transparent;
}

.payment-method-card--active {
	border-color: color-mix(in srgb, var(--pos-primary) 60%, var(--pos-border));
	background:
		linear-gradient(
			90deg,
			color-mix(in srgb, var(--pos-primary-container) 38%, transparent),
			transparent 52%
		),
		var(--pos-surface-raised);
	box-shadow: var(--pos-elevation-1);
}

.payment-method-card--active::before {
	background: var(--pos-primary);
}

.payment-method-card__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--pos-space-2);
}

.payment-method-card__label {
	margin: 0 0 var(--pos-space-1);
	font-size: 0.72rem;
	font-weight: 750;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--pos-text-secondary);
}

.payment-method-card__title {
	margin: 0;
	font-size: 1rem;
	line-height: 1.2;
	font-weight: 650;
	color: var(--pos-text-primary);
}

.payment-method-card__badges {
	display: flex;
	gap: var(--pos-space-1);
	align-items: center;
	flex-wrap: wrap;
	justify-content: flex-end;
}

.payment-method-card__badge {
	padding: 6px 10px;
	border-radius: 999px;
	background: var(--pos-primary-container);
	border: 1px solid color-mix(in srgb, var(--pos-primary) 34%, var(--pos-border));
	color: var(--pos-primary-variant);
	font-size: 0.78rem;
	font-weight: 700;
	white-space: nowrap;
}

.payment-method-card__badge--refund {
	background: var(--pos-error-container);
	border-color: color-mix(in srgb, var(--pos-error) 34%, var(--pos-border));
	color: var(--pos-error);
}

.payment-method-card__shortcut {
	padding: 4px 7px;
	border: 1px solid var(--pos-border);
	border-bottom-width: 2px;
	border-radius: 3px;
	background: var(--pos-surface);
	color: var(--pos-text-secondary);
	font: inherit;
	font-size: 0.68rem;
	font-weight: 800;
	line-height: 1;
	white-space: nowrap;
}

:deep(.pos-themed-input--refund input) {
	color: rgb(var(--v-theme-error)) !important;
	font-weight: 700;
}

.payment-method-action-btn {
	--v-theme-overlay-multiplier: 0 !important;
	min-height: 44px;
	border-radius: var(--pos-radius-sm);
	font-weight: 700;
	text-transform: none;
	letter-spacing: 0.01em;
	transition:
		box-shadow 0.18s ease,
		background-color 0.18s ease,
		transform 0.18s ease !important;
	background-color: var(--pos-action-primary) !important;
	color: #ffffff !important;
}

.payment-method-actions {
	display: block;
}

.payment-method-card__badge--auto {
	background: var(--pos-success-container);
	border-color: color-mix(in srgb, var(--pos-success) 34%, var(--pos-border));
	color: var(--pos-success);
}

.payment-currency-equivalent {
	margin-top: 6px;
	font-size: 0.75rem;
	color: var(--pos-text-secondary);
}

.payment-currency-equivalent--error {
	color: rgb(var(--v-theme-error));
	font-weight: 700;
}

.payment-method-action-btn:hover,
.payment-method-action-btn:focus,
.payment-method-action-btn:focus-visible,
.payment-method-action-btn:active {
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18) !important;
	transform: translateY(-1px);
	background-color: var(--pos-action-primary-hover) !important;
}

.payment-method-action-btn:active {
	transform: translateY(0);
}

:deep(.payment-method-action-btn .v-btn__overlay),
:deep(.payment-method-action-btn .v-btn__underlay) {
	opacity: 0 !important;
	background: transparent !important;
}

:deep(.payment-method-action-btn .v-btn__content) {
	color: #ffffff !important;
}

.payment-method-action-btn--success {
	background: var(--pos-action-pay) !important;
	color: #ffffff !important;
}

.payment-method-action-btn--success:hover,
.payment-method-action-btn--success:focus,
.payment-method-action-btn--success:focus-visible,
.payment-method-action-btn--success:active {
	background-color: var(--pos-action-pay-hover) !important;
}

.payment-method-action-btn--secondary {
	background: var(--pos-action-pay) !important;
	color: #ffffff !important;
}

.payment-method-action-btn--secondary:hover,
.payment-method-action-btn--secondary:focus,
.payment-method-action-btn--secondary:focus-visible,
.payment-method-action-btn--secondary:active {
	background-color: var(--pos-action-pay-hover) !important;
}

.payment-denominations {
	display: flex;
	flex-wrap: wrap;
	gap: var(--pos-space-2);
}

.payment-denominations__btn {
	min-width: 72px;
	border: 1px solid var(--pos-border);
	border-radius: var(--pos-radius-sm);
	background: var(--pos-surface-muted) !important;
	color: var(--pos-text-primary) !important;
	text-transform: none;
	font-weight: 650;
	font-variant-numeric: tabular-nums;
}

.payment-denominations__btn:hover {
	border-color: var(--pos-primary);
	background: var(--pos-primary-container) !important;
}

@media (max-width: 768px) {
	.payment-method-card {
		padding: var(--pos-space-2);
		gap: var(--pos-space-2);
	}

	.payment-method-actions {
		grid-template-columns: 1fr;
	}
}
</style>
