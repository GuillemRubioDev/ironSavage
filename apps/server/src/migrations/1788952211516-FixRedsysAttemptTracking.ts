import {MigrationInterface, QueryRunner} from "typeorm";

export class FixRedsysAttemptTracking1788952211516 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_44352b71e16a13307334708934"`, undefined);
        await queryRunner.query(`CREATE TABLE "redsys_payment_attempt" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "merchantOrder" character varying NOT NULL, "orderCode" character varying NOT NULL, "id" SERIAL NOT NULL, CONSTRAINT "PK_7452257054e2f902eb75de4319b" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_840002a8c9f26bbcd95316e040" ON "redsys_payment_attempt" ("merchantOrder") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_3d69002cfebeeba7692262eabc" ON "redsys_payment_attempt" ("orderCode") `, undefined);
        // Added nullable + backfilled rather than NOT NULL directly: any row that
        // already exists predates this fix, when orderCode was itself what got
        // sent to Redsys as Ds_Merchant_Order — so it's also the correct
        // merchantOrder value for that row.
        await queryRunner.query(`ALTER TABLE "redsys_transaction" ADD "merchantOrder" character varying`, undefined);
        await queryRunner.query(`UPDATE "redsys_transaction" SET "merchantOrder" = "orderCode" WHERE "merchantOrder" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "redsys_transaction" ALTER COLUMN "merchantOrder" SET NOT NULL`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_555eb16f8deaf355bfd0db0bee" ON "redsys_transaction" ("merchantOrder") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_44352b71e16a13307334708934" ON "redsys_transaction" ("orderCode") `, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_44352b71e16a13307334708934"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_555eb16f8deaf355bfd0db0bee"`, undefined);
        await queryRunner.query(`ALTER TABLE "redsys_transaction" DROP COLUMN "merchantOrder"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d69002cfebeeba7692262eabc"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_840002a8c9f26bbcd95316e040"`, undefined);
        await queryRunner.query(`DROP TABLE "redsys_payment_attempt"`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_44352b71e16a13307334708934" ON "redsys_transaction" ("orderCode") `, undefined);
   }

}
