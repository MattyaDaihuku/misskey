export class CloudflareRealtimeColumns1752200000000 {
	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" RENAME COLUMN "cloudflareCallsAppId" TO "cloudflareRealtimeAppId"`);
		await queryRunner.query(`ALTER TABLE "meta" RENAME COLUMN "cloudflareCallsToken" TO "cloudflareRealtimeToken"`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" RENAME COLUMN "cloudflareRealtimeAppId" TO "cloudflareCallsAppId"`);
		await queryRunner.query(`ALTER TABLE "meta" RENAME COLUMN "cloudflareRealtimeToken" TO "cloudflareCallsToken"`);
	}
}
