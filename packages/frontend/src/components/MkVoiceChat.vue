<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.voiceChat">
	<div v-if="!isActive" :class="$style.startButton">
		<MkButton primary rounded @click="startVoiceChat">
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
					:title="isMuted ? i18n.ts._voiceChat.unmute : i18n.ts._voiceChat.mute"
					@click="toggleMute"
				>
					<i :class="isMuted ? 'ti ti-microphone-off' : 'ti ti-microphone'"></i>
				</button>
				<button
					:class="$style.controlButton"
					:title="i18n.ts._voiceChat.leave"
					@click="leaveRoom"
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
			<MkButton small @click="inviteUsers">
				<i class="ti ti-user-plus"></i>
				{{ i18n.ts._voiceChat.invite }}
			</MkButton>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, onUnmounted } from 'vue';
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
	iceServers?: RTCIceServer[];
}

const isActive = ref(false);
const isHost = ref(false);
const isMuted = ref(false);
const participants = ref<VoiceChatParticipant[]>([]);
const roomId = ref<string | null>(null);
const roomTitle = ref<string>('');
const iceServers = ref<RTCIceServer[]>([]);

// WebRTC関連
let localStream: MediaStream | null = null;
let peerConnections: Map<string, RTCPeerConnection> = new Map();
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;

const stream = useStream();

async function startVoiceChat() {
	try {
		// マイクの権限を取得
		localStream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
			},
		});

		// 音声分析の準備
		setupAudioAnalysis();

		// バックエンドに音声チャットルームの作成を要求
		const room = await misskeyApi('voice-chat/create', {
			title: roomTitle.value || undefined,
		});

		roomId.value = room.id;
		isActive.value = true;
		isHost.value = true;
		iceServers.value = room.iceServers ?? [{ urls: ['stun:stun.l.google.com:19302'] }];

		// ストリームからの更新を受信
		stream.useChannel('voiceChat', {}, roomId.value);
		stream.on('voiceChat', onVoiceChatUpdate);

		// 自分を参加者リストに追加
		if ($i) {
			participants.value = [{
				id: $i.id,
				user: $i,
				isMuted: false,
				isSpeaking: false,
			}];
		}
	} catch (error) {
		console.error('音声チャット開始エラー:', error);
		os.alert({
			type: 'error',
			text: i18n.ts._voiceChat.failedToStart,
		});
	}
}

function setupAudioAnalysis() {
	if (!localStream) return;

	try {
		audioContext = new AudioContext();
		const source = audioContext.createMediaStreamSource(localStream);
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 256;
		source.connect(analyser);

		// 音声レベルの監視を開始
		monitorAudioLevel();
	} catch (error) {
		console.error('音声分析の設定エラー:', error);
	}
}

function monitorAudioLevel() {
	if (!analyser) return;

	const dataArray = new Uint8Array(analyser.frequencyBinCount);

	function checkLevel() {
		if (!analyser || !isActive.value) return;

		analyser.getByteFrequencyData(dataArray);
		const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

		// 音声レベルに基づいて話中状態を更新
		const isSpeaking = average > 20 && !isMuted.value;
		updateSpeakingStatus(isSpeaking);

		requestAnimationFrame(checkLevel);
	}

	checkLevel();
}

function updateSpeakingStatus(speaking: boolean) {
	if (!$i || !roomId.value) return;

	const myParticipant = participants.value.find(p => p.id === $i.id);
	if (myParticipant && myParticipant.isSpeaking !== speaking) {
		myParticipant.isSpeaking = speaking;

		// サーバーに状態を送信
		misskeyApi('voice-chat/update-participant', {
			roomId: roomId.value,
			isSpeaking: speaking,
		}).catch(console.error);
	}
}

async function createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
	const pc = new RTCPeerConnection({
		iceServers: iceServers.value,
	});

	// ローカルストリームを追加
	if (localStream) {
		localStream.getTracks().forEach(track => {
			if (localStream) {
				pc.addTrack(track, localStream);
			}
		});
	}

	// リモートストリームを受信
	pc.ontrack = (event) => {
		const [remoteStream] = event.streams;
		playRemoteAudio(remoteStream, participantId);
	};

	// ICE候補の処理
	pc.onicecandidate = (event) => {
		if (event.candidate && roomId.value) {
			// ICE候補をサーバー経由で送信
			misskeyApi('voice-chat/send-ice-candidate', {
				roomId: roomId.value,
				targetUserId: participantId,
				candidate: event.candidate,
			}).catch(console.error);
		}
	};

	pc.onconnectionstatechange = () => {
		console.log(`Peer connection state with ${participantId}:`, pc.connectionState);
	};

	peerConnections.set(participantId, pc);
	return pc;
}

function playRemoteAudio(remoteStream: MediaStream, participantId: string) {
	const audio = new Audio();
	audio.srcObject = remoteStream;
	audio.play().catch(console.error);

	// 参加者の音声要素として保存
	const participant = participants.value.find(p => p.id === participantId);
	if (participant) {
		// 音声ストリームを関連付け
		(participant as VoiceChatParticipant & { audioElement?: HTMLAudioElement }).audioElement = audio;
	}
}

async function handleNewParticipant(participant: VoiceChatParticipant) {
	if (participant.id === $i?.id) return;

	const pc = await createPeerConnection(participant.id);

	// オファーを作成して送信
	if (isHost.value) {
		try {
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);

			if (roomId.value) {
				await misskeyApi('voice-chat/send-offer', {
					roomId: roomId.value,
					targetUserId: participant.id,
					offer: offer,
				});
			}
		} catch (error) {
			console.error('オファー作成エラー:', error);
		}
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

		// 音声コンテキストを停止
		if (audioContext) {
			await audioContext.close();
			audioContext = null;
			analyser = null;
		}

		// Peer Connectionsをクローズ
		peerConnections.forEach(pc => pc.close());
		peerConnections.clear();

		// UIを初期状態に戻す
		isActive.value = false;
		isHost.value = false;
		isMuted.value = false;
		participants.value = [];
		roomId.value = null;
		roomTitle.value = '';
		iceServers.value = [];

		// ストリームの購読を解除
		stream.off('voiceChat', onVoiceChatUpdate);
	} catch (error) {
		console.error('音声チャット退出エラー:', error);
	}
}

interface VoiceChatUpdateData {
	type: 'participantJoined' | 'participantLeft' | 'participantUpdated' | 'roomClosed' | 'offer' | 'answer' | 'iceCandidate';
	participant?: VoiceChatParticipant;
	participantId?: string;
	offer?: RTCSessionDescriptionInit;
	answer?: RTCSessionDescriptionInit;
	candidate?: RTCIceCandidateInit;
	fromUserId?: string;
}

function onVoiceChatUpdate(data: VoiceChatUpdateData) {
	switch (data.type) {
		case 'participantJoined':
			if (data.participant) {
				participants.value.push(data.participant);
				handleNewParticipant(data.participant);
			}
			break;
		case 'participantLeft':
			if (data.participantId) {
				participants.value = participants.value.filter(p => p.id !== data.participantId);
				// Peer connectionをクローズ
				const pc = peerConnections.get(data.participantId);
				if (pc) {
					pc.close();
					peerConnections.delete(data.participantId);
				}
			}
			break;
		case 'participantUpdated': {
			if (data.participant) {
				const index = participants.value.findIndex(p => p.id === data.participant?.id);
				if (index !== -1) {
					participants.value[index] = data.participant;
				}
			}
			break;
		}
		case 'offer':
			if (data.offer && data.fromUserId) {
				handleOffer(data.offer, data.fromUserId);
			}
			break;
		case 'answer':
			if (data.answer && data.fromUserId) {
				handleAnswer(data.answer, data.fromUserId);
			}
			break;
		case 'iceCandidate':
			if (data.candidate && data.fromUserId) {
				handleIceCandidate(data.candidate, data.fromUserId);
			}
			break;
		case 'roomClosed':
			leaveRoom();
			break;
	}
}

async function handleOffer(offer: RTCSessionDescriptionInit, fromUserId: string) {
	try {
		const pc = await createPeerConnection(fromUserId);
		await pc.setRemoteDescription(offer);

		const answer = await pc.createAnswer();
		await pc.setLocalDescription(answer);

		if (roomId.value) {
			await misskeyApi('voice-chat/send-answer', {
				roomId: roomId.value,
				targetUserId: fromUserId,
				answer: answer,
			});
		}
	} catch (error) {
		console.error('オファー処理エラー:', error);
	}
}

async function handleAnswer(answer: RTCSessionDescriptionInit, fromUserId: string) {
	try {
		const pc = peerConnections.get(fromUserId);
		if (pc) {
			await pc.setRemoteDescription(answer);
		}
	} catch (error) {
		console.error('アンサー処理エラー:', error);
	}
}

async function handleIceCandidate(candidate: RTCIceCandidateInit, fromUserId: string) {
	try {
		const pc = peerConnections.get(fromUserId);
		if (pc) {
			await pc.addIceCandidate(candidate);
		}
	} catch (error) {
		console.error('ICE候補処理エラー:', error);
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
