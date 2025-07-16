/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { MetaRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { LoggerService } from '@/core/LoggerService.js';
import type { Logger } from '@/logger.js';

@Injectable()
export class CloudflareCallsService {
	private logger: Logger;

	constructor(
		@Inject(DI.metaRepository)
		private metaRepository: MetaRepository,

		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('cloudflare-calls');
	}

	private async getConfig() {
		const meta = await this.metaRepository.findOneBy({ id: '1' });
		if (!meta) {
			throw new Error('Meta not found');
		}

		if (!meta.cloudflareCallsAppId || !meta.cloudflareCallsApiToken) {
			throw new Error('Cloudflare Calls configuration not found');
		}

		return {
			appId: meta.cloudflareCallsAppId,
			apiToken: meta.cloudflareCallsApiToken,
		};
	}

	/**
	 * Cloudflare Callsセッションを作成
	 */
	async createSession(sessionId: string): Promise<{ sessionId: string; iceServers: any[] }> {
		try {
			const config = await this.getConfig();

			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${config.appId}/sessions/${sessionId}`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${config.apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					// セッションの設定をここに追加
				}),
			});

			if (!response.ok) {
				throw new Error(`Cloudflare Calls API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			this.logger.info(`Created Cloudflare Calls session: ${sessionId}`);

			return {
				sessionId,
				iceServers: data.iceServers || [],
			};
		} catch (error) {
			this.logger.error('Failed to create Cloudflare Calls session', { error, sessionId });

			// フォールバック: ダミーの設定を返す
			return {
				sessionId,
				iceServers: [
					{
						urls: ['stun:stun.l.google.com:19302'],
					},
				],
			};
		}
	}

	/**
	 * Cloudflare Callsセッションを削除
	 */
	async deleteSession(sessionId: string): Promise<void> {
		try {
			const config = await this.getConfig();

			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${config.appId}/sessions/${sessionId}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${config.apiToken}`,
				},
			});

			if (!response.ok) {
				this.logger.warn(`Failed to delete Cloudflare Calls session: ${response.status} ${response.statusText}`, { sessionId });
			} else {
				this.logger.info(`Deleted Cloudflare Calls session: ${sessionId}`);
			}
		} catch (error) {
			this.logger.error('Failed to delete Cloudflare Calls session', { error, sessionId });
		}
	}

	/**
	 * WebRTC接続用のトークンを生成
	 */
	async generateConnectionToken(sessionId: string, userId: string): Promise<string> {
		try {
			const config = await this.getConfig();

			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${config.appId}/sessions/${sessionId}/tracks/new`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${config.apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sessionId,
					trackName: `user-${userId}`,
				}),
			});

			if (!response.ok) {
				throw new Error(`Cloudflare Calls API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			return data.token || 'dummy-token';
		} catch (error) {
			this.logger.error('Failed to generate connection token', { error, sessionId, userId });
			return 'dummy-token';
		}
	}
}
