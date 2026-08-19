import {MigrationInterface, QueryRunner} from "typeorm";

export class AddRedsysTransaction1787123132749 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "redsys_transaction" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orderCode" character varying NOT NULL, "responseCode" character varying NOT NULL, "approved" boolean NOT NULL, "authorisationCode" character varying, "rawResponse" text NOT NULL, "id" SERIAL NOT NULL, CONSTRAINT "PK_0a8b30fdc9932d234d1f9df30f5" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_44352b71e16a13307334708934" ON "redsys_transaction" ("orderCode") `, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_44352b71e16a13307334708934"`, undefined);
        await queryRunner.query(`DROP TABLE "redsys_transaction"`, undefined);
   }

}
