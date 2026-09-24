import {MigrationInterface, QueryRunner} from "typeorm";

export class InvoiceLineImageAndResendableEmailLog1788964651145 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "invoice_line" ADD "imagePreview" character varying`, undefined);
        // Widen the dedup index so a manual "resend this invoice" (type
        // 'invoice-resend') is never silently swallowed as "already sent" the
        // way a second automatic 'invoice-available' send correctly still is —
        // see EmailLog's doc comment. TypeORM's schema diff doesn't pick up a
        // WHERE-clause-only change to an existing index, so this half is
        // hand-written rather than generated.
        await queryRunner.query(`DROP INDEX "public"."IDX_email_log_type_order_unique"`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_email_log_type_order_unique" ON "email_log" ("type", "orderId") WHERE "orderId" IS NOT NULL AND "success" = true AND "type" != 'invoice-resend'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_email_log_type_order_unique"`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_email_log_type_order_unique" ON "email_log" ("type", "orderId") WHERE "orderId" IS NOT NULL AND "success" = true`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice_line" DROP COLUMN "imagePreview"`, undefined);
   }

}
