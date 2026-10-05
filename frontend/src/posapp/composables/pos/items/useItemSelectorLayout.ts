import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import _ from "lodash";
import {
	getCardColumns,
	getCardGap,
	getCardPadding,
} from "../../../utils/itemSelectorLayout.js";

type SelectorLayoutOptions = {
	resizeDebounce?: number;
	loadVisibleItems?: () => void;
};

/**
 * Manages the layout metrics and resize behavior for the ItemsSelector component.
 * Handles calculation of grid columns, card dimensions, and overflow detection.
 */
export function useItemSelectorLayout(options: SelectorLayoutOptions = {}) {
	const {
		resizeDebounce = 100,
		loadVisibleItems, // Method to load more items on scroll (pagination)
	} = options;

	// State
	const windowWidth = ref(window.innerWidth);
	const isOverflowing = ref(false);
	const itemsContainerRef = ref<any>(null);
	const scrollThrottle = ref<number | null>(null);

	// Computed Metrics
	// Measured width of the tile area. Tiles are sized from this, not from the window, because the item
	// panel is only part of the screen and a window-based column count cuts tiles off.
	const measuredWidth = ref(0);
	const MIN_TILE_WIDTH = 150;
	const cardColumns = computed(() => {
		if (!measuredWidth.value) return getCardColumns(windowWidth.value);
		const pad = getCardPadding(windowWidth.value) * 2;
		const gap = getCardGap(windowWidth.value);
		return Math.max(
			1,
			Math.floor((measuredWidth.value - pad + gap) / (MIN_TILE_WIDTH + gap)),
		);
	});
	const cardGap = computed(() => getCardGap(windowWidth.value));
	const cardPadding = computed(() => getCardPadding(windowWidth.value));

	// Compact tiles (no photo): name, price and stock only.
	const cardRowHeight = computed(() => 112);

	const cardSlotHeight = computed(() => cardRowHeight.value + cardGap.value);
	const cardSlotWidth = computed(() => cardColumnWidth.value + cardGap.value);

	const cardContainerWidth = computed(() => {
		// If we have a reference to the container, try to get its width
		// Otherwise fallback to an estimated width based on window
		if (measuredWidth.value) {
			return measuredWidth.value;
		}
		// Fallback estimation (e.g. 5 columns of regular grid)
		// This is just a safe default until mounted
		return windowWidth.value * 0.4; // Approx 40% of screen for items selector usually
	});

	const cardColumnWidth = computed(() => {
		const columns = Math.max(1, cardColumns.value);
		// Note: We might need a more robust way to get container width if it's dynamic
		// Ideally pass a ref to the container element
		const containerWidth = cardContainerWidth.value || 0;
		if (!containerWidth) {
			return 240; // Safe default
		}

		const gapTotal = cardGap.value * (columns - 1);
		const paddingTotal = cardPadding.value * 2;
		const available = Math.max(0, containerWidth - gapTotal - paddingTotal);
		const width = Math.floor(available / columns);
		return Math.max(MIN_TILE_WIDTH, width);
	});

	// Actions
	const updateWindowWidth = () => {
		windowWidth.value = window.innerWidth;
		measureContainer();
	};

	const scheduleCardMetricsUpdate = _.debounce(() => {
		updateWindowWidth();
		// Force re-evaluation of container width if needed by accessing ref
		if (itemsContainerRef.value) {
			// Trigger reactivity if needed, though windowWidth usually drives computed props
		}
		checkItemContainerOverflow();
	}, resizeDebounce);

	const measureContainer = () => {
		const el = getItemsContainerElement();
		if (el && el.clientWidth) measuredWidth.value = el.clientWidth;
	};

	const getItemsContainerElement = (): HTMLElement | null => {
		if (!itemsContainerRef.value) return null;
		// Handle both Vue component ref and raw element
		return (itemsContainerRef.value.$el ||
			itemsContainerRef.value) as HTMLElement | null;
	};

	const checkItemContainerOverflow = () => {
		const el = getItemsContainerElement();
		if (!el) {
			isOverflowing.value = false;
			return;
		}

		const containerHeight = parseFloat(
			getComputedStyle(el).getPropertyValue("--container-height"),
		);
		if (isNaN(containerHeight)) {
			isOverflowing.value = false;
			return;
		}

		const stickyHeader = el
			.closest(".dynamic-padding")
			?.querySelector(".sticky-header") as HTMLElement | null;
		const headerHeight = stickyHeader ? stickyHeader.offsetHeight : 0;
		const availableHeight = containerHeight - headerHeight;

		// Only apply if calculated height is valid
		if (availableHeight > 0) {
			el.style.maxHeight = `${availableHeight}px`;
			isOverflowing.value = el.scrollHeight > availableHeight;
		}

		// Also schedule metrics update as this might affect layout
		// But be careful of infinite loops; separate updateWindowWidth logic if needed
	};

	const onListScroll = (event: Event) => {
		if (scrollThrottle.value) return;

		scrollThrottle.value = requestAnimationFrame(() => {
			try {
				const el = event.target as HTMLElement | null;
				if (!el) return;
				if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
					// Trigger pagination via callback
					if (typeof loadVisibleItems === "function") {
						// We need access to currentPage logic, but usually loadVisibleItems handles the "next/more" logic
						loadVisibleItems();
					}
				}
			} catch (error: unknown) {
				console.error("Error in list scroll handler:", error);
			} finally {
				scrollThrottle.value = null;
			}
		});
	};

	// Lifecycle
	let containerObserver: ResizeObserver | null = null;
	onMounted(() => {
		window.addEventListener("resize", scheduleCardMetricsUpdate);
		nextTick(() => {
			updateWindowWidth();
			checkItemContainerOverflow();
			const el = getItemsContainerElement();
			if (el && typeof ResizeObserver !== "undefined") {
				containerObserver = new ResizeObserver(() => measureContainer());
				containerObserver.observe(el);
			}
		});
	});

	onUnmounted(() => {
		window.removeEventListener("resize", scheduleCardMetricsUpdate);
		containerObserver?.disconnect();
		if (scrollThrottle.value) {
			cancelAnimationFrame(scrollThrottle.value);
		}
		scheduleCardMetricsUpdate.cancel();
	});

	return {
		// Refs
		windowWidth,
		isOverflowing,
		itemsContainerRef, // Bind this to the container in template

		// Computed
		cardColumns,
		cardGap,
		cardPadding,
		cardRowHeight,
		cardSlotHeight,
		cardSlotWidth,
		cardColumnWidth,

		// Methods
		checkItemContainerOverflow,
		scheduleCardMetricsUpdate,
		onListScroll,
	};
}
