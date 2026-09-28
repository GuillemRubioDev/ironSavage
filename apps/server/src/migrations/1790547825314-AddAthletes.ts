import {MigrationInterface, QueryRunner} from "typeorm";

export class AddAthletes1790547825314 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "athlete_code" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "discountType" character varying NOT NULL DEFAULT 'PERCENTAGE', "discountValue" numeric(10,2) NOT NULL, "rewardType" character varying NOT NULL DEFAULT 'PERCENTAGE', "rewardValue" numeric(10,2) NOT NULL, "id" SERIAL NOT NULL, "athleteId" integer NOT NULL, "promotionId" integer, CONSTRAINT "CHK_athlete_code_values" CHECK ("discountValue" >= 0 AND "rewardValue" >= 0 AND ("discountType" <> 'PERCENTAGE' OR "discountValue" <= 100) AND ("rewardType" <> 'PERCENTAGE' OR "rewardValue" <= 100)), CONSTRAINT "CHK_athlete_code_types" CHECK ("discountType" IN ('PERCENTAGE', 'FIXED_AMOUNT') AND "rewardType" IN ('PERCENTAGE', 'FIXED_POINTS')), CONSTRAINT "CHK_athlete_code_canonical" CHECK ("code" = UPPER("code")), CONSTRAINT "PK_c7443ee20812477a799d5e07aa5" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_375b9c9cb8b13616f0e7e15995" ON "athlete_code" ("athleteId") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_01916cc3df403d0c14c36ca336" ON "athlete_code" ("code") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e67b0936aec9040beb9fc1a9ce" ON "athlete_code" ("promotionId") `, undefined);
        await queryRunner.query(`CREATE TABLE "athlete" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "enabled" boolean NOT NULL DEFAULT true, "notes" text, "id" SERIAL NOT NULL, "customerId" integer NOT NULL, CONSTRAINT "REL_e1ed565760ebd2d79b8b27382e" UNIQUE ("customerId"), CONSTRAINT "PK_8bf51e0689529ca963f10949596" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e1ed565760ebd2d79b8b27382e" ON "athlete" ("customerId") `, undefined);
        await queryRunner.query(`CREATE TABLE "athlete_reward_reversal" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "reason" character varying NOT NULL, "points" integer NOT NULL, "debitedPoints" integer NOT NULL, "note" character varying, "id" SERIAL NOT NULL, "rewardId" integer NOT NULL, "refundId" integer, "loyaltyTransactionId" integer, "administratorUserId" integer, CONSTRAINT "CHK_athlete_reward_reversal_reason" CHECK ("reason" IN ('ORDER_CANCELLED', 'REFUND', 'MANUAL')), CONSTRAINT "CHK_athlete_reward_reversal_points" CHECK ("points" > 0 AND "debitedPoints" >= 0 AND "debitedPoints" <= "points"), CONSTRAINT "PK_3c5f1fdd64993d0d8c0972f7a5c" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_2011a24f73312262eea19a4419" ON "athlete_reward_reversal" ("rewardId") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_athlete_reward_reversal_cancel" ON "athlete_reward_reversal" ("rewardId") WHERE "reason" = 'ORDER_CANCELLED'`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_athlete_reward_reversal_refund" ON "athlete_reward_reversal" ("rewardId", "refundId") WHERE "refundId" IS NOT NULL`, undefined);
        await queryRunner.query(`CREATE TABLE "athlete_reward" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "orderCode" character varying NOT NULL, "baseAmount" integer NOT NULL, "customerDiscountAmount" integer NOT NULL DEFAULT '0', "currencyCode" character varying(3) NOT NULL, "discountType" character varying NOT NULL, "discountValue" numeric(10,2) NOT NULL, "rewardType" character varying NOT NULL, "rewardValue" numeric(10,2) NOT NULL, "pointValueInCents" integer NOT NULL, "points" integer NOT NULL, "revertedPoints" integer NOT NULL DEFAULT '0', "unrecoveredPoints" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'ACTIVE', "id" SERIAL NOT NULL, "athleteId" integer NOT NULL, "athleteCodeId" integer, "orderId" integer NOT NULL, "customerId" integer, "loyaltyTransactionId" integer, CONSTRAINT "CHK_athlete_reward_status" CHECK ("status" IN ('ACTIVE', 'PARTIALLY_REVERTED', 'REVERTED')), CONSTRAINT "CHK_athlete_reward_points" CHECK ("points" >= 0 AND "revertedPoints" >= 0 AND "revertedPoints" <= "points" AND "unrecoveredPoints" >= 0 AND "unrecoveredPoints" <= "revertedPoints"), CONSTRAINT "PK_16f495e77e645b65252c61578e9" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_cfdf65f7b9a698a8afb433f028" ON "athlete_reward" ("athleteId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_e5d4aa2a4957a318a2eb367fc8" ON "athlete_reward" ("athleteCodeId") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2c8927ce1ca1c1a58fa7467cd7" ON "athlete_reward" ("orderId") `, undefined);
        await queryRunner.query(`ALTER TABLE "athlete_code" ADD CONSTRAINT "FK_375b9c9cb8b13616f0e7e15995f" FOREIGN KEY ("athleteId") REFERENCES "athlete"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "athlete_code" ADD CONSTRAINT "FK_e67b0936aec9040beb9fc1a9ce4" FOREIGN KEY ("promotionId") REFERENCES "promotion"("id") ON DELETE SET NULL ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "athlete" ADD CONSTRAINT "FK_e1ed565760ebd2d79b8b27382e8" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "athlete_reward_reversal" ADD CONSTRAINT "FK_2011a24f73312262eea19a4419b" FOREIGN KEY ("rewardId") REFERENCES "athlete_reward"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "athlete_reward" ADD CONSTRAINT "FK_cfdf65f7b9a698a8afb433f028a" FOREIGN KEY ("athleteId") REFERENCES "athlete"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "athlete_reward" ADD CONSTRAINT "FK_e5d4aa2a4957a318a2eb367fc80" FOREIGN KEY ("athleteCodeId") REFERENCES "athlete_code"("id") ON DELETE SET NULL ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "athlete_reward" DROP CONSTRAINT "FK_e5d4aa2a4957a318a2eb367fc80"`, undefined);
        await queryRunner.query(`ALTER TABLE "athlete_reward" DROP CONSTRAINT "FK_cfdf65f7b9a698a8afb433f028a"`, undefined);
        await queryRunner.query(`ALTER TABLE "athlete_reward_reversal" DROP CONSTRAINT "FK_2011a24f73312262eea19a4419b"`, undefined);
        await queryRunner.query(`ALTER TABLE "athlete" DROP CONSTRAINT "FK_e1ed565760ebd2d79b8b27382e8"`, undefined);
        await queryRunner.query(`ALTER TABLE "athlete_code" DROP CONSTRAINT "FK_e67b0936aec9040beb9fc1a9ce4"`, undefined);
        await queryRunner.query(`ALTER TABLE "athlete_code" DROP CONSTRAINT "FK_375b9c9cb8b13616f0e7e15995f"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_2c8927ce1ca1c1a58fa7467cd7"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_e5d4aa2a4957a318a2eb367fc8"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_cfdf65f7b9a698a8afb433f028"`, undefined);
        await queryRunner.query(`DROP TABLE "athlete_reward"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_athlete_reward_reversal_refund"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_athlete_reward_reversal_cancel"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_2011a24f73312262eea19a4419"`, undefined);
        await queryRunner.query(`DROP TABLE "athlete_reward_reversal"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_e1ed565760ebd2d79b8b27382e"`, undefined);
        await queryRunner.query(`DROP TABLE "athlete"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_e67b0936aec9040beb9fc1a9ce"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_01916cc3df403d0c14c36ca336"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_375b9c9cb8b13616f0e7e15995"`, undefined);
        await queryRunner.query(`DROP TABLE "athlete_code"`, undefined);
   }

}
