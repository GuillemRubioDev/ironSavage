import {MigrationInterface, QueryRunner} from "typeorm";

export class AddInvoiceCustomerIdIndex1790279417029 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE INDEX "IDX_925aa26ea12c28a6adb614445e" ON "invoice" ("customerId") `, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_925aa26ea12c28a6adb614445e"`, undefined);
   }

}
