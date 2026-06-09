export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

export interface CreateFarmInput {
  name: string;
  owner_id: string;
  geometry: GeoJsonPolygon;
}

export interface FarmResponse {
  id: string;
  name: string;
  owner_id: string;
  geometry: GeoJsonPolygon;
  created_at: Date;
  updated_at: Date;
}

export interface FarmSearchInput {
  lat: number;
  lng: number;
  radius_km: number;
}

export interface FarmFeature {
  type: 'Feature';
  geometry: GeoJsonPolygon;
  properties: {
    id: string;
    name: string;
    owner_id: string;
    created_at: Date;
    updated_at: Date;
  };
}

export interface FarmFeatureCollection {
  type: 'FeatureCollection';
  features: FarmFeature[];
}

export type ReadingMetric = 'soil_moisture' | 'temperature' | 'ndvi';

export interface FarmReadingInput {
  sensor_id: string;
  recorded_at: string;
  metric: ReadingMetric;
  value: number;
  unit: string;
}

export interface UpdateFarmReadingsInput {
  readings: FarmReadingInput[];
}

export interface ReadingValidationError {
  index: number;
  errors: string[];
}

export interface FarmReadingsSummary {
  total_received: number;
  total_inserted: number;
  errors: ReadingValidationError[];
}

export interface FarmMetricSummary {
  metric: ReadingMetric;
  min: number;
  max: number;
  mean: number;
  latest_value: number;
  reading_count: number;
}

export interface FarmReadingsSummaryResponse {
  farm_id: string;
  window_days: number;
  summary: FarmMetricSummary[];
}
