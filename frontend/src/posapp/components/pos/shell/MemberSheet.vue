<template>
	<v-dialog
		:model-value="sheet.open"
		persistent
		max-width="640"
		scrim="rgba(0,0,0,0.55)"
		:retain-focus="false"
		@keydown.esc.stop="back"
	>
		<v-card v-if="payload" class="member-sheet" data-testid="member-sheet">
			<header class="member-sheet__head">
				<h2>{{ isPay ? __("Before payment") : __("Member lookup") }}</h2>
				<strong v-if="isPay" class="member-sheet__total">{{ money(payload.total) }}</strong>
			</header>

			<!-- A known customer: show what is worth knowing, then carry on. -->
			<section v-if="payload.member" class="member-sheet__card" data-testid="member-sheet-member">
				<div class="member-sheet__name">
					<v-icon color="success">mdi-account-check</v-icon>
					{{ payload.member.customer_name }}
				</div>
				<div class="member-sheet__facts">
					<span v-if="payload.member.points > 0">
						{{
							__("{0} points (worth {1})", [
								payload.member.points,
								money(payload.member.points_value),
							])
						}}
					</span>
					<span v-if="payload.member.birthday === 'today'" class="member-sheet__birthday">
						🎂 {{ __("Birthday today") }}
					</span>
					<span v-else-if="payload.member.birthday === 'month'">🎂 {{ __("Birthday this month") }}</span>
					<span v-if="payload.member.outstanding > 0" class="member-sheet__debt">
						{{ __("Owes {0}", [money(payload.member.outstanding)]) }}
					</span>
				</div>
			</section>

			<!-- The walk-in: find a member by phone, or sign one up. -->
			<template v-else>
				<p v-if="payload.saving > 0 || payload.earn > 0" class="member-sheet__pitch" data-testid="member-sheet-pitch">
					<span v-if="payload.saving > 0">
						{{ __("Members save {0} on this bill", [money(payload.saving)]) }}
					</span>
					<span v-if="payload.earn > 0">
						{{
							payload.saving > 0
								? __("and earn {0} points", [payload.earn])
								: __("Members earn {0} points on this bill", [payload.earn])
						}}
					</span>
				</p>

				<v-text-field
					ref="phoneField"
					v-model="phone"
					:label="__('Member phone')"
					inputmode="tel"
					autocomplete="off"
					variant="outlined"
					density="comfortable"
					hide-details="auto"
					:loading="searching"
					prepend-inner-icon="mdi-phone"
					class="member-sheet__phone"
					data-testid="member-sheet-phone"
					@keydown.enter.prevent="onPhoneEnter"
				/>

				<section v-if="found" class="member-sheet__card" data-testid="member-sheet-found">
					<div class="member-sheet__name">
						<v-icon color="success">mdi-account-check</v-icon>
						{{ found.customer_name }}
					</div>
					<div class="member-sheet__facts">
						<span v-if="found.points > 0">{{ __("{0} points", [found.points]) }}</span>
						<span v-if="found.outstanding > 0" class="member-sheet__debt">
							{{ __("Owes {0}", [money(found.outstanding)]) }}
						</span>
					</div>
					<v-btn color="primary" size="x-large" block data-testid="member-sheet-select" @click="chooseFound">
						{{ __("Select this member") }}
					</v-btn>
				</section>

				<section v-else-if="notFound" class="member-sheet__card" data-testid="member-sheet-signup">
					<div class="member-sheet__name">{{ __("Not a member yet. Sign up:") }}</div>
					<v-text-field
						ref="nameField"
						v-model="name"
						:label="__('Name or nickname')"
						variant="outlined"
						density="comfortable"
						hide-details="auto"
						data-testid="member-sheet-name"
						@keydown.enter.prevent="submitSignup"
					/>
					<v-text-field
						v-model="birthdayText"
						:label="__('Birthday (day/month, year optional)')"
						placeholder="17/05/2535"
						persistent-placeholder
						inputmode="numeric"
						variant="outlined"
						density="comfortable"
						:error="birthdayInvalid"
						:error-messages="birthdayInvalid ? [__('Use day/month/year, for example 17/05/2535')] : []"
						hide-details="auto"
						data-testid="member-sheet-birthday"
						@keydown.enter.prevent="submitSignup"
					/>
					<v-checkbox
						v-model="consent"
						:label="__('Agrees to receive news and promotions')"
						density="comfortable"
						hide-details
						data-testid="member-sheet-consent"
					/>
					<p v-if="error" class="member-sheet__error" role="alert">{{ error }}</p>
					<v-btn
						color="primary"
						size="x-large"
						block
						:loading="saving"
						:disabled="!name.trim() || birthdayInvalid"
						data-testid="member-sheet-signup-submit"
						@click="submitSignup"
					>
						{{ __("Sign up and select") }}
					</v-btn>
				</section>
			</template>

			<ul v-if="payload.hints.length" class="member-sheet__hints" data-testid="member-sheet-hints">
				<li v-for="(hint, index) in payload.hints" :key="index">
					<v-icon size="small" color="warning">mdi-tag-outline</v-icon>
					<span v-if="hint.kind === 'amount'">
						{{ __("Spend {0} more to get: {1}", [money(hint.gap), hint.title]) }}
					</span>
					<span v-else>{{ __("Add {0} more to get: {1}", [hint.gap, hint.title]) }}</span>
				</li>
			</ul>

			<footer class="member-sheet__actions">
				<v-btn variant="text" size="large" data-testid="member-sheet-back" @click="back">
					{{ isPay ? __("Back to cart") : __("Close") }}
				</v-btn>
				<v-btn
					v-if="isPay"
					:color="payload.member ? 'primary' : undefined"
					:variant="payload.member ? 'flat' : 'tonal'"
					size="x-large"
					class="member-sheet__skip"
					data-testid="member-sheet-skip"
					@click="skip"
				>
					{{ payload.member ? __("Continue to payment") : __("Not a member - pay") }}
				</v-btn>
			</footer>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { serverMessage, useMemberStore, type MemberSummary } from "../../../stores/memberStore";
import { formatMoney } from "../../../utils/memberDeals";
import { normalizeThaiPhone, parseBirthday } from "../../../utils/memberInput";

declare const __: (_text: string, _args?: any[]) => string;

const memberStore = useMemberStore();
const { sheet } = storeToRefs(memberStore);

const payload = computed(() => sheet.value.payload);
const isPay = computed(() => sheet.value.mode === "pay");
const money = (value: number) => formatMoney(value, payload.value?.currency || "THB");

const phone = ref("");
const name = ref("");
const birthdayText = ref("");
const consent = ref(false);
const found = ref<MemberSummary | null>(null);
const notFound = ref(false);
const searching = ref(false);
const saving = ref(false);
const error = ref("");
const phoneField = ref<any>(null);
const nameField = ref<any>(null);

const normalized = computed(() => normalizeThaiPhone(phone.value));
const birthdayIso = computed(() => parseBirthday(birthdayText.value));
const birthdayInvalid = computed(() => Boolean(birthdayText.value.trim()) && !birthdayIso.value);

const reset = () => {
	phone.value = "";
	name.value = "";
	birthdayText.value = "";
	consent.value = false;
	found.value = null;
	notFound.value = false;
	searching.value = false;
	saving.value = false;
	error.value = "";
};

let searchTimer: ReturnType<typeof setTimeout> | null = null;
let searchToken = 0;

watch(normalized, (value) => {
	found.value = null;
	notFound.value = false;
	error.value = "";
	if (searchTimer) clearTimeout(searchTimer);
	if (!value || !payload.value) return;
	const token = ++searchToken;
	searchTimer = setTimeout(async () => {
		searching.value = true;
		try {
			const result = await memberStore.findMember(value, payload.value!.company);
			if (token !== searchToken) return;
			found.value = result;
			notFound.value = !result;
		} catch {
			if (token === searchToken) error.value = __("Could not look up the member. Check the connection.");
		} finally {
			if (token === searchToken) searching.value = false;
		}
	}, 200);
});

watch(
	() => sheet.value.open,
	async (open) => {
		if (!open) return;
		reset();
		await nextTick();
		phoneField.value?.focus?.();
	},
);

watch(notFound, async (value) => {
	if (!value) return;
	await nextTick();
	nameField.value?.focus?.();
});

const finish = (proceed: boolean, member?: { customer: string; customer_name: string }) => {
	memberStore.closeSheet({
		proceed,
		customer: member?.customer,
		customer_name: member?.customer_name,
		mobile_no: normalized.value || undefined,
	});
};

const chooseFound = () => {
	if (found.value) finish(true, found.value);
};

const submitSignup = async () => {
	if (!notFound.value || saving.value || !name.value.trim() || birthdayInvalid.value || !normalized.value) return;
	saving.value = true;
	error.value = "";
	try {
		const member = await memberStore.signup({
			customer_name: name.value.trim(),
			mobile_no: normalized.value,
			company: payload.value!.company,
			birthday: birthdayIso.value,
			consent: consent.value,
		});
		finish(true, member);
	} catch (failure) {
		error.value = serverMessage(failure, __("Could not sign up. Try again."));
	} finally {
		saving.value = false;
	}
};

const skip = () => finish(true);
const back = () => finish(false);

const onPhoneEnter = () => {
	if (found.value) return chooseFound();
	if (notFound.value) return nameField.value?.focus?.();
	// Nothing typed: the customer is not a member, so Enter simply carries on to payment.
	if (!phone.value.trim() && isPay.value) return skip();
};

onBeforeUnmount(() => {
	if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.member-sheet {
	padding: 24px 28px 28px;
	display: grid;
	gap: 16px;
}

.member-sheet__head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12px;
}

.member-sheet__head h2 {
	font-size: 1.8rem;
	margin: 0;
}

.member-sheet__total {
	font-size: 2rem;
	font-variant-numeric: tabular-nums;
}

.member-sheet__pitch {
	margin: 0;
	padding: 12px 16px;
	border-radius: 12px;
	background: #e8f5e9;
	color: #1b5e20;
	font-size: 1.2rem;
	font-weight: 600;
	display: flex;
	flex-wrap: wrap;
	gap: 4px 8px;
}

.member-sheet__phone :deep(input) {
	font-size: 1.6rem;
	letter-spacing: 0.04em;
}

.member-sheet__card {
	display: grid;
	gap: 12px;
	padding: 16px;
	border-radius: 12px;
	border: 1px solid rgba(0, 0, 0, 0.12);
}

.member-sheet__name {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 1.3rem;
	font-weight: 700;
}

.member-sheet__facts {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 16px;
	font-size: 1.1rem;
}

.member-sheet__birthday {
	font-weight: 700;
	color: #b45309;
}

.member-sheet__debt {
	font-weight: 700;
	color: #b91c1c;
}

.member-sheet__error {
	margin: 0;
	color: #b91c1c;
	font-weight: 600;
}

.member-sheet__hints {
	margin: 0;
	padding: 12px 16px;
	list-style: none;
	display: grid;
	gap: 8px;
	border-radius: 12px;
	background: #fff8e1;
	color: #6b4400;
	font-size: 1.1rem;
}

.member-sheet__hints li {
	display: flex;
	align-items: center;
	gap: 8px;
}

.member-sheet__actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.member-sheet__skip {
	flex: 1 1 auto;
	min-height: 64px;
	font-size: 1.3rem;
}
</style>
