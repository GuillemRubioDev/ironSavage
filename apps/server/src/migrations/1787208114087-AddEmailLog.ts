import {MigrationInterface, QueryRunner} from "typeorm";

export class AddEmailLog1787208114087 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "email_log" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "type" character varying NOT NULL, "recipient" character varying NOT NULL, "success" boolean NOT NULL, "error" text, "provider" character varying NOT NULL, "id" SERIAL NOT NULL, "orderId" integer, CONSTRAINT "PK_edfd3f7225051fc07bdd63a22dc" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_2b3abf5e2896e89d2c7423f733" ON "email_log" ("orderId") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_email_log_type_order_unique" ON "email_log" ("type", "orderId") WHERE "orderId" IS NOT NULL AND "success" = true`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_email_log_type_order_unique"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b3abf5e2896e89d2c7423f733"`, undefined);
        await queryRunner.query(`DROP TABLE "email_log"`, undefined);
   }

}
