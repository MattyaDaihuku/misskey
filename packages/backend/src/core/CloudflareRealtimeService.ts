/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { MetasRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { LoggerService } from '@/core/LoggerService.js';
import Logger from '@/logger.js';

@Injectable()
export class CloudflareRealtimeService {
	private logger: Logger;

	constructor(
		@Inject(DI.metasRepository)
		private metasRepository: MetasRepository,

		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('cloudflare-realtime');
	}

	private async getConfig() {
		const meta = await this.metasRepository.findOneBy({ id: '1' });
		if (!meta) {
			throw new Error('Meta not found');
		}

		if (!meta.cloudflareRealtimeAppId || !meta.cloudflareRealtimeApiToken) {
			throw new Error('Cloudflare Realtime configuration not found');
		}

		return {
			appId: meta.cloudflareRealtimeAppId,
			apiToken: meta.cloudflareRealtimeApiToken,
		};
	}

	/**
	 * Cloudflare Realtimeルームを作成
	 */
	async createRoom(roomId: string): Promise<{ roomId: string; webRTCConfig: any }> {
		try {
			const config = await this.getConfig();

			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${config.appId}/rooms/${roomId}`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${config.apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: `voice-chat-${roomId}`,
					description: 'Misskey Voice Chat Room',
					// Serverless SFU設定
					type: 'sfu',
					maxParticipants: 50,
					configuration: {
						audio: {
							codec: 'opus',
						},
						video: {
							codec: 'h264',
							maxBitrate: 2000000,
						},
					},
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Cloudflare Realtime API error: ${response.status} ${response.statusText} - ${errorText}`);
			}

			const data = await response.json();

			this.logger.info(`Created Cloudflare Realtime room: ${roomId}`);

			return {
				roomId,
				webRTCConfig: {
					iceServers: data.iceServers ?? [
						{ urls: ['stun:stun.cloudflare.com:3478'] },
						{ urls: ['turn:turn.cloudflare.com:3478'], username: 'cloudflare', credential: data.turnCredential ?? '' },
					],
					roomUrl: data.roomUrl,
					signalingUrl: data.signalingUrl,
				},
			};
		} catch (error) {
			this.logger.error('Failed to create Cloudflare Realtime room', { error, roomId });

			// フォールバック: ダミーの設定を返す
			return {
				roomId,
				webRTCConfig: {
					iceServers: [
						{ urls: ['stun:stun.l.google.com:19302'] },
					],
					roomUrl: null,
					signalingUrl: null,
				},
			};
		}
	}

	/**
	 * Cloudflare Realtimeルームを削除
	 */
	async deleteRoom(roomId: string): Promise<void> {
		try {
			const config = await this.getConfig();

			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${config.appId}/rooms/${roomId}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${config.apiToken}`,
				},
			});

			if (!response.ok) {
				this.logger.warn(`Failed to delete Cloudflare Realtime room: ${response.status} ${response.statusText}`, { roomId });
			} else {
				this.logger.info(`Deleted Cloudflare Realtime room: ${roomId}`);
			}
		} catch (error) {
			this.logger.error('Failed to delete Cloudflare Realtime room', { error, roomId });
		}
	}

	/**
	 * 参加者用のWebRTC接続トークンを生成
	 */
	async generateParticipantToken(roomId: string, userId: string, permissions?: { canPublish?: boolean; canSubscribe?: boolean }): Promise<string> {
		try {
			const config = await this.getConfig();

			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${config.appId}/rooms/${roomId}/participants`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${config.apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					participantId: userId,
					name: `user-${userId}`,
					permissions: {
						canPublish: permissions?.canPublish ?? true,
						canSubscribe: permissions?.canSubscribe ?? true,
					},
					// トークンの有効期限 (1時間)
					ttl: 3600,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Cloudflare Realtime API error: ${response.status} ${response.statusText} - ${errorText}`);
			}

			const data = await response.json();
			return data.token ?? 'dummy-token';
		} catch (error) {
			this.logger.error('Failed to generate participant token', { error, roomId, userId });
			return `dummy-token-${roomId}-${userId}-${Date.now()}`;
		}
	}

	/**
	 * ルームの参加者リストを取得
	 */
	async getRoomParticipants(roomId: string): Promise<Array<{ participantId: string; name: string; isConnected: boolean }>> {
		try {
			const config = await this.getConfig();

			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${config.appId}/rooms/${roomId}/participants`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${config.apiToken}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Cloudflare Realtime API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			return data.participants ?? [];
		} catch (error) {
			this.logger.error('Failed to get room participants', { error, roomId });
			return [];
		}
	}

	/**
	 * 参加者をルームから削除
	 */
	async removeParticipant(roomId: string, userId: string): Promise<void> {
		try {
			const config = await this.getConfig();

			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${config.appId}/rooms/${roomId}/participants/${userId}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${config.apiToken}`,
				},
			});

			if (!response.ok) {
				this.logger.warn(`Failed to remove participant: ${response.status} ${response.statusText}`, { roomId, userId });
			} else {
				this.logger.info('Removed participant from Cloudflare Realtime room', { roomId, userId });
			}
		} catch (error) {
			this.logger.error('Failed to remove participant', { error, roomId, userId });
		}
	}

	/**
	 * ルームの統計情報を取得
	 */
	async getRoomStats(roomId: string): Promise<{ participantCount: number; activeStreams: number; bandwidth: number }> {
		try {
			const config = await this.getConfig();

			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${config.appId}/rooms/${roomId}/stats`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${config.apiToken}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Cloudflare Realtime API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			return {
				participantCount: data.participantCount ?? 0,
				activeStreams: data.activeStreams ?? 0,
				bandwidth: data.bandwidth ?? 0,
			};
		} catch (error) {
			this.logger.error('Failed to get room stats', { error, roomId });
			return {
				participantCount: 0,
				activeStreams: 0,
				bandwidth: 0,
			};
		}
	}
}
