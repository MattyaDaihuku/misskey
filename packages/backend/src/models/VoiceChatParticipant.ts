/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';
import { MiVoiceChatRoom } from './VoiceChatRoom.js';

@Entity('voice_chat_participant')
export class MiVoiceChatParticipant {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column('timestamp with time zone', {
		comment: 'The created date of the VoiceChatParticipant.',
	})
	public createdAt: Date;

	@Column('timestamp with time zone', {
		nullable: true,
	})
	public updatedAt: Date | null;

	@Index()
	@Column(id())
	public roomId: string;

	@ManyToOne(type => MiVoiceChatRoom, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public room: MiVoiceChatRoom | null;

	@Index()
	@Column(id())
	public userId: string;

	@ManyToOne(type => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public user: MiUser | null;

	@Column('boolean', {
		default: false,
		comment: 'Whether the participant is muted.',
	})
	public isMuted: boolean;

	@Column('boolean', {
		default: false,
		comment: 'Whether the participant is speaking.',
	})
	public isSpeaking: boolean;
}
