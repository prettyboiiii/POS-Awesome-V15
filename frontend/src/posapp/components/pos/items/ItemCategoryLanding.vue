<template>
	<div class="category-landing" data-testid="category-landing">
		<section v-if="favourites.length" class="landing-section">
			<h3 class="landing-heading">
				<v-icon size="small" color="amber-darken-2">mdi-star</v-icon>
				{{ __("Frequently used") }}
			</h3>
			<div class="favourite-grid">
				<slot v-for="item in favourites" :key="item.item_code" name="favourite" :item="item" />
			</div>
		</section>
		<section class="landing-section">
			<h3 class="landing-heading">{{ __("Categories") }}</h3>
			<div class="category-grid">
				<button
					v-for="tile in tiles"
					:key="tile.name"
					type="button"
					class="category-tile"
					data-testid="category-tile"
					:style="{ '--group-color': tile.color }"
					@click="emit('select-group', tile.name)"
				>
					<span class="category-tile__stripe" aria-hidden="true"></span>
					<img
						v-if="tile.image"
						class="category-tile__image"
						:src="tile.image"
						alt=""
						loading="lazy"
						@error="$event.target.style.display = 'none'"
					/>
					<span class="category-tile__text">
						<span class="category-tile__name">{{ tile.name }}</span>
						<span class="category-tile__count">{{ __("{0} items", [tile.count]) }}</span>
					</span>
				</button>
			</div>
		</section>
	</div>
</template>

<script setup>
import { computed } from "vue";
import { groupColorFor } from "../../../utils/groupColor";

const __ = window.__;

const props = defineProps({
	items: { type: Array, default: () => [] },
	groups: { type: Array, default: () => [] },
	picks: { type: Object, default: () => ({}) },
	favouriteLimit: { type: Number, default: 12 },
});

const emit = defineEmits(["select-group"]);

// One pass over the catalog: item count per group, and the group's hint picture (the most hand-picked
// item that has a photo, else the first item with a photo).
const groupInfo = computed(() => {
	const info = new Map();
	for (const item of props.items) {
		const group = item?.item_group;
		if (!group) continue;
		let entry = info.get(group);
		if (!entry) {
			entry = { count: 0, image: "", score: -1 };
			info.set(group, entry);
		}
		entry.count += 1;
		if (item.image) {
			const score = props.picks[item.item_code] || 0;
			if (score > entry.score) {
				entry.image = item.image;
				entry.score = score;
			}
		}
	}
	return info;
});

// Same fixed order as the chip row (Thai collation) so tiles and chips line up.
const tiles = computed(() =>
	[...new Set(props.groups.filter((group) => group && group !== "ALL"))]
		.sort((a, b) => a.localeCompare(b, "th"))
		.map((name) => {
			const entry = groupInfo.value.get(name);
			return { name, count: entry?.count || 0, image: entry?.image || "", color: groupColorFor(name) };
		})
		.filter((tile) => tile.count > 0 || props.items.length === 0),
);

const favourites = computed(() => {
	const codes = Object.entries(props.picks)
		.filter(([, picks]) => picks > 0)
		.sort((a, b) => b[1] - a[1])
		.map(([code]) => code);
	if (!codes.length) return [];
	const wanted = new Set(codes);
	const found = new Map();
	for (const item of props.items) {
		if (wanted.has(item?.item_code)) found.set(item.item_code, item);
	}
	return codes
		.map((code) => found.get(code))
		.filter(Boolean)
		.slice(0, props.favouriteLimit);
});
</script>

<style scoped>
.category-landing {
	height: 100%;
	overflow-y: auto;
	padding: 8px 4px 16px;
}

.landing-heading {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 4px 0 8px;
	font-size: 1.05rem;
	font-weight: 700;
	color: var(--pos-text-primary);
}

.landing-section + .landing-section {
	margin-top: 16px;
}

.favourite-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.favourite-grid :deep(.card-item-card) {
	width: 160px;
	height: 112px;
}

.category-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	gap: 8px;
}

.category-tile {
	position: relative;
	display: flex;
	align-items: center;
	gap: 8px;
	min-height: 96px;
	padding: 0 8px 0 0;
	border: 1px solid var(--pos-border, rgba(0, 0, 0, 0.12));
	border-radius: var(--pos-radius-md, 12px);
	background: var(--pos-surface, #fff);
	color: var(--pos-text-primary);
	text-align: start;
	cursor: pointer;
	overflow: hidden;
}

.category-tile:hover,
.category-tile:focus-visible {
	border-color: var(--group-color);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--group-color) 25%, transparent);
	outline: none;
}

.category-tile__stripe {
	align-self: stretch;
	flex: 0 0 8px;
	background: var(--group-color);
}

.category-tile__image {
	flex: 0 0 56px;
	width: 56px;
	height: 56px;
	object-fit: contain;
	border-radius: 8px;
}

.category-tile__text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	gap: 2px;
}

.category-tile__name {
	font-size: 1.05rem;
	font-weight: 650;
	line-height: 1.3;
	overflow-wrap: anywhere;
}

.category-tile__count {
	font-size: 0.85rem;
	color: var(--pos-text-secondary, #5c6670);
}
</style>
