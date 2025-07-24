export class CreateVoiceChatRoom1743000000001 {
	name = 'CreateVoiceChatRoom1743000000001';

	async up(queryRunner) {
		await queryRunner.query(`CREATE TABLE "voice_chat_room" ("id" character varying(32) NOT NULL, "title" character varying(128) NOT NULL, "hostId" character varying(32) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endedAt" TIMESTAMP WITH TIME ZONE, "isActive" boolean NOT NULL DEFAULT true, "cloudflareRealtimeToken" character varying(1024), "participantIds" text NOT NULL DEFAULT '{}', "maxParticipants" integer NOT NULL DEFAULT 50, "settings" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_voice_chat_room_id" PRIMARY KEY ("id"))`);
		await queryRunner.query(`CREATE INDEX "IDX_voice_chat_room_hostId" ON "voice_chat_room" ("hostId") `);
		await queryRunner.query(`CREATE INDEX "IDX_voice_chat_room_createdAt" ON "voice_chat_room" ("createdAt") `);
		await queryRunner.query(`ALTER TABLE "voice_chat_room" ADD CONSTRAINT "FK_voice_chat_room_hostId" FOREIGN KEY ("hostId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "voice_chat_room" DROP CONSTRAINT "FK_voice_chat_room_hostId"`);
		await queryRunner.query(`DROP INDEX "IDX_voice_chat_room_createdAt"`);
		await queryRunner.query(`DROP INDEX "IDX_voice_chat_room_hostId"`);
		await queryRunner.query(`DROP TABLE "voice_chat_room"`);
	}
}
