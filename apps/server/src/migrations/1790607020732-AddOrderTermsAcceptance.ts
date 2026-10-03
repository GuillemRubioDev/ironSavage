import {MigrationInterface, QueryRunner} from "typeorm";

export class AddOrderTermsAcceptance1790607020732 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsTermsacceptedat" TIMESTAMP(6)`, undefined);
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsTermsversion" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsTermsversion"`, undefined);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsTermsacceptedat"`, undefined);
   }

}
