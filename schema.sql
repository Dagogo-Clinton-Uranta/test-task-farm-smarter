CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
);

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
);

CREATE INDEX IF NOT EXISTS farms_owner_id_idx ON farms(owner_id);
CREATE INDEX IF NOT EXISTS farms_geometry_gix ON farms USING GIST(geometry);

CREATE INDEX IF NOT EXISTS farm_readings_farm_id_idx ON farm_readings(farm_id);
CREATE INDEX IF NOT EXISTS farm_readings_sensor_id_idx ON farm_readings(sensor_id);
CREATE INDEX IF NOT EXISTS farm_readings_recorded_at_idx ON farm_readings(recorded_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_farms_updated_at ON farms;

CREATE TRIGGER set_farms_updated_at
BEFORE UPDATE ON farms
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
