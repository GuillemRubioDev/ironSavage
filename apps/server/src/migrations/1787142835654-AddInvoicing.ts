import {MigrationInterface, QueryRunner} from "typeorm";

export class AddInvoicing1787142835654 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "invoice" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orderCode" character varying NOT NULL, "series" character varying NOT NULL, "number" integer NOT NULL, "issueDate" TIMESTAMP NOT NULL, "customerSnapshot" text NOT NULL, "billingAddressSnapshot" text NOT NULL, "subtotal" integer NOT NULL, "tax" integer NOT NULL, "total" integer NOT NULL, "currencyCode" character varying NOT NULL DEFAULT 'EUR', "status" character varying NOT NULL DEFAULT 'ISSUED', "pdfPath" character varying, "id" SERIAL NOT NULL, "orderId" integer NOT NULL, "customerId" integer NOT NULL, CONSTRAINT "PK_15d25c200d9bcd8a33f698daf18" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f494ce6746b91e9ec9562af485" ON "invoice" ("orderId") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_invoice_series_number" ON "invoice" ("series", "number") `, undefined);
        await queryRunner.query(`CREATE TABLE "invoice_line" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "productName" character varying NOT NULL, "sku" character varying NOT NULL, "quantity" integer NOT NULL, "unitPrice" integer NOT NULL, "taxRate" double precision NOT NULL, "taxAmount" integer NOT NULL, "lineTotal" integer NOT NULL, "id" SERIAL NOT NULL, "invoiceId" integer NOT NULL, CONSTRAINT "PK_112d67e85951a56ee5123e9c803" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_d1abbe501a231d860de4e4eb59" ON "invoice_line" ("invoiceId") `, undefined);
        await queryRunner.query(`CREATE TABLE "invoice_sequence" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "series" character varying NOT NULL, "lastNumber" integer NOT NULL DEFAULT '0', "id" SERIAL NOT NULL, CONSTRAINT "PK_84f7d91bafa6be7dab251a3d20e" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_35f179dadff299ab5b6b129cab" ON "invoice_sequence" ("series") `, undefined);
        await queryRunner.query(`ALTER TABLE "invoice_line" ADD CONSTRAINT "FK_d1abbe501a231d860de4e4eb597" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "invoice_line" DROP CONSTRAINT "FK_d1abbe501a231d860de4e4eb597"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_35f179dadff299ab5b6b129cab"`, undefined);
        await queryRunner.query(`DROP TABLE "invoice_sequence"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_d1abbe501a231d860de4e4eb59"`, undefined);
        await queryRunner.query(`DROP TABLE "invoice_line"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_invoice_series_number"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_f494ce6746b91e9ec9562af485"`, undefined);
        await queryRunner.query(`DROP TABLE "invoice"`, undefined);
   }

}
