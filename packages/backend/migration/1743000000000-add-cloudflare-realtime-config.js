export class AddCloudflareRealtimeConfig1743000000000 {
	name = 'AddCloudflareRealtimeConfig1743000000000';

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflareRealtimeAppId" character varying(1024)`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflareRealtimeApiToken" character varying(1024)`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "cloudflareRealtimeApiToken"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "cloudflareRealtimeAppId"`);
	}
}
