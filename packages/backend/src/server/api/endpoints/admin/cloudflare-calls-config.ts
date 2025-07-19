/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { MetasRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,

	kind: 'write:admin',

	secure: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		cloudflareRealtimeAppId: { type: 'string', nullable: true },
		cloudflareRealtimeToken: { type: 'string', nullable: true },
	},
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.metasRepository)
		private metasRepository: MetasRepository,
	) {
		super(meta, paramDef, async (ps) => {
			const meta = await this.metasRepository.findOneBy({ id: '1' });
			if (!meta) {
				throw new Error('Meta not found');
			}

			if (ps.cloudflareRealtimeAppId !== undefined) {
				meta.cloudflareRealtimeAppId = ps.cloudflareRealtimeAppId;
			}

			if (ps.cloudflareRealtimeToken !== undefined) {
				meta.cloudflareRealtimeToken = ps.cloudflareRealtimeToken;
			}

			await this.metasRepository.save(meta);

			return {
				cloudflareRealtimeAppId: meta.cloudflareRealtimeAppId,
				// APIトークンは返さない（セキュリティのため）
				cloudflareRealtimeTokenSet: !!meta.cloudflareRealtimeToken,
			};
		});
	}
}
