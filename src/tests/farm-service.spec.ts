/// <reference types="jest" />

import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const queryMock = jest.fn();
const transactionMock = jest.fn();

//I am using unstable mock module, because jest was giving me errors when using jest.mock() to call the database module, because I am not using CommonJS. 

jest.unstable_mockModule('../config/database.js', () => ({
  appDataSource: {
    query: queryMock,
    transaction: transactionMock,
    initialize: jest.fn(),
    destroy: jest.fn(),
    isInitialized: false,
  },
}));

const { farmService } = await import('../services/farm.service.js');
const { createFarmSchema } = await import('../middlewares/validation.middleware.js');

describe('farmService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a farm from GeoJSON polygon input', async () => {
    const farm = {
      id: '45c37e29-72d1-43e7-a47a-8d9239aab888',
      name: 'Adeyemi Farm',
      owner_id: 'usr_01HXZ',
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [3.3792, 6.5244],
            [3.3801, 6.5244],
            [3.3801, 6.5252],
            [3.3792, 6.5252],
            [3.3792, 6.5244],
          ],
        ],
      },
      crop_type: 'maize',
      area_hectares: '0.8760',
      properties: {
        crop_type: 'maize',
        area_ha: 0.876,
      },
      created_at: new Date(),
      updated_at: new Date(),
    };

    queryMock
      .mockResolvedValueOnce([
        {
          geometry_type: 'POLYGON',
          is_valid: true,
          invalid_reason: 'Valid Geometry',
        },
      ] as never)
      .mockResolvedValueOnce([farm] as never);

    const result = await farmService.createFarm({
      name: farm.name,
      owner_id: farm.owner_id,
      geometry: farm.geometry,
      properties: {
        crop_type: 'maize',
        area_ha: 4.2,
      },
    });

    expect(result).toEqual({
      id: farm.id,
      name: farm.name,
      owner_id: farm.owner_id,
      geometry: farm.geometry,
      properties: {
        crop_type: 'maize',
        area_ha: 0.876,
      },
      created_at: farm.created_at,
      updated_at: farm.updated_at,
    });
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock.mock.calls[1]?.[1]).toEqual([
      farm.name,
      farm.owner_id,
      JSON.stringify(farm.geometry),
      'maize',
    ]);
  });

  it('creates a farm from GeoJSON multipolygon input', async () => {
    const geometry = {
      type: 'MultiPolygon' as const,
      coordinates: [
        [
          [
            [3.3792, 6.5244],
            [3.3801, 6.5244],
            [3.3801, 6.5252],
            [3.3792, 6.5252],
            [3.3792, 6.5244],
          ],
        ],
      ],
    };

    queryMock
      .mockResolvedValueOnce([
        {
          geometry_type: 'MULTIPOLYGON',
          is_valid: true,
          invalid_reason: 'Valid Geometry',
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: '45c37e29-72d1-43e7-a47a-8d9239aab888',
          name: 'Adeyemi Farm',
          owner_id: 'usr_01HXZ',
          geometry,
          crop_type: 'maize',
          area_hectares: '0.8760',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ] as never);

    const result = await farmService.createFarm({
      name: 'Adeyemi Farm',
      owner_id: 'usr_01HXZ',
      geometry,
      properties: {
        crop_type: 'maize',
        area_ha: 4.2,
      },
    });

    expect(result.geometry.type).toBe('MultiPolygon');
    expect(result.properties).toEqual({
      crop_type: 'maize',
      area_ha: 0.876,
    });
  });

  it('rejects invalid farm geometry before inserting', async () => {
    queryMock.mockResolvedValueOnce([
      {
        geometry_type: 'POLYGON',
        is_valid: false,
        invalid_reason: 'Self-intersection',
      },
    ] as never);

    await expect(
      farmService.createFarm({
        name: 'Adeyemi Farm',
        owner_id: 'usr_01HXZ',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [3.3792, 6.5244],
              [3.3801, 6.5244],
              [3.3792, 6.5252],
              [3.3801, 6.5252],
              [3.3792, 6.5244],
            ],
          ],
        },
        properties: {
          crop_type: 'maize',
          area_ha: 4.2,
        },
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'geometry must be a valid GeoJSON Polygon or MultiPolygon: Self-intersection',
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('returns farms within a radius as a GeoJSON FeatureCollection', async () => {
    const createdAt = new Date('2024-11-01T08:00:00Z');
    const updatedAt = new Date('2024-11-01T08:00:00Z');

    queryMock.mockResolvedValue([
      {
        id: '45c37e29-72d1-43e7-a47a-8d9239aab888',
        name: 'Adeyemi Farm',
        owner_id: 'usr_01HXZ',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [3.3792, 6.5244],
              [3.3801, 6.5244],
              [3.3801, 6.5252],
              [3.3792, 6.5252],
              [3.3792, 6.5244],
            ],
          ],
        },
        crop_type: 'maize',
        area_hectares: '0.8760',
        created_at: createdAt,
        updated_at: updatedAt,
      },
    ] as never);

    const result = await farmService.getFarmsWithinRadius({
      lat: 6.5244,
      lng: 3.3792,
      radius_km: 5,
    });

    expect(result).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [3.3792, 6.5244],
                [3.3801, 6.5244],
                [3.3801, 6.5252],
                [3.3792, 6.5252],
                [3.3792, 6.5244],
              ],
            ],
          },
          properties: {
            id: '45c37e29-72d1-43e7-a47a-8d9239aab888',
            name: 'Adeyemi Farm',
            owner_id: 'usr_01HXZ',
            crop_type: 'maize',
            area_ha: 0.876,
            created_at: createdAt,
            updated_at: updatedAt,
          },
        },
      ],
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  //NIGERIA IS BETWEEN 4 AND 14 DEGREES LATITUDE, SO 1 AND 17 REPRESENTS + OR - 3 DEGREES ERROR RANGE
  it('rejects farm radius searches outside of Nigeria latitude boundaries', async () => {
    await expect(
      farmService.getFarmsWithinRadius({
        lat: 30,
        lng: 3.3792,
        radius_km: 5,
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'lat must be between 1 and 17 for Nigeria search',
    });

    expect(queryMock).not.toHaveBeenCalled();
  });

  
  it('updates farm readings in one transaction', async () => {
    queryMock.mockResolvedValue([{ id: '45c37e29-72d1-43e7-a47a-8d9239aab888' }] as never);
    transactionMock.mockImplementation(async (callback: any) => {
      await callback({ query: queryMock });
    });

    const result = await farmService.updateFarmReadingsById('45c37e29-72d1-43e7-a47a-8d9239aab888', {
      readings: [
        {
          sensor_id: 's_01',
          recorded_at: '2024-11-01T08:00:00Z',
          metric: 'soil_moisture',
          value: 0.34,
          unit: 'm3/m3',
        },
        {
          sensor_id: 's_01',
          recorded_at: '2024-11-01T08:00:00Z',
          metric: 'temperature',
          value: 28.2,
          unit: 'celsius',
        },
        {
          sensor_id: 's_01',
          recorded_at: '2024-11-01T08:00:00Z',
          metric: 'ndvi',
          value: 0.71,
          unit: 'index',
        },
      ],
    });

    expect(result).toEqual({
      total_received: 3,
      total_inserted: 3,
      errors: [],
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it('rejects an invalid farm_id before querying the database', async () => {
    await expect(
      farmService.updateFarmReadingsById('not-a-uuid', {
        readings: [
          {
            sensor_id: 's_01',
            recorded_at: '2024-11-01T08:00:00Z',
            metric: 'soil_moisture',
            value: 0.34,
            unit: 'm3/m3',
          },
        ],
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'farm_id must be a valid UUID',
    });

    expect(queryMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rejects invalid readings before starting a transaction', async () => {
    queryMock.mockResolvedValue([{ id: '45c37e29-72d1-43e7-a47a-8d9239aab888' }] as never);

    await expect(
      farmService.updateFarmReadingsById('45c37e29-72d1-43e7-a47a-8d9239aab888', {
        readings: [
          {
            sensor_id: 's_01',
            recorded_at: '2024-11-01T08:00:00Z',
            metric: 'temperature',
            value: 51,
            unit: 'fahrenheit',
          },
        ],
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      details: {
        total_received: 1,
        total_inserted: 0,
        errors: [
          {
            index: 0,
            errors: [
              'temperature readings must use celsius',
              'temperature readings must be below 50 degrees celsius',
            ],
          },
        ],
      },
    });

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('returns 30-day farm readings summary rows from database aggregates', async () => {
    queryMock
      .mockResolvedValueOnce([{ id: '45c37e29-72d1-43e7-a47a-8d9239aab888' }] as never)
      .mockResolvedValueOnce([
        {
          metric: 'temperature',
          min: '23.1000',
          max: '31.5000',
          mean: '27.3000',
          latest_value: '29.8000',
          reading_count: BigInt(4),
        },
        {
          metric: 'ndvi',
          min: '0.6100',
          max: '0.7900',
          mean: '0.7000',
          latest_value: '0.7500',
          reading_count: BigInt(3),
        },
      ] as never);

    const result = await farmService.getFarmReadingsSummaryById(
      '45c37e29-72d1-43e7-a47a-8d9239aab888'
    );

    expect(result).toEqual({
      farm_id: '45c37e29-72d1-43e7-a47a-8d9239aab888',
      window_days: 30,
      summary: [
        {
          metric: 'temperature',
          min: 23.1,
          max: 31.5,
          mean: 27.3,
          latest_value: 29.8,
          reading_count: 4,
        },
        {
          metric: 'ndvi',
          min: 0.61,
          max: 0.79,
          mean: 0.7,
          latest_value: 0.75,
          reading_count: 3,
        },
      ],
    });
  });

  it('returns an empty summary when the farm has no readings in the window', async () => {
    queryMock
      .mockResolvedValueOnce([{ id: '45c37e29-72d1-43e7-a47a-8d9239aab888' }] as never)
      .mockResolvedValueOnce([] as never);

    const result = await farmService.getFarmReadingsSummaryById(
      '45c37e29-72d1-43e7-a47a-8d9239aab888'
    );

    expect(result).toEqual({
      farm_id: '45c37e29-72d1-43e7-a47a-8d9239aab888',
      window_days: 30,
      summary: [],
    });
  });

  it('returns 404 when fetching readings summary for a missing farm', async () => {
    queryMock.mockResolvedValueOnce([] as never);

    await expect(
      farmService.getFarmReadingsSummaryById('45c37e29-72d1-43e7-a47a-8d9239aab888')
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Farm not found',
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});

describe('createFarmSchema', () => {
  it('accepts polygon and multipolygon farm geometry with properties', () => {
    const basePayload = {
      name: 'Adeyemi Farm',
      owner_id: 'usr_01HXZ',
      properties: {
        crop_type: 'maize',
        area_ha: 4.2,
      },
    };

    const polygonResult = createFarmSchema.validate({
      ...basePayload,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [3.3792, 6.5244],
            [3.3801, 6.5244],
            [3.3801, 6.5252],
            [3.3792, 6.5252],
            [3.3792, 6.5244],
          ],
        ],
      },
    });

    const multiPolygonResult = createFarmSchema.validate({
      ...basePayload,
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [3.3792, 6.5244],
              [3.3801, 6.5244],
              [3.3801, 6.5252],
              [3.3792, 6.5252],
              [3.3792, 6.5244],
            ],
          ],
        ],
      },
    });

    expect(polygonResult.error).toBeUndefined();
    expect(multiPolygonResult.error).toBeUndefined();
  });

  it('rejects non-polygon farm geometry', () => {
    const result = createFarmSchema.validate({
      name: 'Adeyemi Farm',
      owner_id: 'usr_01HXZ',
      geometry: {
        type: 'LineString',
        coordinates: [
          [3.3792, 6.5244],
          [3.3801, 6.5244],
        ],
      },
      properties: {
        crop_type: 'maize',
        area_ha: 4.2,
      },
    });

    expect(result.error?.details[0]?.message).toBe('geometry.type must be Polygon or MultiPolygon');
  });
});
