import {MigrationInterface, QueryRunner} from "typeorm";

export class InvoiceLineImageAndResendableEmailLog1788964651145 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "invoice_line" ADD "imagePreview" character varying`, undefined);
        // Amplía el índice de deduplicación para que un «reenviar esta factura» manual
        // (tipo 'invoice-resend') nunca se descarte en silencio como «ya enviado», como sí
        // ocurre (correctamente) con un segundo envío automático de 'invoice-available';
        // ver el comentario de EmailLog. El diff de esquema de TypeORM no detecta un cambio
        // solo en el WHERE de un índice existente, así que esta parte está escrita a mano.
        await queryRunner.query(`DROP INDEX "public"."IDX_email_log_type_order_unique"`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_email_log_type_order_unique" ON "email_log" ("type", "orderId") WHERE "orderId" IS NOT NULL AND "success" = true AND "type" != 'invoice-resend'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_email_log_type_order_unique"`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_email_log_type_order_unique" ON "email_log" ("type", "orderId") WHERE "orderId" IS NOT NULL AND "success" = true`, undefined);
        await queryRunner.query(`ALTER TABLE "invoice_line" DROP COLUMN "imagePreview"`, undefined);
   }

}
