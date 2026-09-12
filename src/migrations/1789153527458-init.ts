import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1789153527458 implements MigrationInterface {
    name = 'Init1789153527458'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" BIGSERIAL NOT NULL, "email" text NOT NULL, "username" text NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "CHK_e24de577e129075c77f23e1f95" CHECK (email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$' AND length(email) <= 254), CONSTRAINT "CHK_c91aa7c9838f913ea2f22d6988" CHECK (username ~ '^[a-zA-Z0-9_-]+$' AND length(username) <= 32 AND length(username) >= 3), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."converted_versions_format_enum" AS ENUM('jpeg', 'png', 'webp', 'gif', 'avif', 'svg')`);
        await queryRunner.query(`CREATE TABLE "converted_versions" ("id" BIGSERIAL NOT NULL, "format" "public"."converted_versions_format_enum" NOT NULL, "size" bigint NOT NULL, "storage_url" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "source_image_id" bigint NOT NULL, CONSTRAINT "UQ_107c02fe756259e5de817885f2d" UNIQUE ("storage_url"), CONSTRAINT "REL_3dce3a62719a7625042e3dd49a" UNIQUE ("source_image_id"), CONSTRAINT "CHK_99c6d01b0b0227086233614c38" CHECK (size > 0), CONSTRAINT "CHK_5ded2756861f65429c3ded7a23" CHECK (storage_url ~ '^https?://'), CONSTRAINT "PK_a777a94d1a460f948b417042fc5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."source_images_format_enum" AS ENUM('jpeg', 'png', 'webp', 'gif', 'avif', 'svg')`);
        await queryRunner.query(`CREATE TABLE "source_images" ("id" BIGSERIAL NOT NULL, "format" "public"."source_images_format_enum" NOT NULL, "original_name" text NOT NULL, "size" bigint NOT NULL, "storage_url" text NOT NULL, "conversion_error" text, "conversion_id" bigint NOT NULL, CONSTRAINT "UQ_9af387bc6de7e130037fee627b3" UNIQUE ("storage_url"), CONSTRAINT "CHK_0723065a265a51c76a698b395c" CHECK (length(original_name) <= 255 AND length(original_name) >= 1), CONSTRAINT "CHK_2a9115a1333bff8fe34bf43d00" CHECK (size > 0), CONSTRAINT "CHK_f1d5bfba2533fb521cbaa87527" CHECK (storage_url ~ '^https?://'), CONSTRAINT "PK_4a25412e5773fbee326a2f80c21" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_source_images_conversion_id" ON "source_images" ("conversion_id") `);
        await queryRunner.query(`CREATE TYPE "public"."conversions_destination_format_enum" AS ENUM('jpeg', 'png', 'webp', 'gif', 'avif', 'svg')`);
        await queryRunner.query(`CREATE TYPE "public"."conversions_status_enum" AS ENUM('pending', 'completed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "conversions" ("id" BIGSERIAL NOT NULL, "destination_format" "public"."conversions_destination_format_enum" NOT NULL, "status" "public"."conversions_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" bigint NOT NULL, CONSTRAINT "PK_4af8c6388f42a1849ee9b22fa16" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_failed_conversions" ON "conversions" ("created_at") WHERE status = 'failed'`);
        await queryRunner.query(`CREATE INDEX "idx_conversions_user_id" ON "conversions" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "converted_versions" ADD CONSTRAINT "FK_3dce3a62719a7625042e3dd49a6" FOREIGN KEY ("source_image_id") REFERENCES "source_images"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "source_images" ADD CONSTRAINT "FK_e12d0831fea8cef934cd3120acd" FOREIGN KEY ("conversion_id") REFERENCES "conversions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversions" ADD CONSTRAINT "FK_786efb8f341df6c583e71b273f3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversions" DROP CONSTRAINT "FK_786efb8f341df6c583e71b273f3"`);
        await queryRunner.query(`ALTER TABLE "source_images" DROP CONSTRAINT "FK_e12d0831fea8cef934cd3120acd"`);
        await queryRunner.query(`ALTER TABLE "converted_versions" DROP CONSTRAINT "FK_3dce3a62719a7625042e3dd49a6"`);
        await queryRunner.query(`DROP INDEX "public"."idx_conversions_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_failed_conversions"`);
        await queryRunner.query(`DROP TABLE "conversions"`);
        await queryRunner.query(`DROP TYPE "public"."conversions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."conversions_destination_format_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_source_images_conversion_id"`);
        await queryRunner.query(`DROP TABLE "source_images"`);
        await queryRunner.query(`DROP TYPE "public"."source_images_format_enum"`);
        await queryRunner.query(`DROP TABLE "converted_versions"`);
        await queryRunner.query(`DROP TYPE "public"."converted_versions_format_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
