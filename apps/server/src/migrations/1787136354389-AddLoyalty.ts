import {MigrationInterface, QueryRunner} from "typeorm";

export class AddLoyalty1787136354389 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "loyalty_account" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "balance" integer NOT NULL DEFAULT '0', "lifetimeEarned" integer NOT NULL DEFAULT '0', "lifetimeSpent" integer NOT NULL DEFAULT '0', "id" SERIAL NOT NULL, "customerId" integer NOT NULL, CONSTRAINT "REL_b79050011bf71dd6971c7b3b83" UNIQUE ("customerId"), CONSTRAINT "PK_bd121d8ceceb2b6c13a013d6a1b" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b79050011bf71dd6971c7b3b83" ON "loyalty_account" ("customerId") `, undefined);
        await queryRunner.query(`CREATE TABLE "loyalty_transaction" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "type" character varying NOT NULL, "points" integer NOT NULL, "description" character varying NOT NULL, "id" SERIAL NOT NULL, "accountId" integer NOT NULL, "orderId" integer, CONSTRAINT "PK_bd11fc39ae5ebd6039fcb3cb1c5" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_52215ae97e507159d8c5fe33c4" ON "loyalty_transaction" ("accountId") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_loyalty_transaction_earn_per_order" ON "loyalty_transaction" ("orderId") WHERE "type" = 'EARN'`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_2f51e2d3c03cbfe3aecfcad3d5" ON "loyalty_transaction" ("orderId", "type") `, undefined);
        await queryRunner.query(`ALTER TABLE "loyalty_account" ADD CONSTRAINT "FK_b79050011bf71dd6971c7b3b837" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "FK_52215ae97e507159d8c5fe33c4d" FOREIGN KEY ("accountId") REFERENCES "loyalty_account"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "loyalty_transaction" DROP CONSTRAINT "FK_52215ae97e507159d8c5fe33c4d"`, undefined);
        await queryRunner.query(`ALTER TABLE "loyalty_account" DROP CONSTRAINT "FK_b79050011bf71dd6971c7b3b837"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_2f51e2d3c03cbfe3aecfcad3d5"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_loyalty_transaction_earn_per_order"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_52215ae97e507159d8c5fe33c4"`, undefined);
        await queryRunner.query(`DROP TABLE "loyalty_transaction"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_b79050011bf71dd6971c7b3b83"`, undefined);
        await queryRunner.query(`DROP TABLE "loyalty_account"`, undefined);
   }

}
