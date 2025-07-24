<template>
	<div class="voice-chat-page">
		<div class="header">
			<h1>ボイスチャット</h1>
		</div>

		<div v-if="!activeRoom" class="room-controls">
			<div class="create-room">
				<h2>ルームを作成</h2>
				<MkInput v-model="roomTitle" placeholder="ルーム名を入力">
					<template #label>ルーム名</template>
				</MkInput>
				<MkButton primary @click="createRoom" :loading="creating">
					<i class="ti ti-plus"></i>
					ルームを作成
				</MkButton>
			</div>

			<div class="room-list" v-if="availableRooms.length > 0">
				<h2>参加可能なルーム</h2>
				<div class="rooms">
					<div
						v-for="room in availableRooms"
						:key="room.id"
						class="room-item"
						@click="joinRoom(room.id)"
					>
						<div class="room-info">
							<h3>{{ room.title }}</h3>
							<p>ホスト: {{ room.hostName }}</p>
							<p>参加者: {{ room.participantCount }}名</p>
						</div>
						<MkButton>
							<i class="ti ti-login"></i>
							参加
						</MkButton>
					</div>
				</div>
			</div>
		</div>

		<MkVoiceChat
			v-if="activeRoom"
			:room-id="activeRoom.id"
			:room-title="activeRoom.title"
			@left="leaveRoom"
		/>
	</div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import MkVoiceChat from '@/components/MkVoiceChat.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { definePageMetadata } from '@/page.js';

const roomTitle = ref('');
const creating = ref(false);
const activeRoom = ref<{ id: string; title: string } | null>(null);
const availableRooms = ref<Array<{
	id: string;
	title: string;
	hostName: string;
	participantCount: number;
}>>([]);

// ルームを作成
const createRoom = async () => {
	if (!roomTitle.value.trim()) {
		os.alert({
			type: 'error',
			text: 'ルーム名を入力してください',
		});
		return;
	}

	creating.value = true;
	try {
		const room = await misskeyApi('voice-chat/create', {
			title: roomTitle.value.trim(),
		});

		activeRoom.value = {
			id: room.id,
			title: room.title,
		};

		roomTitle.value = '';
	} catch (error) {
		console.error('Failed to create room:', error);
		os.alert({
			type: 'error',
			text: 'ルームの作成に失敗しました',
		});
	} finally {
		creating.value = false;
	}
};

// ルームに参加
const joinRoom = async (roomId: string) => {
	const room = availableRooms.value.find(r => r.id === roomId);
	if (!room) return;

	try {
		await misskeyApi('voice-chat/join', {
			roomId: roomId,
		});

		activeRoom.value = {
			id: room.id,
			title: room.title,
		};
	} catch (error) {
		console.error('Failed to join room:', error);
		os.alert({
			type: 'error',
			text: 'ルームへの参加に失敗しました',
		});
	}
};

// ルームを離脱
const leaveRoom = () => {
	activeRoom.value = null;
	loadAvailableRooms();
};

// 利用可能なルーム一覧を読み込み
const loadAvailableRooms = async () => {
	try {
		// 実際の実装では、利用可能なルーム一覧を取得するAPIが必要
		// ここではダミーデータを使用
		availableRooms.value = [];
	} catch (error) {
		console.error('Failed to load rooms:', error);
	}
};

onMounted(() => {
	loadAvailableRooms();
});

definePageMetadata({
	title: 'ボイスチャット',
	icon: 'ti ti-phone',
});
</script>

<style lang="scss" scoped>
.voice-chat-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.header {
	padding: 16px;
	background: var(--panel);
	border-bottom: solid 1px var(--divider);

	h1 {
		margin: 0;
		color: var(--accent);
	}
}

.room-controls {
	flex: 1;
	padding: 16px;
	overflow-y: auto;
}

.create-room {
	background: var(--panel);
	padding: 24px;
	border-radius: 12px;
	margin-bottom: 24px;

	h2 {
		margin: 0 0 16px 0;
		color: var(--accent);
	}

	.MkInput {
		margin-bottom: 16px;
	}
}

.room-list {
	background: var(--panel);
	padding: 24px;
	border-radius: 12px;

	h2 {
		margin: 0 0 16px 0;
		color: var(--accent);
	}
}

.rooms {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.room-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16px;
	background: var(--bg);
	border-radius: 8px;
	cursor: pointer;
	transition: background-color 0.2s;

	&:hover {
		background: var(--buttonHoverBg);
	}

	.room-info {
		h3 {
			margin: 0 0 4px 0;
			font-size: 16px;
			color: var(--fg);
		}

		p {
			margin: 2px 0;
			font-size: 14px;
			color: var(--fgTransparentWeak);
		}
	}
}
</style>
