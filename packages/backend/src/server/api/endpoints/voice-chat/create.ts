/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { VoiceChatRoomsRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { MetaService } from '@/core/MetaService.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';

export const meta = {
	tags: ['voice-chat'],

	requireCredential: true,

	kind: 'write:voice-chat',

	secure: true,

	res: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
			},
			title: {
				type: 'string',
				nullable: true,
			},
			hostId: {
				type: 'string',
				format: 'id',
			},
			cloudflareCallsSessionToken: {
				type: 'string',
			},
			createdAt: {
				type: 'string',
				format: 'date-time',
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		title: { type: 'string', nullable: true, maxLength: 100 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.voiceChatRoomsRepository)
		private voiceChatRoomsRepository: VoiceChatRoomsRepository,

		private metaService: MetaService,
		private idService: IdService,
		private globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Cloudflare Calls設定の確認
			const instance = await this.metaService.fetch();
			if (!instance.cloudflareCallsAppId || !instance.cloudflareCallsApiToken) {
				throw new Error('Cloudflare Calls is not configured');
			}

			// 音声チャットルームを作成
			const room = await this.voiceChatRoomsRepository.insert({
				id: this.idService.gen(),
				title: ps.title,
				hostId: me.id,
				createdAt: new Date(),
				isActive: true,
			}).then(x => this.voiceChatRoomsRepository.findOneByOrFail({ id: x.identifiers[0].id }));

			// Cloudflare Callsセッションを作成（簡単なダミー実装）
			const sessionToken = `dummy-session-token-${room.id}-${Date.now()}`;

			// ルーム情報を更新
			await this.voiceChatRoomsRepository.update(room.id, {
				cloudflareCallsSessionToken: sessionToken,
			});

			// 通知送信
			this.globalEventService.publishVoiceChatStream(room.id, 'roomCreated', {
				room: {
					id: room.id,
					title: room.title,
					hostId: room.hostId,
					createdAt: room.createdAt,
				},
			});

			return {
				id: room.id,
				title: room.title,
				hostId: room.hostId,
				cloudflareCallsSessionToken: sessionToken,
				createdAt: room.createdAt.toISOString(),
			};
		});
	}
}
