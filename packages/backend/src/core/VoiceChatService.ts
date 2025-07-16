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
	 * Cloudflare Callsセッションを作成
	 */
	async createSession(roomId: string): Promise<string> {
		const instance = await this.metaService.fetch();
		
		if (!instance.cloudflareCallsAppId || !instance.cloudflareCallsApiToken) {
			throw new Error('Cloudflare Calls is not configured');
		}

		try {
			// Cloudflare Calls APIを使用してセッションを作成
			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${instance.cloudflareCallsAppId}/sessions/new`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${instance.cloudflareCallsApiToken}`,
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
	 * Cloudflare Callsセッションを終了
	 */
	async endSession(sessionToken: string): Promise<void> {
		const instance = await this.metaService.fetch();
		
		if (!instance.cloudflareCallsAppId || !instance.cloudflareCallsApiToken) {
			throw new Error('Cloudflare Calls is not configured');
		}

		try {
			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${instance.cloudflareCallsAppId}/sessions/${sessionToken}/end`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${instance.cloudflareCallsApiToken}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				console.warn(`Failed to end Cloudflare Calls session: ${response.status} ${response.statusText}`);
			}
		} catch (error) {
			console.error('Error ending Cloudflare Calls session:', error);
		}
	}
}
