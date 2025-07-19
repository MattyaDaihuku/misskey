/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import type { MiUser } from '@/models/User.js';
import type { MiVoiceChatRoom } from '@/models/VoiceChatRoom.js';
import Channel, { type MiChannelService } from '../channel.js';

export type VoiceChatEvent = {
	type: 'joined' | 'left' | 'muted' | 'unmuted' | 'offer' | 'answer' | 'iceCandidate';
	user?: MiUser;
	room?: MiVoiceChatRoom;
	data?: any;
};

class VoiceChatChannel extends Channel {
	public readonly chName = 'voiceChat';
	public static readonly shouldShare = false;
	public static readonly requireCredential = true;
	private roomId?: string;

	@bindThis
	public async init(params: any): Promise<void> {
		this.roomId = params.roomId;
	}

	@bindThis
	public onMessage(type: string, body: any): void {
		// Handle incoming messages if needed
		switch (type) {
			case 'subVoiceChat':
				this.roomId = body.roomId;
				break;
		}
	}
}

@Injectable()
export class VoiceChatChannelService implements MiChannelService<false> {
	public readonly shouldShare = VoiceChatChannel.shouldShare;
	public readonly requireCredential = VoiceChatChannel.requireCredential;
	public readonly kind = VoiceChatChannel.kind;

	constructor() {
	}

	@bindThis
	public create(id: string, connection: any): VoiceChatChannel {
		return new VoiceChatChannel(
			id,
			connection,
		);
	}
}
