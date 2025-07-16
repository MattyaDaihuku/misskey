/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { VoiceChatRoomsRepository, UsersRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { NotificationService } from '@/core/NotificationService.js';

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
		userIds: { type: 'array', items: { type: 'string', format: 'misskey:id' } },
	},
	required: ['roomId', 'userIds'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.voiceChatRoomsRepository)
		private voiceChatRoomsRepository: VoiceChatRoomsRepository,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private globalEventService: GlobalEventService,
		private notificationService: NotificationService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const room = await this.voiceChatRoomsRepository.findOneBy({ id: ps.roomId });
			if (!room) {
				throw new Error('Room not found');
			}

			// ホストのみが招待可能
			if (room.hostId !== me.id) {
				throw new Error('Only host can invite users');
			}

			// ユーザーの存在確認
			const users = await this.usersRepository.findBy({
				id: ps.userIds as any,
			});

			if (users.length !== ps.userIds.length) {
				throw new Error('Some users not found');
			}

			// 招待通知を送信
			for (const user of users) {
				await this.notificationService.createNotification(user.id, 'voiceChatInvite', {
					roomId: room.id,
					roomTitle: room.title,
					hostName: me.name || me.username,
				}, me.id);
			}
		});
	}
}
