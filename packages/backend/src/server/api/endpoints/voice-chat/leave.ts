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

			// Cloudflare Realtimeから参加者を削除
			try {
				await this.cloudflareRealtimeService.removeParticipant(ps.roomId, me.id);
			} catch (error) {
				// エラーが発生しても継続
			}

			// 参加者リストから削除
			const updatedParticipantIds = room.participantIds.filter(id => id !== me.id);
			await this.voiceChatRoomsRepository.update(ps.roomId, {
				participantIds: updatedParticipantIds,
			});

			// ホストが離脱し、他に参加者がいない場合はルームを終了
			if (room.hostId === me.id && updatedParticipantIds.length === 0) {
				await this.voiceChatRoomsRepository.update(ps.roomId, {
					isActive: false,
					endedAt: new Date(),
				});

				// Cloudflare Realtimeルームを削除
				try {
					await this.cloudflareRealtimeService.deleteRoom(ps.roomId);
				} catch (error) {
					// エラーが発生しても継続
				}
			}

			return {};
		});
	}
}
