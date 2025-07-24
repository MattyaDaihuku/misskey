<template>
	<div class="voice-chat-container">
		<div class="header">
			<h2>{{ roomTitle }}</h2>
			<div class="controls">
				<button @click="toggleMute" :class="{ active: isMuted }">
					<i class="ti ti-microphone" v-if="!isMuted"></i>
					<i class="ti ti-microphone-off" v-else></i>
				</button>
				<button @click="toggleVideo" :class="{ active: isVideoOff }">
					<i class="ti ti-video" v-if="!isVideoOff"></i>
					<i class="ti ti-video-off" v-else></i>
				</button>
				<button @click="leaveRoom" class="danger">
					<i class="ti ti-phone-off"></i>
				</button>
			</div>
		</div>

		<div class="participants">
			<div class="participant local" :class="{ muted: isMuted }">
				<video ref="localVideo" autoplay muted playsinline></video>
				<div class="name">あなた</div>
			</div>
			<div
				v-for="participant in participants"
				:key="participant.id"
				class="participant remote"
				:class="{ muted: participant.isMuted }"
			>
				<video :ref="`remoteVideo-${participant.id}`" autoplay playsinline></video>
				<div class="name">{{ participant.name }}</div>
			</div>
		</div>

		<div class="status" v-if="connectionStatus !== 'connected'">
			{{ getStatusText() }}
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const props = defineProps<{
	roomId: string;
	roomTitle?: string;
}>();

const emit = defineEmits<{
	(ev: 'left'): void;
}>();

// WebRTC関連
const localVideo = ref<HTMLVideoElement>();
const localStream = ref<MediaStream | null>(null);
const peerConnection = ref<RTCPeerConnection | null>(null);
const webSocket = ref<WebSocket | null>(null);

// 状態管理
const isMuted = ref(false);
const isVideoOff = ref(false);
const connectionStatus = ref<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting');
const participants = ref<Array<{ id: string; name: string; isMuted: boolean }>>([]);

// ローカルメディアストリームを取得
async function getLocalStream() {
	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true,
		});
		localStream.value = stream;
		if (localVideo.value) {
			localVideo.value.srcObject = stream;
		}
		return stream;
	} catch (error) {
		console.error('Failed to get local media:', error);
		os.alert({
			type: 'error',
			text: 'マイクやカメラにアクセスできませんでした。',
		});
		throw error;
	}
}

// WebRTC接続を初期化
async function initializeWebRTC() {
	try {
		// ルームに参加
		const joinResult = await misskeyApi('voice-chat/join', {
			roomId: props.roomId,
		});

		const webRTCConfig = joinResult.webRTCConfig;

		// RTCPeerConnectionを作成
		peerConnection.value = new RTCPeerConnection({
			iceServers: webRTCConfig.iceServers,
		});

		// ローカルストリームを追加
		const stream = await getLocalStream();
		stream.getTracks().forEach(track => {
			if (peerConnection.value) {
				peerConnection.value.addTrack(track, stream);
			}
		});

		// WebSocketでシグナリング
		if (webRTCConfig.signalingUrl) {
			webSocket.value = new WebSocket(webRTCConfig.signalingUrl);
			
			webSocket.value.onopen = () => {
				connectionStatus.value = 'connected';
			};

			webSocket.value.onmessage = async (event) => {
				const message = JSON.parse(event.data);
				await handleSignalingMessage(message);
			};

			webSocket.value.onclose = () => {
				connectionStatus.value = 'disconnected';
			};
		} else {
			// フォールバック: ダミー実装
			connectionStatus.value = 'connected';
		}

		// ICE候補を処理
		peerConnection.value.onicecandidate = (event) => {
			if (event.candidate && webSocket.value) {
				webSocket.value.send(JSON.stringify({
					type: 'ice-candidate',
					candidate: event.candidate,
				}));
			}
		};

		// リモートストリームを処理
		peerConnection.value.ontrack = (event) => {
			// リモートビデオの処理をここに実装
			console.log('Received remote stream:', event.streams[0]);
		};

	} catch (error) {
		console.error('Failed to initialize WebRTC:', error);
		connectionStatus.value = 'failed';
		os.alert({
			type: 'error',
			text: 'ボイスチャットに参加できませんでした。',
		});
	}
}

// シグナリングメッセージを処理
async function handleSignalingMessage(message: any) {
	if (!peerConnection.value) return;

	switch (message.type) {
		case 'offer':
			await peerConnection.value.setRemoteDescription(message.offer);
			const answer = await peerConnection.value.createAnswer();
			await peerConnection.value.setLocalDescription(answer);
			if (webSocket.value) {
				webSocket.value.send(JSON.stringify({
					type: 'answer',
					answer: answer,
				}));
			}
			break;

		case 'answer':
			await peerConnection.value.setRemoteDescription(message.answer);
			break;

		case 'ice-candidate':
			await peerConnection.value.addIceCandidate(message.candidate);
			break;
	}
}

// マイクのミュート切り替え
function toggleMute() {
	if (localStream.value) {
		const audioTrack = localStream.value.getAudioTracks()[0];
		if (audioTrack) {
			audioTrack.enabled = !audioTrack.enabled;
			isMuted.value = !audioTrack.enabled;
		}
	}
}

// ビデオの切り替え
function toggleVideo() {
	if (localStream.value) {
		const videoTrack = localStream.value.getVideoTracks()[0];
		if (videoTrack) {
			videoTrack.enabled = !videoTrack.enabled;
			isVideoOff.value = !videoTrack.enabled;
		}
	}
}

// ルームを離脱
async function leaveRoom() {
	try {
		await misskeyApi('voice-chat/leave', {
			roomId: props.roomId,
		});
	} catch (error) {
		console.error('Failed to leave room:', error);
	}

	// WebRTC接続をクリーンアップ
	cleanup();
	emit('left');
}

// リソースをクリーンアップ
function cleanup() {
	if (localStream.value) {
		localStream.value.getTracks().forEach(track => track.stop());
		localStream.value = null;
	}

	if (peerConnection.value) {
		peerConnection.value.close();
		peerConnection.value = null;
	}

	if (webSocket.value) {
		webSocket.value.close();
		webSocket.value = null;
	}
}

// 接続ステータスのテキストを取得
function getStatusText() {
	switch (connectionStatus.value) {
		case 'connecting':
			return '接続中...';
		case 'disconnected':
			return '接続が切断されました';
		case 'failed':
			return '接続に失敗しました';
		default:
			return '';
	}
}

onMounted(() => {
	initializeWebRTC();
});

onUnmounted(() => {
	cleanup();
});
</script>

<style lang="scss" scoped>
.voice-chat-container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: var(--panel);
	color: var(--fg);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16px;
	background: var(--bg);
	border-bottom: solid 1px var(--divider);

	h2 {
		margin: 0;
		font-size: 18px;
	}

	.controls {
		display: flex;
		gap: 8px;

		button {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 48px;
			height: 48px;
			border: none;
			border-radius: 50%;
			background: var(--buttonBg);
			color: var(--fg);
			cursor: pointer;
			transition: background-color 0.2s;

			&:hover {
				background: var(--buttonHoverBg);
			}

			&.active {
				background: var(--accent);
				color: var(--fgOnAccent);
			}

			&.danger {
				background: var(--error);
				color: var(--fgOnError);

				&:hover {
					background: color-mix(in srgb, var(--error) 90%, black);
				}
			}

			i {
				font-size: 20px;
			}
		}
	}
}

.participants {
	flex: 1;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 16px;
	padding: 16px;
	overflow: auto;
}

.participant {
	position: relative;
	background: var(--panel);
	border-radius: 12px;
	overflow: hidden;
	aspect-ratio: 4/3;

	video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.name {
		position: absolute;
		bottom: 8px;
		left: 8px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
	}

	&.muted::after {
		content: '🔇';
		position: absolute;
		top: 8px;
		right: 8px;
		font-size: 20px;
	}

	&.local {
		border: 2px solid var(--accent);
	}
}

.status {
	text-align: center;
	padding: 16px;
	background: var(--infoWarnBg);
	color: var(--infoWarnFg);
	border-top: solid 1px var(--divider);
}
</style>
