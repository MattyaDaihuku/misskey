/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddCloudflareRealtimeColumns1752200100000 {
    name = 'AddCloudflareRealtimeColumns1752200100000'

    async up(queryRunner) {
        // Cloudflare Realtimeカラムの存在を確認して追加
        const hasAppId = await queryRunner.hasColumn('meta', 'cloudflareRealtimeAppId');
        if (!hasAppId) {
            await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflareRealtimeAppId" character varying(128)`);
        }

        const hasToken = await queryRunner.hasColumn('meta', 'cloudflareRealtimeToken');
        if (!hasToken) {
            await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflareRealtimeToken" character varying(256)`);
        }
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "cloudflareRealtimeToken"`);
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "cloudflareRealtimeAppId"`);
    }
}
