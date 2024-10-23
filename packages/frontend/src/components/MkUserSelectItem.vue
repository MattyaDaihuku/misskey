<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkSelect v-model="userSelector" :class="$style.selector">
	<template #label>{{ i18n.ts.selectUser }}</template>
	<option value="all">{{ i18n.ts.selectUser }}</option>
	<option value="recent">
		<div v-if="username == '' && host == ''" :class="$style.recent">
			<div :class="$style.users">
				<div v-for="user in recentUsers" :key="user.id" class="_button" :class="[$style.user, { [$style.selected]: selected && selected.id === user.id }]" @click="selected = user" @dblclick="ok()">
					<MkAvatar :user="user" :class="$style.avatar" indicator/>
					<div :class="$style.userBody">
						<MkUserName :user="user" :class="$style.userName"/>
						<MkAcct :user="user" :class="$style.userAcct"/>
					</div>
				</div>
			</div>
		</div>
	</option>
</MkSelect>
</template>

<script lang="ts" setup>
import { onMounted, ref, shallowRef, computed } from 'vue';
import * as Misskey from 'misskey-js';
import MkSelect from '@/components/MkSelect.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { defaultStore } from '@/store.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/account.js';

const emit = defineEmits<{
	(ev: 'ok', selected: Misskey.entities.UserDetailed): void;
	(ev: 'cancel'): void;
	(ev: 'closed'): void;
}>();

const props = withDefaults(defineProps<{
	includeSelf?: boolean;
	localOnly?: boolean;
}>(), {
	includeSelf: false,
	localOnly: false,
});

const username = ref('');
const host = ref('');
const recentUsers = ref<Misskey.entities.UserDetailed[]>([]);
const selected = ref<Misskey.entities.UserLite | null>(null);
const dialogEl = shallowRef<InstanceType<typeof MkModalWindow>>();
const userSelector = computed(defaultStore.makeGetterSetter('userSelector'));

async function ok() {
	if (selected.value == null) return;

	const user = await misskeyApi('users/show', {
		userId: selected.value.id,
	});
	emit('ok', user);

	dialogEl.value?.close();

	// 最近使ったユーザー更新
	let recents = defaultStore.state.recentlyUsedUsers;
	recents = recents.filter(x => x !== selected.value?.id);
	recents.unshift(selected.value.id);
	defaultStore.set('recentlyUsedUsers', recents.splice(0, 16));
}

onMounted(() => {
	misskeyApi('users/show', {
		userIds: defaultStore.state.recentlyUsedUsers,
	}).then(foundUsers => {
		let _users = foundUsers;
		_users = _users.filter((u) => {
			if (props.localOnly) {
				return u.host == null;
			} else {
				return true;
			}
		});
		_users = _users.filter((u) => {
			if (props.includeSelf) {
				return true;
			} else {
				return u.id !== $i?.id;
			}
		});
		recentUsers.value = _users;
	});
});
</script>

<style lang="scss" module>
.result,
.recent {
	display: flex;
	flex-direction: column;
	overflow: auto;
	height: 100%;

	&.result.hit {
		padding: 0;
	}

	&.recent {
		padding: 0;
	}
}

.users {
	flex: 1;
	overflow: auto;
	padding: 8px 0;
}

.user {
	display: flex;
	align-items: center;
	padding: 8px var(--root-margin);
	font-size: 14px;

	&:hover {
		background: var(--MI_THEME-X7);
	}

	&.selected {
		background: var(--MI_THEME-accent);
		color: #fff;
	}
}

.userBody {
	padding: 0 8px;
	min-width: 0;
}

.avatar {
	width: 45px;
	height: 45px;
}

.userName {
	display: block;
	font-weight: bold;
}

.userAcct {
	opacity: 0.5;
}

.empty {
	opacity: 0.7;
	text-align: center;
	padding: 16px;
}

.selector {
	margin-bottom: var(--MI-margin);
}
</style>

