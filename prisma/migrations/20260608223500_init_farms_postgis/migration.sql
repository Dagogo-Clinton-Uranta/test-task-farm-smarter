CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS farms (
  id UUID DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  geometry geometry(Polygon, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT farms_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS farms_owner_id_idx ON farms(owner_id);
CREATE INDEX IF NOT EXISTS farms_geometry_gix ON farms USING GIST(geometry);

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
