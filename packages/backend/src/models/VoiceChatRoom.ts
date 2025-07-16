/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';

@Entity('voice_chat_room')
export class MiVoiceChatRoom {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column('timestamp with time zone', {
		comment: 'The created date of the VoiceChatRoom.',
	})
	public createdAt: Date;

	@Column('timestamp with time zone', {
		nullable: true,
	})
	public endedAt: Date | null;

	@Column('varchar', {
		length: 100,
		nullable: true,
		comment: 'The title of the voice chat room.',
	})
	public title: string | null;

	@Index()
	@Column(id())
	public hostId: string;

	@ManyToOne(type => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public host: MiUser | null;

	@Column('boolean', {
		default: true,
		comment: 'Whether the room is active.',
	})
	public isActive: boolean;

	@Column('varchar', {
		length: 512,
		nullable: true,
		comment: 'Cloudflare Calls session token.',
	})
	public cloudflareCallsSessionToken: string | null;

	@Column('varchar', {
		length: 128,
		nullable: true,
		comment: 'Cloudflare Calls session ID.',
	})
	public cloudflareCallsSessionId: string | null;
}
