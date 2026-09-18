import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1789670603601 implements MigrationInterface {
    name = 'Init1789670603601'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."conversion_handlers_source_formats_enum" AS ENUM('jpeg', 'png', 'webp', 'gif', 'avif', 'svg')`);
        await queryRunner.query(`CREATE TYPE "public"."conversion_handlers_destination_formats_enum" AS ENUM('jpeg', 'png', 'webp', 'gif', 'avif', 'svg')`);
        await queryRunner.query(`CREATE TABLE "conversion_handlers" ("id" BIGSERIAL NOT NULL, "name" text NOT NULL, "source_formats" "public"."conversion_handlers_source_formats_enum" array NOT NULL, "destination_formats" "public"."conversion_handlers_destination_formats_enum" array NOT NULL, "pts_left" integer NOT NULL DEFAULT '10', CONSTRAINT "PK_36608e650bc496baceeb41e5332" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "pts_left" integer NOT NULL DEFAULT '10'`);
        await queryRunner.query(`ALTER TABLE "source_images" ADD "processed" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "source_images" ADD "worker" text`);
        await queryRunner.query(`CREATE INDEX "idx_pending_conversions" ON "conversions" ("created_at") WHERE status = 'pending'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_pending_conversions"`);
        await queryRunner.query(`ALTER TABLE "source_images" DROP COLUMN "worker"`);
        await queryRunner.query(`ALTER TABLE "source_images" DROP COLUMN "processed"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pts_left"`);
        await queryRunner.query(`DROP TABLE "conversion_handlers"`);
        await queryRunner.query(`DROP TYPE "public"."conversion_handlers_destination_formats_enum"`);
        await queryRunner.query(`DROP TYPE "public"."conversion_handlers_source_formats_enum"`);
    }

}
