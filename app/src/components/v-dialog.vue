<script setup lang="ts">
import { ref, computed, useTemplateRef, watch, nextTick } from 'vue';
import { useShortcut } from '@/composables/use-shortcut';
import { useDialogRouteLeave } from '@/composables/use-dialog-route';
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap';

export type ApplyShortcut = 'meta+enter' | 'meta+s';

interface Props {
	modelValue?: boolean;
	persistent?: boolean;
	placement?: 'right' | 'center';
	/** Lets other overlays (drawer) open on top */
	keepBehind?: boolean;
	applyShortcut?: ApplyShortcut;
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: undefined,
	persistent: false,
	placement: 'center',
	applyShortcut: 'meta+enter',
});

const emit = defineEmits(['esc', 'apply', 'update:modelValue']);

useShortcut('escape', (_event, cancelNext) => {
	if (internalActive.value) {
		emit('esc');
		cancelNext();
	}
});

useShortcut(props.applyShortcut, (_event, cancelNext) => {
	if (internalActive.value) {
		emit('apply');
		cancelNext();
	}
});

useShortcut('meta+s', (_event, cancelNext) => {
	if (props.applyShortcut === 'meta+s') return;
	if (internalActive.value) cancelNext();
});

const localActive = ref(false);

const className = ref<string | null>(null);

const internalActive = computed({
	get() {
		return props.modelValue !== undefined ? props.modelValue : localActive.value;
	},
	set(newActive: boolean) {
		localActive.value = newActive;
		emit('update:modelValue', newActive);
	},
});

const leave = useDialogRouteLeave();

useOverlayFocusTrap();

function emitToggle() {
	if (props.persistent === false) {
		emit('update:modelValue', !props.modelValue);
	} else {
		nudge();
	}
}

function nudge() {
	className.value = 'nudge';

	setTimeout(() => {
		className.value = null;
	}, 200);
}

function useOverlayFocusTrap() {
	const overlayEl = useTemplateRef<HTMLDivElement>('overlayEl');

	const { activate, deactivate } = useFocusTrap(overlayEl, {
		escapeDeactivates: false,
		initialFocus: false,
	});

	watch(
		internalActive,
		async (newActive) => {
			await nextTick();

			if (newActive) activate();
			else deactivate();
		},
		{ immediate: true },
	);
}
</script>

<template>
	<div class="v-dialog">
		<slot name="activator" v-bind="{ on: () => (internalActive = true) }" />

		<teleport to="#dialog-outlet">
			<transition-dialog @after-leave="leave">
				<component
					:is="placement === 'right' ? 'div' : 'span'"
					v-if="internalActive"
					ref="overlayEl"
					class="container"
					:class="[className, placement, keepBehind ? 'keep-behind' : null]"
				>
					<v-overlay active absolute @click="emitToggle" />
					<slot />
				</component>
			</transition-dialog>
		</teleport>
	</div>
</template>

<style lang="scss" scoped>
.v-dialog {
	--v-dialog-z-index: 100;

	display: contents;
}

.container {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 500;
	display: flex;
	width: 100%;
	height: 100%;

	&.keep-behind {
		z-index: 490;
	}
}

.container > :slotted(*) {
	z-index: 2;
	box-shadow: 0px 4px 12px rgb(38 50 56 / 0.1);
}

.container.center {
	align-items: center;
	justify-content: center;
	z-index: 600;

	&.keep-behind {
		z-index: 490;
	}
}

.container.center.nudge > :slotted(*:not(:first-child)) {
	animation: nudge 200ms;
}

.container.right {
	align-items: center;
	justify-content: flex-end;
}

.container.right.nudge > :slotted(*:not(:first-child)) {
	transform-origin: right;
	animation: shake 200ms;
}

.container :slotted(.v-card) {
	--v-card-min-width: calc(100vw - 40px);
	--v-card-padding: 28px;
	--v-card-background-color: var(--theme--background);
}

.container :slotted(.v-card) .v-card-title {
	padding-bottom: 8px;
}

.container :slotted(.v-card) .v-card-actions {
	flex-direction: column-reverse;
	flex-wrap: wrap;
}

.container :slotted(.v-card) .v-card-actions .v-button {
	width: 100%;
}

.container :slotted(.v-card) .v-card-actions .v-button .button {
	width: 100%;
}

.container :slotted(.v-card) .v-card-actions > .v-button + .v-button {
	margin-bottom: 20px;
	margin-left: 0;
}

.container :slotted(.v-sheet) {
	--v-sheet-padding: 24px;
	--v-sheet-max-width: 560px;
}

.container .v-overlay {
	--v-overlay-z-index: 1;
}

@media (min-width: 600px) {
	.container :slotted(.v-card) {
		--v-card-min-width: 540px;
	}

	.container :slotted(.v-card) .v-card-actions {
		flex-direction: inherit;
		flex-wrap: nowrap;
	}

	.container :slotted(.v-card) .v-card-actions .v-button {
		width: auto;
	}

	.container :slotted(.v-card) .v-card-actions .v-button .button {
		width: auto;
	}

	.container :slotted(.v-card) .v-card-actions > .v-button + .v-button {
		margin-bottom: 0;
		margin-left: 12px;
	}
}

@keyframes nudge {
	0% {
		transform: scale(1);
	}

	50% {
		transform: scale(1.02);
	}

	100% {
		transform: scale(1);
	}
}

@keyframes shake {
	0% {
		transform: scaleX(1);
	}

	50% {
		transform: scaleX(0.98);
	}

	100% {
		transform: scaleX(1);
	}
}
</style>
