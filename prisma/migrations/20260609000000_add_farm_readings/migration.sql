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

CREATE INDEX IF NOT EXISTS farm_readings_farm_id_idx ON farm_readings(farm_id);
CREATE INDEX IF NOT EXISTS farm_readings_sensor_id_idx ON farm_readings(sensor_id);
CREATE INDEX IF NOT EXISTS farm_readings_recorded_at_idx ON farm_readings(recorded_at);
