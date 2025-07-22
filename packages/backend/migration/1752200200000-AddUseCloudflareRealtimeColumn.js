/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddUseCloudflareRealtimeColumn1752200200000 {
    name = 'AddUseCloudflareRealtimeColumn1752200200000'

    async up(queryRunner) {
        // useCloudflareRealtimeカラムの存在を確認して追加
        const hasColumn = await queryRunner.hasColumn('meta', 'useCloudflareRealtime');
        if (!hasColumn) {
            await queryRunner.query(`ALTER TABLE "meta" ADD "useCloudflareRealtime" boolean NOT NULL DEFAULT false`);
        }
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "useCloudflareRealtime"`);
    }
}
