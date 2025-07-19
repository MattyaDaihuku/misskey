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

	res: {
		type: 'object',
		properties: {
			success: {
				type: 'boolean',
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		roomId: { type: 'string', format: 'misskey:id' },
		targetUserId: { type: 'string', format: 'misskey:id' },
		candidate: {
			type: 'object',
			properties: {
				candidate: { type: 'string' },
				sdpMLineIndex: { type: 'number', nullable: true },
				sdpMid: { type: 'string', nullable: true },
			},
			required: ['candidate'],
		},
	},
	required: ['roomId', 'targetUserId', 'candidate'],
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
			// ルームが存在し、ユーザーが参加していることを確認
			const room = await this.voiceChatRoomsRepository.findOneBy({
				id: ps.roomId,
				isActive: true,
			});

			if (!room) {
				throw new Error('Room not found');
			}

			const participant = await this.voiceChatParticipantsRepository.findOneBy({
				roomId: ps.roomId,
				userId: me.id,
			});

			if (!participant) {
				throw new Error('Not a participant');
			}

			// ターゲットユーザーがルームに参加していることを確認
			const targetParticipant = await this.voiceChatParticipantsRepository.findOneBy({
				roomId: ps.roomId,
				userId: ps.targetUserId,
			});

			if (!targetParticipant) {
				throw new Error('Target user not in room');
			}

			// ICE候補を対象ユーザーに送信
			this.globalEventService.publishVoiceChatStream(ps.roomId, 'iceCandidate', {
				candidate: ps.candidate,
				fromUserId: me.id,
				targetUserId: ps.targetUserId,
			});

			return {
				success: true,
			};
		});
	}
}
