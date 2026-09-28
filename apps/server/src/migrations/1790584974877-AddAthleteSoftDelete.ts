import {MigrationInterface, QueryRunner} from "typeorm";

export class AddAthleteSoftDelete1790584974877 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "athlete" ADD "deletedAt" TIMESTAMP`, undefined);

        // Data fix: an athlete can't outlive its customer. Vendure soft-deletes
        // customers, so athletes of customers deleted before this migration
        // were left active. Remove their role (same effect as the runtime
        // CustomerEvent handler) and stop their codes from giving discounts.
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
        // The data fix is intentionally not undone: it only disabled athletes
        // whose customer no longer exists.
        await queryRunner.query(`ALTER TABLE "athlete" DROP COLUMN "deletedAt"`, undefined);
   }

}
