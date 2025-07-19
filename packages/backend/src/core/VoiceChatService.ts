/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { MetaService } from '@/core/MetaService.js';

@Injectable()
export class VoiceChatService {
	constructor(
		private metaService: MetaService,
	) {}

	/**
	 * Cloudflare Realtime接続情報を取得
	 */
	async createSession(roomId: string): Promise<string> {
		const instance = await this.metaService.fetch();
		
		if (!instance.cloudflareRealtimeAppId || !instance.cloudflareRealtimeApiToken) {
			throw new Error('Cloudflare Realtime is not configured');
		}

		try {
			// Cloudflare Realtime APIを使用してセッションを作成
			const response = await fetch(`https://api.cloudflare.realtime/v1/apps/${instance.cloudflareRealtimeAppId}/sessions/new`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${instance.cloudflareRealtimeApiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sessionDescription: {
						sessionId: roomId,
						allowedOrigins: ['*'], // For now, allow all origins. In production, set this to your domain
						requireAuth: true,
					},
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to create Cloudflare Calls session: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			return data.sessionToken;
		} catch (error) {
			console.error('Error creating Cloudflare Calls session:', error);
			throw new Error('Failed to create voice chat session');
		}
	}

	/**
	 * Cloudflare Realtimeセッションを終了
	 */
	async endSession(sessionToken: string): Promise<void> {
		const instance = await this.metaService.fetch();
		
		if (!instance.cloudflareRealtimeAppId || !instance.cloudflareRealtimeApiToken) {
			throw new Error('Cloudflare Realtime is not configured');
		}

		try {
			const response = await fetch(`https://api.cloudflare.realtime/v1/apps/${instance.cloudflareRealtimeAppId}/sessions/${sessionToken}/end`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${instance.cloudflareRealtimeApiToken}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				console.warn(`Failed to end Cloudflare Realtime session: ${response.status} ${response.statusText}`);
			}
		} catch (error) {
			console.error('Error ending Cloudflare Realtime session:', error);
		}
	}
}
