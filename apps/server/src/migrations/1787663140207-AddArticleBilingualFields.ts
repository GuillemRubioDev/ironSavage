import {MigrationInterface, QueryRunner} from "typeorm";

export class AddArticleBilingualFields1787663140207 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        // Las filas existentes eran solo contenido de prueba: borrarlas evita violar el
        // NOT NULL al añadir las nuevas columnas bilingües de abajo.
        await queryRunner.query(`DELETE FROM "content_article"`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" DROP COLUMN "title"`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" DROP COLUMN "excerpt"`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" DROP COLUMN "content"`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" ADD "titleEs" character varying NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" ADD "titleEn" character varying NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" ADD "excerptEs" text NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" ADD "excerptEn" text NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" ADD "contentEs" text NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" ADD "contentEn" text NOT NULL`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "content_article" DROP COLUMN "contentEn"`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" DROP COLUMN "contentEs"`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" DROP COLUMN "excerptEn"`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" DROP COLUMN "excerptEs"`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" DROP COLUMN "titleEn"`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" DROP COLUMN "titleEs"`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" ADD "content" text NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" ADD "excerpt" text NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "content_article" ADD "title" character varying NOT NULL`, undefined);
   }

}
