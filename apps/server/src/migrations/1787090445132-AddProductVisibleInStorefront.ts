import {MigrationInterface, QueryRunner} from "typeorm";

export class AddProductVisibleInStorefront1787090445132 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsVisibleinstorefront" boolean NOT NULL DEFAULT true`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsVisibleinstorefront"`, undefined);
   }

}
