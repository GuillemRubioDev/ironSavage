import {MigrationInterface, QueryRunner} from "typeorm";

export class AddContentArticles1787172648198 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "content_article" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "slug" character varying NOT NULL, "excerpt" text NOT NULL, "content" text NOT NULL, "status" character varying NOT NULL DEFAULT 'DRAFT', "publishedAt" TIMESTAMP, "id" SERIAL NOT NULL, "coverImageId" integer, CONSTRAINT "PK_4d2cf7ccbcc630b726c06e929e0" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_33d2df3377ccfbe80a48b0d818" ON "content_article" ("slug") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_9d46a6ac8b4cc5ca22600aad20" ON "content_article" ("status") `, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" ADD CONSTRAINT "FK_d8429142973f8cb554f8274889c" FOREIGN KEY ("coverImageId") REFERENCES "asset"("id") ON DELETE SET NULL ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "content_article" DROP CONSTRAINT "FK_d8429142973f8cb554f8274889c"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_9d46a6ac8b4cc5ca22600aad20"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_33d2df3377ccfbe80a48b0d818"`, undefined);
        await queryRunner.query(`DROP TABLE "content_article"`, undefined);
   }

}
