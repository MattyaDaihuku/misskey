/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddVoiceChat1752199300000 {
    name = 'AddVoiceChat1752199300000'

    async up(queryRunner) {
        // Cloudflare Calls設定をmetaテーブルに追加
        await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflareCallsAppId" character varying(128)`);
        await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflareCallsApiToken" character varying(256)`);

        // 音声チャットルームテーブル作成
        await queryRunner.query(`CREATE TABLE "voice_chat_room" (
            "id" character varying(32) NOT NULL,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "endedAt" TIMESTAMP WITH TIME ZONE,
            "title" character varying(100),
            "hostId" character varying(32) NOT NULL,
            "isActive" boolean NOT NULL DEFAULT true,
            "cloudflareCallsSessionToken" character varying(512),
            CONSTRAINT "PK_voice_chat_room" PRIMARY KEY ("id")
        )`);

        // 音声チャット参加者テーブル作成
        await queryRunner.query(`CREATE TABLE "voice_chat_participant" (
            "id" character varying(32) NOT NULL,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "updatedAt" TIMESTAMP WITH TIME ZONE,
            "roomId" character varying(32) NOT NULL,
            "userId" character varying(32) NOT NULL,
            "isMuted" boolean NOT NULL DEFAULT false,
            "isSpeaking" boolean NOT NULL DEFAULT false,
            CONSTRAINT "PK_voice_chat_participant" PRIMARY KEY ("id")
        )`);

        // インデックス作成
        await queryRunner.query(`CREATE INDEX "IDX_voice_chat_room_createdAt" ON "voice_chat_room" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_voice_chat_room_hostId" ON "voice_chat_room" ("hostId")`);
        await queryRunner.query(`CREATE INDEX "IDX_voice_chat_participant_createdAt" ON "voice_chat_participant" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_voice_chat_participant_roomId" ON "voice_chat_participant" ("roomId")`);
        await queryRunner.query(`CREATE INDEX "IDX_voice_chat_participant_userId" ON "voice_chat_participant" ("userId")`);

        // 外部キー制約追加
        await queryRunner.query(`ALTER TABLE "voice_chat_room" ADD CONSTRAINT "FK_voice_chat_room_hostId" FOREIGN KEY ("hostId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "voice_chat_participant" ADD CONSTRAINT "FK_voice_chat_participant_roomId" FOREIGN KEY ("roomId") REFERENCES "voice_chat_room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "voice_chat_participant" ADD CONSTRAINT "FK_voice_chat_participant_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // 一意制約追加（一つのルームに一人のユーザーは一度だけ参加可能）
        await queryRunner.query(`ALTER TABLE "voice_chat_participant" ADD CONSTRAINT "UQ_voice_chat_participant_room_user" UNIQUE ("roomId", "userId")`);
    }

    async down(queryRunner) {
        // 外部キー制約削除
        await queryRunner.query(`ALTER TABLE "voice_chat_participant" DROP CONSTRAINT "FK_voice_chat_participant_userId"`);
        await queryRunner.query(`ALTER TABLE "voice_chat_participant" DROP CONSTRAINT "FK_voice_chat_participant_roomId"`);
        await queryRunner.query(`ALTER TABLE "voice_chat_room" DROP CONSTRAINT "FK_voice_chat_room_hostId"`);

        // 一意制約削除
        await queryRunner.query(`ALTER TABLE "voice_chat_participant" DROP CONSTRAINT "UQ_voice_chat_participant_room_user"`);

        // インデックス削除
        await queryRunner.query(`DROP INDEX "IDX_voice_chat_participant_userId"`);
        await queryRunner.query(`DROP INDEX "IDX_voice_chat_participant_roomId"`);
        await queryRunner.query(`DROP INDEX "IDX_voice_chat_participant_createdAt"`);
        await queryRunner.query(`DROP INDEX "IDX_voice_chat_room_hostId"`);
        await queryRunner.query(`DROP INDEX "IDX_voice_chat_room_createdAt"`);

        // テーブル削除
        await queryRunner.query(`DROP TABLE "voice_chat_participant"`);
        await queryRunner.query(`DROP TABLE "voice_chat_room"`);

        // Metaテーブルから列削除
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "cloudflareCallsApiToken"`);
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "cloudflareCallsAppId"`);
    }
}
