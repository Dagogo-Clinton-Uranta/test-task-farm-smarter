/// <reference types="jest" />

import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const queryRawMock = jest.fn();
const executeRawMock = jest.fn();
const transactionMock = jest.fn();

jest.unstable_mockModule('../config/database.js', () => ({
  prisma: {
    $queryRaw: queryRawMock,
    $executeRaw: executeRawMock,
    $transaction: transactionMock,
  },
}));

const { farmService } = await import('../services/farm.service.js');

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
      created_at: new Date(),
      updated_at: new Date(),
    };

    queryRawMock.mockResolvedValue([farm] as never);

    const result = await farmService.createFarm({
      name: farm.name,
      owner_id: farm.owner_id,
      geometry: farm.geometry,
    });

    expect(result).toEqual(farm);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it('returns farms within a radius as a GeoJSON FeatureCollection', async () => {
    const createdAt = new Date('2024-11-01T08:00:00Z');
    const updatedAt = new Date('2024-11-01T08:00:00Z');

    queryRawMock.mockResolvedValue([
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
            created_at: createdAt,
            updated_at: updatedAt,
          },
        },
      ],
    });
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it('rejects farm radius searches outside plausible Nigeria latitude bounds', async () => {
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

    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it('updates farm readings in one transaction', async () => {
    queryRawMock.mockResolvedValue([{ id: '45c37e29-72d1-43e7-a47a-8d9239aab888' }] as never);
    transactionMock.mockImplementation(async (callback: any) => {
      await callback({ $executeRaw: executeRawMock });
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
    expect(executeRawMock).toHaveBeenCalledTimes(1);
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

    expect(queryRawMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rejects invalid readings before starting a transaction', async () => {
    queryRawMock.mockResolvedValue([{ id: '45c37e29-72d1-43e7-a47a-8d9239aab888' }] as never);

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
    queryRawMock.mockResolvedValue([
      {
        farm_exists: true,
        metric: 'temperature',
        min: '23.1000',
        max: '31.5000',
        mean: '27.3000',
        latest_value: '29.8000',
        reading_count: BigInt(4),
      },
      {
        farm_exists: true,
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
    queryRawMock.mockResolvedValue([
      {
        farm_exists: true,
        metric: null,
        min: null,
        max: null,
        mean: null,
        latest_value: null,
        reading_count: null,
      },
    ] as never);

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
    queryRawMock.mockResolvedValue([
      {
        farm_exists: false,
        metric: null,
        min: null,
        max: null,
        mean: null,
        latest_value: null,
        reading_count: null,
      },
    ] as never);

    await expect(
      farmService.getFarmReadingsSummaryById('45c37e29-72d1-43e7-a47a-8d9239aab888')
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Farm not found',
    });
  });
});
