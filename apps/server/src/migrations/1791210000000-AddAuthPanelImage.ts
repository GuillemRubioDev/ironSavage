import {MigrationInterface, QueryRunner} from "typeorm";

/**
 * Imagen configurable del panel de acceso de la tienda (GlobalSettings.authPanelImage,
 * relación con Asset). Solo añade columnas nulas y una clave foránea. Escrita a mano con
 * los mismos nombres que genera TypeORM:
 * - columna = "customFields" + titleCase("authPanelImageId");
 * - clave = "FK_" + sha1("global_settings_customFieldsAuthpanelimageid") recortado a 27;
 * - como GlobalSettings solo tiene campos de tipo relación, Vendure registra además la
 *   columna booleana auxiliar "__fix_relational_custom_fields__"
 *   (register-custom-entity-fields.js); sin ella el servidor no arranca.
 */
export class AddAuthPanelImage1791210000000 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFields__fix_relational_custom_fields__" boolean`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "global_settings"."customFields__fix_relational_custom_fields__" IS 'A work-around needed when only relational custom fields are defined on an entity'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsAuthpanelimageid" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD CONSTRAINT "FK_18de4e503601e8016ac0367b183" FOREIGN KEY ("customFieldsAuthpanelimageid") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" DROP CONSTRAINT "FK_18de4e503601e8016ac0367b183"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsAuthpanelimageid"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFields__fix_relational_custom_fields__"`, undefined);
   }

}
