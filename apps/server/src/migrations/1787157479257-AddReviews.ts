import {MigrationInterface, QueryRunner} from "typeorm";

export class AddReviews1787157479257 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "product_review" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "rating" integer NOT NULL, "title" character varying NOT NULL, "comment" text NOT NULL, "status" character varying NOT NULL DEFAULT 'PENDING', "id" SERIAL NOT NULL, "productId" integer NOT NULL, "customerId" integer NOT NULL, "orderId" integer NOT NULL, CONSTRAINT "PK_6c00bd3bbee662e1f7a97dbce9a" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_06e7335708b5e7870f1eaa608d" ON "product_review" ("productId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_73994c5bf5e1fa155b6f5237ea" ON "product_review" ("customerId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_fb12b4f7c7cf7728866222259d" ON "product_review" ("status") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_review_customer_product_order" ON "product_review" ("customerId", "productId", "orderId") `, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_review_customer_product_order"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_fb12b4f7c7cf7728866222259d"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_73994c5bf5e1fa155b6f5237ea"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_06e7335708b5e7870f1eaa608d"`, undefined);
        await queryRunner.query(`DROP TABLE "product_review"`, undefined);
   }

}
