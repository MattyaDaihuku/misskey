/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { MetaRepository } from '@/models/_.js';
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
		cloudflareCallsAppId: { type: 'string', nullable: true },
		cloudflareCallsApiToken: { type: 'string', nullable: true },
	},
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.metaRepository)
		private metaRepository: MetaRepository,
	) {
		super(meta, paramDef, async (ps) => {
			const meta = await this.metaRepository.findOneBy({ id: '1' });
			if (!meta) {
				throw new Error('Meta not found');
			}

			if (ps.cloudflareCallsAppId !== undefined) {
				meta.cloudflareCallsAppId = ps.cloudflareCallsAppId;
			}

			if (ps.cloudflareCallsApiToken !== undefined) {
				meta.cloudflareCallsApiToken = ps.cloudflareCallsApiToken;
			}

			await this.metaRepository.save(meta);

			return {
				cloudflareCallsAppId: meta.cloudflareCallsAppId,
				// APIトークンは返さない（セキュリティのため）
				cloudflareCallsApiTokenSet: !!meta.cloudflareCallsApiToken,
			};
		});
	}
}
