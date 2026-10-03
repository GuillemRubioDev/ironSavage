import {MigrationInterface, QueryRunner} from "typeorm";

export class AddAthleteSoftDelete1790584974877 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "athlete" ADD "deletedAt" TIMESTAMP`, undefined);

        // Corrección de datos: un atleta no puede sobrevivir a su cliente. Vendure borra
        // los clientes de forma lógica, así que los atletas de clientes borrados antes de
        // esta migración seguían activos. Se les quita el rol (igual que hace en tiempo de
        // ejecución el handler de CustomerEvent) y sus códigos dejan de dar descuento.
        await queryRunner.query(`
            UPDATE "promotion" p SET "deletedAt" = now(), "enabled" = false
            FROM "athlete_code" ac
            JOIN "athlete" a ON a."id" = ac."athleteId"
            JOIN "customer" c ON c."id" = a."customerId"
            WHERE p."id" = ac."promotionId" AND c."deletedAt" IS NOT NULL AND p."deletedAt" IS NULL`, undefined);
        await queryRunner.query(`
            UPDATE "athlete_code" ac SET "enabled" = false
            FROM "athlete" a
            JOIN "customer" c ON c."id" = a."customerId"
            WHERE a."id" = ac."athleteId" AND c."deletedAt" IS NOT NULL`, undefined);
        await queryRunner.query(`
            UPDATE "athlete" a SET "deletedAt" = c."deletedAt", "enabled" = false
            FROM "customer" c
            WHERE c."id" = a."customerId" AND c."deletedAt" IS NOT NULL`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        // La corrección de datos no se deshace a propósito: solo desactivó atletas cuyo
        // cliente ya no existe.
        await queryRunner.query(`ALTER TABLE "athlete" DROP COLUMN "deletedAt"`, undefined);
   }

}
