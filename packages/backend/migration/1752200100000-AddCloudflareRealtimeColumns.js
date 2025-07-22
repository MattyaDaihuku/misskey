/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddCloudflareRealtimeColumns1752200100000 {
    name = 'AddCloudflareRealtimeColumns1752200100000'

    async up(queryRunner) {
        // Cloudflare Realtimeカラムの存在を確認して追加
        const hasAppId = await queryRunner.hasColumn('meta', 'cloudflare_realtime_app_id');
        if (!hasAppId) {
            await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflare_realtime_app_id" character varying(128)`);
        }

        const hasToken = await queryRunner.hasColumn('meta', 'cloudflare_realtime_token');
        if (!hasToken) {
            await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflare_realtime_token" character varying(256)`);
        }
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "cloudflare_realtime_token"`);
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "cloudflare_realtime_app_id"`);
    }
}
