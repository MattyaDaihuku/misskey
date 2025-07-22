/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class FixCloudflareRealtimeColumnNames1752200300000 {
    name = 'FixCloudflareRealtimeColumnNames1752200300000'

    async up(queryRunner) {
        // 既存のキャメルケースのカラムを削除（存在する場合）
        const hasOldAppId = await queryRunner.hasColumn('meta', 'cloudflareRealtimeAppId');
        if (hasOldAppId) {
            await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "cloudflareRealtimeAppId"`);
        }

        const hasOldToken = await queryRunner.hasColumn('meta', 'cloudflareRealtimeToken');
        if (hasOldToken) {
            await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "cloudflareRealtimeToken"`);
        }

        // 正しいスネークケースのカラムを追加
        const hasNewAppId = await queryRunner.hasColumn('meta', 'cloudflare_realtime_app_id');
        if (!hasNewAppId) {
            await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflare_realtime_app_id" character varying(128)`);
        }

        const hasNewToken = await queryRunner.hasColumn('meta', 'cloudflare_realtime_token');
        if (!hasNewToken) {
            await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflare_realtime_token" character varying(256)`);
        }
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "cloudflare_realtime_token"`);
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "cloudflare_realtime_app_id"`);
    }
}
