import {MigrationInterface, QueryRunner} from "typeorm";

export class AddRectifyingInvoices1790677970688 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f494ce6746b91e9ec9562af485"`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "type" character varying NOT NULL DEFAULT 'ORDINARY'`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "rectifiedInvoiceNumber" character varying`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "rectifiedInvoiceDate" TIMESTAMP`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "reason" text`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "fiscalRegistration" text`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "rectifiesInvoiceId" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "refundId" integer`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_f494ce6746b91e9ec9562af485" ON "invoice" ("orderId") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5e70265a1a2bd42315d4382aa3" ON "invoice" ("refundId") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_invoice_order_ordinary" ON "invoice" ("orderId") WHERE "type" = 'ORDINARY'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_invoice_order_ordinary"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e70265a1a2bd42315d4382aa3"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_f494ce6746b91e9ec9562af485"`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "refundId"`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "rectifiesInvoiceId"`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "fiscalRegistration"`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "reason"`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "rectifiedInvoiceDate"`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "rectifiedInvoiceNumber"`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "type"`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f494ce6746b91e9ec9562af485" ON "invoice" ("orderId") `, undefined);
   }

}
