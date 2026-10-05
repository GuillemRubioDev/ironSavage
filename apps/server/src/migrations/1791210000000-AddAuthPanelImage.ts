import {MigrationInterface, QueryRunner} from "typeorm";

/**
 * Imagen configurable del panel de acceso de la tienda (GlobalSettings.authPanelImage,
 * relación con Asset). Solo añade una columna nula y su clave foránea. Nombres
 * idénticos a los que genera TypeORM: columna = "customFields" + titleCase(
 * "authPanelImageId"); clave = "FK_" + sha1("global_settings_customFieldsAuthpanelimageid")
 * recortado a 27 caracteres.
 */
export class AddAuthPanelImage1791210000000 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsAuthpanelimageid" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD CONSTRAINT "FK_18de4e503601e8016ac0367b183" FOREIGN KEY ("customFieldsAuthpanelimageid") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" DROP CONSTRAINT "FK_18de4e503601e8016ac0367b183"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsAuthpanelimageid"`, undefined);
   }

}
