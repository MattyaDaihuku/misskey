/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { VoiceChatRoomsRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { CloudflareRealtimeService } from '@/core/CloudflareRealtimeService.js';

export const meta = {
	tags: ['voice-chat'],

	requireCredential: true,

	kind: 'write:voice-chat',

	res: {
		type: 'object',
		properties: {
			participantToken: {
				type: 'string',
			},
			webRTCConfig: {
				type: 'object',
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		roomId: { type: 'string' },
	},
	required: ['roomId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.voiceChatRoomsRepository)
		private voiceChatRoomsRepository: VoiceChatRoomsRepository,

		private cloudflareRealtimeService: CloudflareRealtimeService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// ルームの存在確認
			const room = await this.voiceChatRoomsRepository.findOneBy({ id: ps.roomId });
			if (!room) {
				throw new Error('Room not found');
			}

			if (!room.isActive) {
				throw new Error('Room is not active');
			}

			// 参加者トークンを生成
			let participantToken;
			try {
				participantToken = await this.cloudflareRealtimeService.generateParticipantToken(ps.roomId, me.id, {
					canPublish: true,
					canSubscribe: true,
				});
			} catch (error) {
				participantToken = `dummy-token-${ps.roomId}-${me.id}`;
			}

			// WebRTC設定を取得
			let webRTCConfig;
			try {
				const realtimeRoom = await this.cloudflareRealtimeService.createRoom(ps.roomId);
				webRTCConfig = realtimeRoom.webRTCConfig;
			} catch (error) {
				webRTCConfig = {
					iceServers: [
						{ urls: ['stun:stun.l.google.com:19302'] },
					],
					roomUrl: null,
					signalingUrl: null,
				};
			}

			// 参加者リストに追加
			if (!room.participantIds.includes(me.id)) {
				await this.voiceChatRoomsRepository.update(ps.roomId, {
					participantIds: [...room.participantIds, me.id],
				});
			}

			return {
				participantToken,
				webRTCConfig,
			};
		});
	}
}
