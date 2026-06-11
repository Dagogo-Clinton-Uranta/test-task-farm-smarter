import { EntityManager } from 'typeorm';
import { appDataSource } from '../config/database.js';
import {
  CreateFarmInput,
  FarmFeature,
  FarmFeatureCollection,
  FarmMetricSummary,
  FarmReadingInput,
  FarmReadingsSummary,
  FarmReadingsSummaryResponse,
  FarmResponse,
  FarmSearchInput,
  FarmGeometry,
  ReadingMetric,
  ReadingValidationError,
  UpdateFarmReadingsInput,
} from '../interfaces/farm.interface.js';
import { NotFoundError, ValidationError } from '../utils/error.util.js';

type FarmRow = {
  id: string;
  name: string;
  owner_id: string;
  geometry: string | FarmGeometry;
  crop_type: string;
  area_hectares: number | string;
  created_at: Date;
  updated_at: Date;
};

type GeometryValidationRow = {
  geometry_type: string;
  is_valid: boolean;
  invalid_reason: string;
};

type FarmMetricSummaryRow = {
  farm_exists: boolean;
  metric: ReadingMetric | null;
  min: number | string | null;
  max: number | string | null;
  mean: number | string | null;
  latest_value: number | string | null;
  reading_count: bigint | number | string | null;
};

const readingUnits: Record<ReadingMetric, string> = {
  soil_moisture: 'm3/m3',
  temperature: 'celsius',
  ndvi: 'index',
};

const nigeriaBounds = {
  minLat: 1,
  maxLat: 17,
  minLng: -1,
  maxLng: 18,
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseGeometry = (geometry: string | FarmGeometry): FarmGeometry => {
  if (typeof geometry === 'string') {
    return JSON.parse(geometry) as FarmGeometry;
  }

  return geometry;
};

const toFarmResponse = (row: FarmRow): FarmResponse => ({
  id: row.id,
  name: row.name,
  owner_id: row.owner_id,
  geometry: parseGeometry(row.geometry),
  properties: {
    crop_type: row.crop_type,
    area_ha: toNumber(row.area_hectares),
  },
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const toNumber = (value: number | string): number => Number(value);

const toFarmFeature = (row: FarmRow): FarmFeature => ({
  type: 'Feature',
  geometry: parseGeometry(row.geometry),
  properties: {
    id: row.id,
    name: row.name,
    owner_id: row.owner_id,
    crop_type: row.crop_type,
    area_ha: toNumber(row.area_hectares),
    created_at: row.created_at,
    updated_at: row.updated_at,
  },
});

const validateFarmSearchInput = ({ lat, lng, radius_km }: FarmSearchInput): void => {
  if (!Number.isFinite(lat)) {
    throw new ValidationError('lat must be a valid number');
  }

  if (!Number.isFinite(lng)) {
    throw new ValidationError('lng must be a valid number');
  }

  if (!Number.isFinite(radius_km) || radius_km <= 0) {
    throw new ValidationError('radius_km must be a positive number');
  }

  if (lat < nigeriaBounds.minLat || lat > nigeriaBounds.maxLat) {
    throw new ValidationError(
      `lat must be between ${nigeriaBounds.minLat} and ${nigeriaBounds.maxLat} for Nigeria search`
    );
  }

  if (lng < nigeriaBounds.minLng || lng > nigeriaBounds.maxLng) {
    throw new ValidationError(
      `lng must be between ${nigeriaBounds.minLng} and ${nigeriaBounds.maxLng} for Nigeria search`
    );
  }
};

export const createFarm = async (input: CreateFarmInput): Promise<FarmResponse> => {
  const geoJson = JSON.stringify(input.geometry);
  let validationRows: GeometryValidationRow[];

  try {
    validationRows = await appDataSource.query(
      `
      WITH input_geometry AS (
        SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS geometry
      )
      SELECT
        GeometryType(geometry) AS geometry_type,
        ST_IsValid(geometry) AS is_valid,
        ST_IsValidReason(geometry) AS invalid_reason
      FROM input_geometry
    `,
      [geoJson]
    );
  } catch {
    throw new ValidationError('geometry must be a valid GeoJSON Polygon or MultiPolygon');
  }

  const geometryValidation = validationRows[0];

  if (
    !geometryValidation ||
    !['POLYGON', 'MULTIPOLYGON'].includes(geometryValidation.geometry_type) ||
    !geometryValidation.is_valid
  ) {
    throw new ValidationError(
      `geometry must be a valid GeoJSON Polygon or MultiPolygon${
        geometryValidation?.invalid_reason ? `: ${geometryValidation.invalid_reason}` : ''
      }`
    );
  }

  const rows = await appDataSource.query(
    `
    WITH input_geometry AS (
      SELECT ST_SetSRID(ST_GeomFromGeoJSON($3), 4326) AS geometry
    )
    INSERT INTO farms (name, owner_id, geometry, crop_type, area_hectares)
    VALUES (
      $1,
      $2,
      (SELECT geometry FROM input_geometry),
      $4,
      ROUND(((SELECT ST_Area(geometry::geography) FROM input_geometry) / 10000)::numeric, 4)
    )
    RETURNING
      id,
      name,
      owner_id,
      ST_AsGeoJSON(geometry)::json AS geometry,
      crop_type,
      area_hectares,
      created_at,
      updated_at
  `,
    [input.name, input.owner_id, geoJson, input.properties.crop_type]
  );

  const row = rows[0];

  if (!row) {
    throw new Error('Failed to create farm');
  }

  return toFarmResponse(row);
};

export const getFarms = async (): Promise<FarmResponse[]> => {
  const rows = await appDataSource.query(`
    SELECT
      id,
      name,
      owner_id,
      ST_AsGeoJSON(geometry)::json AS geometry,
      crop_type,
      area_hectares,
      created_at,
      updated_at
    FROM farms
    ORDER BY created_at DESC
  `);

  return rows.map(toFarmResponse);
};

export const getFarmsWithinRadius = async (
  input: FarmSearchInput
): Promise<FarmFeatureCollection> => {
  validateFarmSearchInput(input);


  //PostGIS expects meters, so i convert input radius.
  const radiusMeters = input.radius_km * 1000;

  const rows = await appDataSource.query(
    `
    SELECT
      id,
      name,
      owner_id,
      ST_AsGeoJSON(geometry)::json AS geometry,
      crop_type,
      area_hectares,
      created_at,
      updated_at
    FROM farms
    WHERE ST_DWithin(
      geometry::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3
    )
    ORDER BY created_at DESC
  `,
    [input.lng, input.lat, radiusMeters]
  );

  return {
    type: 'FeatureCollection',
    features: rows.map(toFarmFeature),
  };
};

export const getFarmById = async (id: string): Promise<FarmResponse> => {
  const rows = await appDataSource.query(
    `
    SELECT
      id,
      name,
      owner_id,
      ST_AsGeoJSON(geometry)::json AS geometry,
      crop_type,
      area_hectares,
      created_at,
      updated_at
    FROM farms
    WHERE id = $1::uuid
    LIMIT 1
  `,
    [id]
  );

  if (!rows[0]) {
    throw new NotFoundError('Farm not found');
  }

  return toFarmResponse(rows[0]);
};


const validateFarmReadings = (readings: FarmReadingInput[]): ReadingValidationError[] => {
  const errors: ReadingValidationError[] = [];
  const batchDate = readings[0]?.recorded_at;
 //NOTES ON VALIDATION:

  //1.) NOTE:- (TRADEOFF -1)if i had more time, I would use POSTGRESQL
  //  to run the array of readings, and do the validation, 
  //  because it would handle larger data sets faster, but
  //  I decided to loop through an array and set all my validation conditions
  // I assumed there will be only 3 readings, temperature, soil moisture and ndvi
  // and the readings will be submitted on a daily basis, so I did not worry about performance too much,
  //  but if there were more readings, then it would be better to do the validation in the database, because it would be faster and more efficient.

  //2.)NOTE:- I am unsure if this is a valid validation so i did not set it as a condition -
  //  perhaps temparature, ndvi and soil moisture should all have the same recorded_at date,
  //  because they are usually recorded at the same time (MAYBE),
  //  but i am not sure if that is a valid assumption, so i left it as a warning in the code comments.
 
  //3.)  I also set a validation that temperature readings must
  //  be below 50 degrees celsius, because that is impossible 
  // in a farm setting, but again, I am not sure if that is a 
  // valid assumption, so I left it as a warning in the code comments.
  readings.forEach((reading, index) => {
    const readingErrors: string[] = [];
    const expectedUnit = readingUnits[reading.metric];

    if (!reading.sensor_id || typeof reading.sensor_id !== 'string') {
      readingErrors.push('sensor_id is required');
    }

    if (!reading.recorded_at || Number.isNaN(Date.parse(reading.recorded_at))) {
      readingErrors.push('recorded_at must be a valid date');
    }

    if (!expectedUnit) {
      readingErrors.push('metric must be soil_moisture, temperature, or ndvi');
    } else if (reading.unit !== expectedUnit) {
      readingErrors.push(`${reading.metric} readings must use ${expectedUnit}`);
    }

    if (typeof reading.value !== 'number' || Number.isNaN(reading.value)) {
      readingErrors.push('value must be a number');
    }

    // We reject temperatures of over 50 degree celsius because that is impossible.
    if (reading.metric === 'temperature' && reading.value >= 50) {
      readingErrors.push('temperature readings must be below 50 degrees celsius');
    }

    if (batchDate && reading.recorded_at !== batchDate) {
      readingErrors.push('all readings in a batch must use the same recorded_at date');
    }

    if (readingErrors.length > 0) {
      errors.push({ index, errors: readingErrors });
    }
  });

  return errors;
};

export const updateFarmReadingsById = async (
  farmIdParam: string,
  input: UpdateFarmReadingsInput
): Promise<FarmReadingsSummary> => {
  if (!uuidPattern.test(farmIdParam)) {
    throw new ValidationError('farm_id must be a valid UUID');
  }

  const rows = await appDataSource.query(
    `
    SELECT id
    FROM farms
    WHERE id = $1::uuid
    LIMIT 1
  `,
    [farmIdParam]
  );

  if (!rows[0]) {
    throw new NotFoundError('Farm not found');
  }

  const farmId = rows[0].id;

  if (!Array.isArray(input?.readings) || input.readings.length === 0) {
    throw new ValidationError('One or more readings failed validation', {
      total_received: 0,
      total_inserted: 0,
      errors: [{ index: -1, errors: ['readings must be a non-empty array'] }],
    });
  }

  const errors = validateFarmReadings(input.readings);

  if (errors.length > 0) {
    throw new ValidationError('One or more readings failed validation', {
      total_received: input.readings.length,
      total_inserted: 0,
      errors,
    });
  }

  await appDataSource.transaction(async (manager: EntityManager) => {
    const readings = input.readings.map((reading) => ({
      ...reading,
      farmId,
    }));

    const values = readings
      .map((_, index) => {
        const offset = index * 6;
        return `($${offset + 1}::uuid, $${offset + 2}, $${offset + 3}::timestamptz, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
      })
      .join(', ');
    const params = readings.flatMap((reading) => [
      reading.farmId,
      reading.sensor_id,
      reading.recorded_at,
      reading.metric,
      reading.value,
      reading.unit,
    ]);

    await manager.query(
      `
      INSERT INTO farm_readings (farm_id, sensor_id, recorded_at, metric, value, unit)
      VALUES ${values}
    `,
      params
    );
  });

  return {
    total_received: input.readings.length,
    total_inserted: input.readings.length,
    errors: [],
  };
};

export const getFarmReadingsSummaryById = async (
  farmIdParam: string
): Promise<FarmReadingsSummaryResponse> => {
  if (!uuidPattern.test(farmIdParam)) {
    throw new ValidationError('farm_id must be a valid UUID');
  }

  const farmRows = await appDataSource.query(
    `
    SELECT id
    FROM farms
    WHERE id = $1::uuid
    LIMIT 1
  `,
    [farmIdParam]
  );

  if (!farmRows[0]) {
    throw new NotFoundError('Farm not found');
  }

  const rows = await appDataSource.query(
    `
    WITH readings_window AS (
      SELECT
        fr.metric,
        fr.value,
        fr.recorded_at
      FROM farm_readings fr
      WHERE fr.farm_id = $1::uuid
        AND fr.recorded_at >= now() - interval '30 days'
    ),
    metric_stats AS (
      SELECT
        metric,
        MIN(value) AS min,
        MAX(value) AS max,
        AVG(value) AS mean,
        COUNT(*) AS reading_count
      FROM readings_window
      GROUP BY metric
    ),
    latest_readings AS (
      SELECT metric, value AS latest_value
      FROM (
        SELECT
          metric,
          value,
          ROW_NUMBER() OVER (PARTITION BY metric ORDER BY recorded_at DESC) AS row_number
        FROM readings_window
      ) ranked_readings
      WHERE row_number = 1
    )
    SELECT
      ms.metric,
      ms.min,
      ms.max,
      ms.mean,
      lr.latest_value,
      ms.reading_count
    FROM metric_stats ms
    INNER JOIN latest_readings lr ON lr.metric = ms.metric
  `,
    [farmIdParam]
  );

  const summary: FarmMetricSummary[] = [];

  for (const row of rows) {
    if (row.metric === null) {
      continue;
    }

    summary.push({
      metric: row.metric,
      min: toNumber(row.min!),
      max: toNumber(row.max!),
      mean: toNumber(row.mean!),
      latest_value: toNumber(row.latest_value!),
      reading_count: Number(row.reading_count),
    });
  }

  return {
    farm_id: farmIdParam,
    window_days: 30,
    summary,
  };
};



export const farmService = {
  createFarm,
  getFarms,
  getFarmsWithinRadius,
  getFarmById,
  updateFarmReadingsById,
  getFarmReadingsSummaryById,
 
};
