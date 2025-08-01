/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { MiMeta } from '@/models/Meta.js';
import { RoleService } from '@/core/RoleService.js';
import { ApiError } from '../../error.js';
import { voiceChatRooms } from './create-room.js';

export const meta = {
	tags: ['voice-chat'],

	requireCredential: true,
	secure: true,

	kind: 'write:voice-chat',

	limit: {
		duration: 60000,
		max: 10,
	},

	errors: {
		permissionDenied: {
			message: 'Permission denied.',
			code: 'PERMISSION_DENIED',
			id: 'e2b3c8f0-7e5a-4f0d-9f1e-2e8f3e4d5c6b',
		},
		notConfigured: {
			message: 'Voice chat is not configured.',
			code: 'NOT_CONFIGURED',
			id: 'f3c4d5e6-8f9a-4b1c-2d3e-5f6g7h8i9j0k',
		},
		sessionNotFound: {
			message: 'Session not found.',
			code: 'SESSION_NOT_FOUND',
			id: 'a1b2c3d4-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
		},
		notHost: {
			message: 'Only the host can end the session.',
			code: 'NOT_HOST',
			id: 'b2c3d4e5-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		sessionId: { type: 'string' },
	},
	required: ['sessionId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private serverSettings: MiMeta,

		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Check if voice chat is configured
			if (!this.serverSettings.cloudflareRealtimeEnabled || !this.serverSettings.cloudflareRealtimeAppId || !this.serverSettings.cloudflareRealtimeAppSecret) {
				throw new ApiError(meta.errors.notConfigured);
			}

			// Check user permissions
			const policies = await this.roleService.getUserPolicies(me.id);
			if (!policies.canUseVoiceChat) {
				throw new ApiError(meta.errors.permissionDenied);
			}

			// Find the room that has this session ID
			let targetRoom = null;
			for (const [roomId, room] of voiceChatRooms.entries()) {
				if (room.sessionId === ps.sessionId) {
					targetRoom = room;
					break;
				}
			}

			// If no room found with this session ID, the session might not exist
			if (!targetRoom) {
				throw new ApiError(meta.errors.sessionNotFound);
			}

			// Check if the current user is the host of the room
			if (targetRoom.hostId !== me.id) {
				throw new ApiError(meta.errors.notHost);
			}

			// End session via Cloudflare Realtime API
			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${this.serverSettings.cloudflareRealtimeAppId}/sessions/${ps.sessionId}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${this.serverSettings.cloudflareRealtimeAppSecret}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					throw new ApiError(meta.errors.sessionNotFound);
				}
				throw new Error(`Failed to end session: ${response.statusText}`);
			}

			// Update room status after successful session end
			targetRoom.status = 'waiting';
			targetRoom.sessionId = undefined;
			// Clear participants and speakers lists as they will need to rejoin
			targetRoom.participants = [targetRoom.hostId]; // Keep only the host
			targetRoom.speakers = [targetRoom.hostId]; // Keep only the host as speaker

			return {
				success: true,
			};
		});
	}
}
