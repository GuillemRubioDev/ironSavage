import {MigrationInterface, QueryRunner} from "typeorm";

export class AddBannerImageLayout1787665215223 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "banner" ADD "imageLayout" character varying NOT NULL DEFAULT 'background'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "banner" DROP COLUMN "imageLayout"`, undefined);
   }

}
