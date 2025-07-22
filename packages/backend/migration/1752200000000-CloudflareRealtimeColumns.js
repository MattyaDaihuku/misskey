export class CloudflareRealtimeColumns1752200000000 {
	async up(queryRunner) {
		// カラムが存在する場合のみリネーム処理を実行
		const hasCallsAppId = await queryRunner.hasColumn('meta', 'cloudflareCallsAppId');
		if (hasCallsAppId) {
			await queryRunner.query(`ALTER TABLE "meta" RENAME COLUMN "cloudflareCallsAppId" TO "cloudflareRealtimeAppId"`);
		}
		
		const hasCallsToken = await queryRunner.hasColumn('meta', 'cloudflareCallsToken');
		if (hasCallsToken) {
			await queryRunner.query(`ALTER TABLE "meta" RENAME COLUMN "cloudflareCallsToken" TO "cloudflareRealtimeToken"`);
		}
	}

	async down(queryRunner) {
		const hasRealtimeAppId = await queryRunner.hasColumn('meta', 'cloudflareRealtimeAppId');
		if (hasRealtimeAppId) {
			await queryRunner.query(`ALTER TABLE "meta" RENAME COLUMN "cloudflareRealtimeAppId" TO "cloudflareCallsAppId"`);
		}
		
		const hasRealtimeToken = await queryRunner.hasColumn('meta', 'cloudflareRealtimeToken');
		if (hasRealtimeToken) {
			await queryRunner.query(`ALTER TABLE "meta" RENAME COLUMN "cloudflareRealtimeToken" TO "cloudflareCallsToken"`);
		}
	}
}
