<script setup lang="ts">
import { useDialogRoute } from '@/composables/use-dialog-route';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useSave } from './use-save';

const { t } = useI18n();

const router = useRouter();

const isOpen = useDialogRoute();

const name = ref<string | null>(null);

const { saving, save } = useSave({ name });
</script>

<template>
	<v-dialog :model-value="isOpen" persistent @esc="router.push('/settings/roles')" @apply="save">
		<v-card>
			<v-card-title>
				{{ t('create_role') }}
			</v-card-title>
			<v-card-text>
				<div class="form-grid">
					<div class="field full">
						<v-input v-model="name" autofocus :placeholder="t('role_name') + '...'" :max-length="100" />
					</div>
				</div>
			</v-card-text>
			<v-card-actions>
				<v-button to="/settings/roles" secondary>{{ t('cancel') }}</v-button>
				<v-button :disabled="name === null" :loading="saving" @click="save">{{ t('save') }}</v-button>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<style lang="scss" scoped>
.form-grid {
	--theme--form--column-gap: 12px;
	--theme--form--row-gap: 24px;

	.type-label {
		font-size: 1rem;
	}
}
</style>
