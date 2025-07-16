<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.voiceChat">
	<div v-if="!isActive" :class="$style.startButton">
		<MkButton @click="startVoiceChat" primary rounded>
			<i class="ti ti-microphone"></i>
			{{ i18n.ts._voiceChat.startVoiceSpace }}
		</MkButton>
	</div>
	
	<div v-if="isActive" :class="$style.activeChat">
		<div :class="$style.header">
			<div :class="$style.title">
				<i class="ti ti-microphone"></i>
				{{ roomTitle || i18n.ts._voiceChat.voiceSpace }}
			</div>
			<div :class="$style.controls">
				<button 
					:class="[$style.controlButton, { [$style.muted]: isMuted }]" 
					@click="toggleMute"
					:title="isMuted ? i18n.ts._voiceChat.unmute : i18n.ts._voiceChat.mute"
				>
					<i :class="isMuted ? 'ti ti-microphone-off' : 'ti ti-microphone'"></i>
				</button>
				<button 
					:class="$style.controlButton" 
					@click="leaveRoom"
					:title="i18n.ts._voiceChat.leave"
				>
					<i class="ti ti-phone-off"></i>
				</button>
			</div>
		</div>
		
		<div :class="$style.participants">
			<div v-for="participant in participants" :key="participant.id" :class="$style.participant">
				<MkAvatar :user="participant.user" :class="$style.avatar" :size="40"/>
				<div :class="$style.participantInfo">
					<div :class="$style.participantName">{{ participant.user.name || participant.user.username }}</div>
					<div :class="$style.participantStatus">
						<i v-if="participant.isMuted" class="ti ti-microphone-off"></i>
						<i v-else-if="participant.isSpeaking" class="ti ti-volume"></i>
						<i v-else class="ti ti-microphone"></i>
					</div>
				</div>
			</div>
		</div>
		
		<div v-if="isHost" :class="$style.hostControls">
			<MkButton @click="inviteUsers" small>
				<i class="ti ti-user-plus"></i>
				{{ i18n.ts._voiceChat.invite }}
			</MkButton>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkAvatar from '@/components/global/MkAvatar.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useStream } from '@/stream.js';

interface VoiceChatParticipant {
	id: string;
	user: Misskey.entities.User;
	isMuted: boolean;
	isSpeaking: boolean;
}

interface VoiceChatRoom {
	id: string;
	title?: string;
	hostId: string;
	participants: VoiceChatParticipant[];
	cloudflareCallsSessionToken?: string;
}

const isActive = ref(false);
const isHost = ref(false);
const isMuted = ref(false);
const participants = ref<VoiceChatParticipant[]>([]);
const roomId = ref<string | null>(null);
const roomTitle = ref<string>('');
const cloudflareCallsApp = ref<any>(null);

// Cloudflare Calls関連
let localStream: MediaStream | null = null;
let peerConnections: Map<string, RTCPeerConnection> = new Map();

const stream = useStream();

async function startVoiceChat() {
	try {
		// マイクの権限を取得
		localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
		
		// バックエンドに音声チャットルームの作成を要求
		const room = await misskeyApi('voice-chat/create', {
			title: roomTitle.value || undefined,
		});
		
		roomId.value = room.id;
		isActive.value = true;
		isHost.value = true;
		
		// Cloudflare Callsセッションを初期化
		await initializeCloudflareCallsSession(room.cloudflareCallsSessionToken);
		
		// ストリームからの更新を受信
		stream.useChannel('voiceChat', {}, roomId.value);
		stream.on('voiceChat', onVoiceChatUpdate);
		
		// 自分を参加者リストに追加
		participants.value = [{
			id: $i!.id,
			user: $i!,
			isMuted: false,
			isSpeaking: false,
		}];
		
	} catch (error) {
		console.error('音声チャット開始エラー:', error);
		os.alert({
			type: 'error',
			text: i18n.ts._voiceChat.failedToStart,
		});
	}
}

async function initializeCloudflareCallsSession(sessionToken: string) {
	try {
		// Cloudflare Calls SDKの初期化
		// 注意: 実際にはCloudflare Calls SDKをインポートする必要があります
		// const { CallsApplication } = await import('@cloudflare/calls');
		// cloudflareCallsApp.value = new CallsApplication();
		// await cloudflareCallsApp.value.connect(sessionToken);
		
		console.log('Cloudflare Calls session initialized:', sessionToken);
	} catch (error) {
		console.error('Cloudflare Calls初期化エラー:', error);
		throw error;
	}
}

function toggleMute() {
	isMuted.value = !isMuted.value;
	
	if (localStream) {
		localStream.getAudioTracks().forEach(track => {
			track.enabled = !isMuted.value;
		});
	}
	
	// サーバーに状態を送信
	if (roomId.value) {
		misskeyApi('voice-chat/update-participant', {
			roomId: roomId.value,
			isMuted: isMuted.value,
		});
	}
}

async function leaveRoom() {
	try {
		if (roomId.value) {
			await misskeyApi('voice-chat/leave', {
				roomId: roomId.value,
			});
		}
		
		// ローカルストリームを停止
		if (localStream) {
			localStream.getTracks().forEach(track => track.stop());
			localStream = null;
		}
		
		// Peer Connectionsをクローズ
		peerConnections.forEach(pc => pc.close());
		peerConnections.clear();
		
		// Cloudflare Callsセッションを終了
		if (cloudflareCallsApp.value) {
			await cloudflareCallsApp.value.disconnect();
			cloudflareCallsApp.value = null;
		}
		
		// UIを初期状態に戻す
		isActive.value = false;
		isHost.value = false;
		isMuted.value = false;
		participants.value = [];
		roomId.value = null;
		roomTitle.value = '';
		
		// ストリームの購読を解除
		stream.off('voiceChat', onVoiceChatUpdate);
		
	} catch (error) {
		console.error('音声チャット退出エラー:', error);
	}
}

function onVoiceChatUpdate(data: any) {
	switch (data.type) {
		case 'participantJoined':
			participants.value.push(data.participant);
			break;
		case 'participantLeft':
			participants.value = participants.value.filter(p => p.id !== data.participantId);
			break;
		case 'participantUpdated':
			const index = participants.value.findIndex(p => p.id === data.participant.id);
			if (index !== -1) {
				participants.value[index] = data.participant;
			}
			break;
		case 'roomClosed':
			leaveRoom();
			break;
	}
}

async function inviteUsers() {
	// ユーザー選択ダイアログを表示
	try {
		const user = await os.selectUser({ includeSelf: false, localOnly: false });
		
		await misskeyApi('voice-chat/invite', {
			roomId: roomId.value,
			userIds: [user.id],
		});
		
		os.toast(i18n.ts._voiceChat.invitationSent);
	} catch (error) {
		if (error === 'canceled') return;
		console.error('招待エラー:', error);
		os.alert({
			type: 'error',
			text: i18n.ts._voiceChat.failedToInvite,
		});
	}
}

onUnmounted(() => {
	if (isActive.value) {
		leaveRoom();
	}
});
</script>

<style lang="scss" module>
.voiceChat {
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
	padding: 16px;
	margin-bottom: 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.startButton {
	text-align: center;
}

.activeChat {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.title {
	font-weight: bold;
	font-size: 1.1em;
	color: var(--MI_THEME-accent);
	display: flex;
	align-items: center;
	gap: 8px;
}

.controls {
	display: flex;
	gap: 8px;
}

.controlButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	border: none;
	background: var(--MI_THEME-buttonBg);
	color: var(--MI_THEME-fg);
	cursor: pointer;
	transition: all 0.2s;
	
	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
	
	&.muted {
		background: var(--MI_THEME-error);
		color: white;
	}
}

.participants {
	display: flex;
	flex-direction: column;
	gap: 8px;
	max-height: 200px;
	overflow-y: auto;
}

.participant {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px;
	border-radius: 8px;
	background: var(--MI_THEME-bg);
}

.avatar {
	flex-shrink: 0;
}

.participantInfo {
	flex: 1;
	min-width: 0;
}

.participantName {
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.participantStatus {
	font-size: 0.9em;
	color: var(--MI_THEME-fgTransparentWeak);
	display: flex;
	align-items: center;
	gap: 4px;
}

.hostControls {
	display: flex;
	justify-content: center;
	padding-top: 8px;
	border-top: 1px solid var(--MI_THEME-divider);
}
</style>
