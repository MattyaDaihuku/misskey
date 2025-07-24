/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';

@Entity('voice_chat_room')
@Index(['hostId'])
@Index(['createdAt'])
export class MiVoiceChatRoom {
	@PrimaryColumn(id())
	public id: string;

	@Column('varchar', {
		length: 128,
	})
	public title: string;

	@Index()
	@Column(id())
	public hostId: MiUser['id'];

	@ManyToOne(type => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public host: MiUser | null;

	@Column('timestamp with time zone')
	public createdAt: Date;

	@Column('timestamp with time zone', {
		nullable: true,
	})
	public endedAt: Date | null;

	@Column('boolean', {
		default: true,
	})
	public isActive: boolean;

	@Column('varchar', {
		length: 1024,
		nullable: true,
	})
	public cloudflareRealtimeToken: string | null;

	@Column('simple-array', {
		default: '{}',
	})
	public participantIds: string[];

	@Column('integer', {
		default: 50,
	})
	public maxParticipants: number;

	@Column('jsonb', {
		default: '{}',
	})
	public settings: Record<string, any>;
}
