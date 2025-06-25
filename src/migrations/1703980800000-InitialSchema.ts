import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1703980800000 implements MigrationInterface {
  name = 'InitialSchema1703980800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."prices_source_enum" AS ENUM('official_api', 'rapidapi', 'puppeteer')
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "brand" character varying(100) NOT NULL,
        "colorway" character varying(255) NOT NULL,
        "retail_price" numeric(10,2) NOT NULL,
        "current_price" numeric(10,2) NOT NULL,
        "discount_percentage" numeric(5,4) NOT NULL,
        "size" character varying(50),
        "sku" character varying(100),
        "image_url" text,
        "stockx_url" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "prices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "size" character varying(50),
        "source" "public"."prices_source_enum" NOT NULL DEFAULT 'rapidapi',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prices" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "prices"
      ADD CONSTRAINT "FK_prices_product_id"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_brand" ON "products" ("brand")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_discount_percentage" ON "products" ("discount_percentage")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_current_price" ON "products" ("current_price")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_prices_product_id" ON "prices" ("product_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_prices_created_at" ON "prices" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_prices_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_prices_product_id"`);
    await queryRunner.query(`DROP INDEX "IDX_products_current_price"`);
    await queryRunner.query(`DROP INDEX "IDX_products_discount_percentage"`);
    await queryRunner.query(`DROP INDEX "IDX_products_brand"`);
    await queryRunner.query(`ALTER TABLE "prices" DROP CONSTRAINT "FK_prices_product_id"`);
    await queryRunner.query(`DROP TABLE "prices"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TYPE "public"."prices_source_enum"`);
  }
}