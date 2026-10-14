<template>
	<v-snackbar
		:model-value="!!notice.last"
		:timeout="-1"
		location="bottom start"
		color="error"
		:z-index="2400"
		data-testid="scan-notice-snackbar"
		@update:model-value="onUpdate"
	>
		<div data-testid="scan-notice-message">{{ notice.last?.message }}</div>
		<div v-if="notice.last?.code" class="font-weight-bold" data-testid="scan-notice-code">
			{{ notice.last.code }}
		</div>
	</v-snackbar>
</template>

<script setup lang="ts">
import { useScanNoticeStore } from "../../../stores/scanNoticeStore";

const notice = useScanNoticeStore();

const onUpdate = (open: boolean) => {
	if (!open) notice.clear();
};
</script>
