import {MigrationInterface, QueryRunner} from "typeorm";

export class AddProductFoodInformation1790677439821 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsFoodingredients" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsFoodallergens" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsFoodnutrition" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsFooddirections" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsFoodwarnings" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsFoodstorage" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" ADD "customFieldsFoodorigin" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsIsfoodsupplement" boolean NOT NULL DEFAULT true`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsFoodoperator" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant_translation" ADD "customFieldsNetquantity" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant_translation" DROP COLUMN "customFieldsNetquantity"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsFoodoperator"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsIsfoodsupplement"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsFoodorigin"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsFoodstorage"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsFoodwarnings"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsFooddirections"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsFoodnutrition"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsFoodallergens"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_translation" DROP COLUMN "customFieldsFoodingredients"`, undefined);
   }

}
