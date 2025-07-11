<script setup lang="ts">
import api from '@/api';
import { useEditsGuard } from '@/composables/use-edits-guard';
import { useItem } from '@/composables/use-item';
import { useShortcut } from '@/composables/use-shortcut';
import { getAssetUrl } from '@/utils/get-asset-url';
import { notify } from '@/utils/notify';
import { unexpectedError } from '@/utils/unexpected-error';
import CommentsSidebarDetail from '@/views/private/components/comments-sidebar-detail.vue';
import FilePreviewReplace from '@/views/private/components/file-preview-replace.vue';
import FilesNavigation from '@/views/private/components/files-navigation.vue';
import FolderPicker from '@/views/private/components/folder-picker.vue';
import ImageEditor from '@/views/private/components/image-editor.vue';
import RevisionsDrawerDetail from '@/views/private/components/revisions-drawer-detail.vue';
import SaveOptions from '@/views/private/components/save-options.vue';
import type { Field, File } from '@directus/types';
import { computed, ref, toRefs, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import FileInfoSidebarDetail from '../components/file-info-sidebar-detail.vue';
import FilesNotFound from './not-found.vue';

const props = defineProps<{
	primaryKey: string;
}>();

const { t } = useI18n();

const router = useRouter();

const form = ref<HTMLElement>();
const { primaryKey } = toRefs(props);
const { breadcrumb } = useBreadcrumb();

const revisionsDrawerDetailRef = ref<InstanceType<typeof RevisionsDrawerDetail> | null>(null);

const {
	isNew,
	edits,
	hasEdits,
	item,
	permissions,
	saving,
	loading,
	save,
	remove,
	deleting,
	saveAsCopy,
	refresh,
	validationErrors,
} = useItem<File>(ref('directus_files'), primaryKey);

const {
	collectionPermissions: { createAllowed, revisionsAllowed },
	itemPermissions: { updateAllowed, deleteAllowed, saveAllowed, fields },
} = permissions;

const isSavable = computed(() => saveAllowed.value && hasEdits.value);

const { confirmLeave, leaveTo } = useEditsGuard(hasEdits);

const confirmDelete = ref(false);
const editActive = ref(false);

// These are the fields that will be prevented from showing up in the form because they'll be shown in the sidebar
const fieldsDenyList: string[] = [
	'type',
	'width',
	'height',
	'filesize',
	'created_on',
	'uploaded_by',
	'uploaded_on',
	'modified_by',
	'modified_on',
	'duration',
	'folder',
	'charset',
	'embed',
];

const to = computed(() => {
	if (item.value && item.value?.folder) return `/files/folders/${item.value.folder}`;
	else return '/files';
});

const { moveToDialogActive, moveToFolder, moving, selectedFolder } = useMovetoFolder();

useShortcut('meta+s', saveAndStay, form);

const fieldsFiltered = computed(() => {
	return fields.value.filter((field: Field) => fieldsDenyList.includes(field.field) === false);
});

function navigateBack() {
	const backState = router.options.history.state.back;

	if (typeof backState !== 'string' || !backState.startsWith('/login')) {
		router.back();
		return;
	}

	if (item?.value?.folder) {
		router.push(`/files/folders/${item.value.folder}`);
	} else {
		router.push('/files');
	}
}

function useBreadcrumb() {
	const breadcrumb = computed(() => {
		if (!item?.value?.folder) {
			return [
				{
					name: t('file_library'),
					to: '/files',
				},
			];
		}

		return [
			{
				name: t('file_library'),
				to: { path: `/files/folders/${item.value.folder}` },
			},
		];
	});

	return { breadcrumb };
}

async function saveAndQuit() {
	try {
		await save();
		router.push(to.value);
	} catch {
		// `save` will show unexpected error dialog
	}
}

async function saveAndStay() {
	try {
		await save();
		revisionsDrawerDetailRef.value?.refresh?.();
		refresh();
	} catch {
		// `save` will show unexpected error dialog
	}
}

async function saveAsCopyAndNavigate() {
	const newPrimaryKey = await saveAsCopy();
	if (newPrimaryKey) router.push(`/files/${newPrimaryKey}`);
}

async function deleteAndQuit() {
	if (deleting.value) return;

	try {
		await remove();
		edits.value = {};
		router.replace(to.value);
	} catch {
		// `remove` will show the unexpected error dialog
		confirmDelete.value = false;
	}
}

function discardAndLeave() {
	if (!leaveTo.value) return;
	edits.value = {};
	confirmLeave.value = false;
	router.push(leaveTo.value);
}

function discardAndStay() {
	edits.value = {};
	confirmLeave.value = false;
}

function useMovetoFolder() {
	const moveToDialogActive = ref(false);
	const moving = ref(false);
	const selectedFolder = ref<string | null>(null);

	watch(item, () => {
		selectedFolder.value = item.value?.folder || null;
	});

	return { moveToDialogActive, moving, moveToFolder, selectedFolder };

	async function moveToFolder() {
		if (moving.value) return;

		moving.value = true;

		try {
			const response = await api.patch(
				`/files/${props.primaryKey}`,
				{
					folder: selectedFolder.value,
				},
				{
					params: {
						fields: 'folder.name',
					},
				},
			);

			refresh();
			const folder = response.data.data.folder?.name || t('file_library');

			notify({
				title: t('file_moved', { folder }),
				icon: 'folder_move',
			});
		} catch (error) {
			unexpectedError(error);
		} finally {
			moveToDialogActive.value = false;
			moving.value = false;
		}
	}
}

function revert(values: Record<string, any>) {
	edits.value = {
		...edits.value,
		...values,
	};
}
</script>

<template>
	<files-not-found v-if="!loading && !item" />
	<private-view v-else :title="loading || !item ? t('loading') : item.title">
		<template #title-outer:prepend>
			<v-button class="header-icon" rounded icon secondary exact @click="navigateBack">
				<v-icon name="arrow_back" />
			</v-button>
		</template>

		<template #headline>
			<v-breadcrumb :items="breadcrumb" />
		</template>

		<template #actions>
			<v-dialog v-model="confirmDelete" @esc="confirmDelete = false" @apply="deleteAndQuit">
				<template #activator="{ on }">
					<v-button
						v-tooltip.bottom="deleteAllowed ? t('delete_label') : t('not_allowed')"
						rounded
						icon
						class="action-delete"
						secondary
						:disabled="item === null || deleteAllowed === false"
						@click="on"
					>
						<v-icon name="delete" outline />
					</v-button>
				</template>

				<v-card>
					<v-card-title>{{ t('delete_are_you_sure') }}</v-card-title>

					<v-card-actions>
						<v-button secondary @click="confirmDelete = false">
							{{ t('cancel') }}
						</v-button>
						<v-button kind="danger" :loading="deleting" @click="deleteAndQuit">
							{{ t('delete_label') }}
						</v-button>
					</v-card-actions>
				</v-card>
			</v-dialog>

			<v-dialog
				v-if="isNew === false"
				v-model="moveToDialogActive"
				@esc="moveToDialogActive = false"
				@apply="moveToFolder"
			>
				<template #activator="{ on }">
					<v-button
						v-tooltip.bottom="item === null || !updateAllowed ? t('not_allowed') : t('move_to_folder')"
						rounded
						icon
						secondary
						:disabled="item === null || !updateAllowed"
						@click="on"
					>
						<v-icon name="folder_move" />
					</v-button>
				</template>

				<v-card>
					<v-card-title>{{ t('move_to_folder') }}</v-card-title>

					<v-card-text>
						<folder-picker v-model="selectedFolder" />
					</v-card-text>

					<v-card-actions>
						<v-button secondary @click="moveToDialogActive = false">
							{{ t('cancel') }}
						</v-button>
						<v-button :loading="moving" @click="moveToFolder">
							{{ t('move') }}
						</v-button>
					</v-card-actions>
				</v-card>
			</v-dialog>
			<v-button
				v-tooltip.bottom="t('download')"
				secondary
				icon
				rounded
				:download="item?.filename_download"
				:href="getAssetUrl(props.primaryKey, true)"
			>
				<v-icon name="download" />
			</v-button>

			<v-button
				v-if="item?.type?.includes('image') && updateAllowed"
				v-tooltip.bottom="t('edit')"
				rounded
				icon
				secondary
				@click="editActive = true"
			>
				<v-icon name="tune" />
			</v-button>

			<v-button
				v-tooltip.bottom="saveAllowed ? t('save') : t('not_allowed')"
				rounded
				icon
				:loading="saving"
				:disabled="!isSavable"
				@click="saveAndQuit"
			>
				<v-icon name="check" />

				<template #append-outer>
					<save-options
						v-if="isSavable"
						:disabled-options="createAllowed ? ['save-and-add-new'] : ['save-and-add-new', 'save-as-copy']"
						@save-and-stay="saveAndStay"
						@save-as-copy="saveAsCopyAndNavigate"
						@discard-and-stay="discardAndStay"
					/>
				</template>
			</v-button>
		</template>

		<template #navigation>
			<files-navigation :current-folder="item?.folder ?? undefined" />
		</template>

		<div class="file-item">
			<file-preview-replace v-if="item" class="preview" :file="item" @replace="refresh" />

			<image-editor v-if="item?.type?.startsWith('image')" :id="item.id" v-model="editActive" @refresh="refresh" />

			<v-form
				ref="form"
				v-model="edits"
				:fields="fieldsFiltered"
				:loading="loading"
				:initial-values="item"
				:primary-key="primaryKey"
				:disabled="updateAllowed === false"
				:validation-errors="validationErrors"
			/>
		</div>

		<v-dialog v-model="confirmLeave" @esc="confirmLeave = false" @apply="discardAndLeave">
			<v-card>
				<v-card-title>{{ t('unsaved_changes') }}</v-card-title>
				<v-card-text>{{ t('unsaved_changes_copy') }}</v-card-text>
				<v-card-actions>
					<v-button secondary @click="discardAndLeave">
						{{ t('discard_changes') }}
					</v-button>
					<v-button @click="confirmLeave = false">{{ t('keep_editing') }}</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<template #sidebar>
			<file-info-sidebar-detail :file="item" :is-new="isNew" />
			<revisions-drawer-detail
				v-if="isNew === false && revisionsAllowed"
				ref="revisionsDrawerDetailRef"
				collection="directus_files"
				:primary-key="primaryKey"
				@revert="revert"
			/>
			<comments-sidebar-detail v-if="isNew === false" collection="directus_files" :primary-key="primaryKey" />
		</template>
	</private-view>
</template>

<style lang="scss" scoped>
.action-delete {
	--v-button-background-color-hover: var(--theme--danger) !important;
	--v-button-color-hover: var(--white) !important;
}

.header-icon.secondary {
	--v-button-background-color: var(--theme--background-normal);
}

.file-item {
	padding: var(--content-padding);
	padding-block-end: var(--content-padding-bottom);
}

.preview {
	margin-block-end: var(--theme--form--row-gap);
}
</style>
