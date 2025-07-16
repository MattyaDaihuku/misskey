/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { VoiceChatRoomsRepository, VoiceChatParticipantsRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';

export const meta = {
	tags: ['voice-chat'],

	requireCredential: true,

	kind: 'write:voice-chat',

	secure: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		roomId: { type: 'string', format: 'misskey:id' },
	},
	required: ['roomId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.voiceChatRoomsRepository)
		private voiceChatRoomsRepository: VoiceChatRoomsRepository,

		@Inject(DI.voiceChatParticipantsRepository)
		private voiceChatParticipantsRepository: VoiceChatParticipantsRepository,

		private globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const room = await this.voiceChatRoomsRepository.findOneBy({ id: ps.roomId });
			if (!room) {
				throw new Error('Room not found');
			}

			// 参加者を削除
			await this.voiceChatParticipantsRepository.delete({
				roomId: ps.roomId,
				userId: me.id,
			});

			// ホストが退出した場合はルームを閉鎖
			if (room.hostId === me.id) {
				await this.voiceChatRoomsRepository.update(ps.roomId, {
					isActive: false,
					endedAt: new Date(),
				});

				// 全参加者に通知
				this.globalEventService.publishVoiceChatStream(ps.roomId, 'roomClosed', {
					roomId: ps.roomId,
				});

				// 残りの参加者を削除
				await this.voiceChatParticipantsRepository.delete({
					roomId: ps.roomId,
				});
			} else {
				// 参加者退出を通知
				this.globalEventService.publishVoiceChatStream(ps.roomId, 'participantLeft', {
					participantId: me.id,
				});
			}
		});
	}
}
