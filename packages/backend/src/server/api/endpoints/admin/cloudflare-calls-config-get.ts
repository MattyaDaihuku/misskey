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

	kind: 'read:admin',

	secure: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.metaRepository)
		private metaRepository: MetaRepository,
	) {
		super(meta, paramDef, async () => {
			const meta = await this.metaRepository.findOneBy({ id: '1' });
			if (!meta) {
				throw new Error('Meta not found');
			}

			return {
				cloudflareCallsAppId: meta.cloudflareCallsAppId,
				// APIトークンは返さない（セキュリティのため）
				cloudflareCallsApiTokenSet: !!meta.cloudflareCallsApiToken,
			};
		});
	}
}
