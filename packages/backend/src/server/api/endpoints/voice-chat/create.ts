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
import { CloudflareCallsService } from '@/core/CloudflareCallsService.js';

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
		private cloudflareCallsService: CloudflareCallsService,
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

			// Cloudflare Callsセッションを作成
			let sessionData;
			try {
				sessionData = await this.cloudflareCallsService.createSession(roomId);
			} catch (error) {
				// Cloudflare Calls設定がない場合はダミーを使用
				sessionData = {
					sessionId: roomId,
					iceServers: [
						{
							urls: ['stun:stun.l.google.com:19302'],
						},
					],
				};
			}

			// 接続トークンを生成
			let connectionToken;
			try {
				connectionToken = await this.cloudflareCallsService.generateConnectionToken(roomId, me.id);
			} catch (error) {
				connectionToken = `dummy-token-${roomId}-${me.id}`;
			}

			// ルーム情報を更新
			await this.voiceChatRoomsRepository.update(room.id, {
				cloudflareCallsSessionToken: connectionToken,
			});

			// 通知送信
			this.globalEventService.publishVoiceChatStream(room.id, 'roomCreated', {
				room: {
					id: room.id,
					title: room.title,
					hostId: room.hostId,
					createdAt: room.createdAt,
					iceServers: sessionData.iceServers,
				},
			});

			return {
				id: room.id,
				title: room.title,
				hostId: room.hostId,
				cloudflareCallsSessionToken: connectionToken,
				iceServers: sessionData.iceServers,
				createdAt: room.createdAt.toISOString(),
			};
		});
	}
}
