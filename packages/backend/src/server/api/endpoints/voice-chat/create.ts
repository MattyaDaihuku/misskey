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
import { CloudflareRealtimeService } from '@/core/CloudflareRealtimeService.js';

export const meta = {
	tags: ['voice-chat'],

	requireCredential: true,

	kind: 'write:voice-chat',

	res: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				example: 'xxxxxxxxxx',
			},
			title: {
				type: 'string',
			},
			hostId: {
				type: 'string',
				format: 'id',
				example: 'xxxxxxxxxx',
			},
			cloudflareRealtimeToken: {
				type: 'string',
			},
			webRTCConfig: {
				type: 'object',
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
		title: { type: 'string', minLength: 1, maxLength: 100 },
	},
	required: ['title'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.voiceChatRoomsRepository)
		private voiceChatRoomsRepository: VoiceChatRoomsRepository,

		private metaService: MetaService,
		private idService: IdService,
		private globalEventService: GlobalEventService,
		private cloudflareRealtimeService: CloudflareRealtimeService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const roomId = this.idService.gen();

			// 音声チャットルームを作成
			const room = await this.voiceChatRoomsRepository.insert({
				id: roomId,
				title: ps.title,
				hostId: me.id,
				createdAt: new Date(),
				isActive: true,
			}).then(x => this.voiceChatRoomsRepository.findOneByOrFail({ id: x.identifiers[0].id }));

			// Cloudflare Realtimeルームを作成
			let webRTCConfig;
			try {
				const realtimeRoom = await this.cloudflareRealtimeService.createRoom(roomId);
				webRTCConfig = realtimeRoom.webRTCConfig;
			} catch (error) {
				// Cloudflare Realtime設定がない場合はダミーを使用
				webRTCConfig = {
					iceServers: [
						{
							urls: ['stun:stun.l.google.com:19302'],
						},
					],
					roomUrl: null,
					signalingUrl: null,
				};
			}

			// 参加者トークンを生成
			let participantToken;
			try {
				participantToken = await this.cloudflareRealtimeService.generateParticipantToken(roomId, me.id, {
					canPublish: true,
					canSubscribe: true,
				});
			} catch (error) {
				participantToken = `dummy-token-${roomId}-${me.id}`;
			}

			// ルーム情報を更新
			await this.voiceChatRoomsRepository.update(room.id, {
				cloudflareRealtimeToken: participantToken,
			});

			// 通知送信
			this.globalEventService.publishVoiceChatStream('voiceChat:created', {
				room: {
					id: room.id,
					title: room.title,
					hostId: room.hostId,
					createdAt: room.createdAt,
					webRTCConfig: webRTCConfig,
				},
			});

			return {
				id: room.id,
				title: room.title,
				hostId: room.hostId,
				cloudflareRealtimeToken: participantToken,
				webRTCConfig: webRTCConfig,
				createdAt: room.createdAt.toISOString(),
			};
		});
	}
}
