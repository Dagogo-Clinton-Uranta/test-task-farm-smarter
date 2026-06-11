import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFarmTables20260610000000 implements MigrationInterface {
  name = 'CreateFarmTables20260610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS farms (
        id UUID DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        owner_id VARCHAR(255) NOT NULL,
        geometry geometry(Geometry, 4326) NOT NULL,
        crop_type VARCHAR(100) NOT NULL,
        area_hectares NUMERIC(14, 4) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT farms_pkey PRIMARY KEY (id),
        CONSTRAINT farms_geometry_type_check CHECK (GeometryType(geometry) IN ('POLYGON', 'MULTIPOLYGON'))
      )
    `);
    await queryRunner.query(`
      ALTER TABLE farms
      ALTER COLUMN geometry TYPE geometry(Geometry, 4326)
      USING ST_SetSRID(geometry, 4326)
    `);
    await queryRunner.query(`
      ALTER TABLE farms
      ADD COLUMN IF NOT EXISTS crop_type VARCHAR(100) NOT NULL DEFAULT 'unknown'
    `);
    await queryRunner.query(`
      ALTER TABLE farms
      ADD COLUMN IF NOT EXISTS area_hectares NUMERIC(14, 4)
    `);
    await queryRunner.query(`
      UPDATE farms
      SET area_hectares = ROUND((ST_Area(geometry::geography) / 10000)::numeric, 4)
      WHERE area_hectares IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE farms
      ALTER COLUMN area_hectares SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE farms
      ALTER COLUMN crop_type DROP DEFAULT
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'farms_geometry_type_check'
        ) THEN
          ALTER TABLE farms
          ADD CONSTRAINT farms_geometry_type_check
          CHECK (GeometryType(geometry) IN ('POLYGON', 'MULTIPOLYGON'));
        END IF;
      END;
      $$;
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS farms_owner_id_idx ON farms(owner_id)');
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS farms_geometry_gix ON farms USING GIST(geometry)'
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS farm_readings (
        id UUID DEFAULT gen_random_uuid(),
        farm_id UUID NOT NULL,
        sensor_id VARCHAR(255) NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL,
        metric VARCHAR(50) NOT NULL,
        value NUMERIC(10, 4) NOT NULL,
        unit VARCHAR(30) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT farm_readings_pkey PRIMARY KEY (id),
        CONSTRAINT farm_readings_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
        CONSTRAINT farm_readings_metric_check CHECK (metric IN ('soil_moisture', 'temperature', 'ndvi')),
        CONSTRAINT farm_readings_unit_check CHECK (
          (metric = 'soil_moisture' AND unit = 'm3/m3') OR
          (metric = 'temperature' AND unit = 'celsius') OR
          (metric = 'ndvi' AND unit = 'index')
        ),
        CONSTRAINT farm_readings_temperature_check CHECK (metric <> 'temperature' OR value < 50)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS farm_readings_farm_id_idx ON farm_readings(farm_id)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS farm_readings_sensor_id_idx ON farm_readings(sensor_id)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS farm_readings_recorded_at_idx ON farm_readings(recorded_at)'
    );
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query('DROP TRIGGER IF EXISTS set_farms_updated_at ON farms');
    await queryRunner.query(`
      CREATE TRIGGER set_farms_updated_at
      BEFORE UPDATE ON farms
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER IF EXISTS set_farms_updated_at ON farms');
    await queryRunner.query('DROP FUNCTION IF EXISTS set_updated_at');
    await queryRunner.query('DROP TABLE IF EXISTS farm_readings');
    await queryRunner.query('DROP TABLE IF EXISTS farms');
  }
}
