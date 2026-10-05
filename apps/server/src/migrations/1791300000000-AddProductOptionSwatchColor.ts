import {MigrationInterface, QueryRunner} from "typeorm";

// Color de muestra de las opciones de producto (ProductOption.customFields.swatchColor).
export class AddProductOptionSwatchColor1791300000000 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_option" ADD "customFieldsSwatchcolor" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_option" DROP COLUMN "customFieldsSwatchcolor"`, undefined);
   }

}
