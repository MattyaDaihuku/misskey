/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { VoiceChatParticipantsRepository } from '@/models/_.js';
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
		isMuted: { type: 'boolean' },
	},
	required: ['roomId', 'isMuted'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.voiceChatParticipantsRepository)
		private voiceChatParticipantsRepository: VoiceChatParticipantsRepository,

		private globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// 参加者の状態を更新
			await this.voiceChatParticipantsRepository.update({
				roomId: ps.roomId,
				userId: me.id,
			}, {
				isMuted: ps.isMuted,
				updatedAt: new Date(),
			});

			// 状態変更を通知
			this.globalEventService.publishVoiceChatStream(ps.roomId, 'participantUpdated', {
				participant: {
					id: me.id,
					isMuted: ps.isMuted,
				},
			});
		});
	}
}
