<script setup lang="ts">
defineProps<{
	color?: string;
	icon?: string;
	title?: string;
	inlineTitle?: boolean;
}>();
</script>

<template>
	<v-divider
		class="presentation-divider"
		:class="{ 'add-margin-block-start': icon || title }"
		:style="{
			'--v-divider-label-color': color,
			'--v-divider-color': 'var(--theme--border-color-subdued)',
		}"
		large
		:inline-title="inlineTitle"
	>
		<template v-if="icon" #icon><v-icon :name="icon" /></template>
		<template v-if="title" #default>{{ title }}</template>
	</v-divider>
</template>

<style lang="scss" scoped>
.add-margin-block-start {
	margin-block-start: 40px;
}
</style>
