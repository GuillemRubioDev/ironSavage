import {MigrationInterface, QueryRunner} from "typeorm";

export class AddBanners1787658395531 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "banner" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "titleEs" character varying NOT NULL, "titleEn" character varying NOT NULL, "subtitleEs" character varying, "subtitleEn" character varying, "ctaLabelEs" character varying NOT NULL, "ctaLabelEn" character varying NOT NULL, "href" character varying NOT NULL, "align" character varying NOT NULL DEFAULT 'left', "position" integer NOT NULL DEFAULT '0', "enabled" boolean NOT NULL DEFAULT true, "id" SERIAL NOT NULL, "imageId" integer, CONSTRAINT "PK_6d9e2570b3d85ba37b681cd4256" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`ALTER TABLE "banner" ADD CONSTRAINT "FK_6a6cc2453a0675d3e2cad3070c0" FOREIGN KEY ("imageId") REFERENCES "asset"("id") ON DELETE SET NULL ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "banner" DROP CONSTRAINT "FK_6a6cc2453a0675d3e2cad3070c0"`, undefined);
        await queryRunner.query(`DROP TABLE "banner"`, undefined);
   }

}
