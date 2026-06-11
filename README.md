# Farm Boundary API

TypeScript + Express API for storing farm boundary polygons and farm sensor readings in PostgreSQL/PostGIS. TypeORM is used for database setup and access, with raw SQL for PostGIS geometry operations where spatial functions are clearer and more direct.

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL
- PostGIS extension installed
- npm

### Installation

```bash
npm install
```

Create a `.env` file:

```env
NODE_ENV=development
PORT=8000
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE?schema=public"
CORS_ORIGIN=*
```

Run migrations:

```bash
npm run typeorm:migrate
```

Start the server:

```bash
npm run dev
```

The server runs on `http://localhost:8000` unless `PORT` is changed.

## API Routes

The farm routes are mounted at both `/api/farms` and `/api/v1/farms`. Prefer `/api/v1/farms` for new clients.

```txt
POST /api/v1/farms
GET  /api/v1/farms
GET  /api/v1/farms?lat={lat}&lng={lng}&radius_km={radius}
POST /api/v1/farms/:farm_id/readings
GET  /api/v1/farms/:farm_id/readings/summary
```

### Create Farm

```bash
curl -X POST http://localhost:8000/api/v1/farms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Adeyemi Farm",
    "owner_id": "usr_01HXZ",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [3.3792, 6.5244],
          [3.3801, 6.5244],
          [3.3801, 6.5252],
          [3.3792, 6.5252],
          [3.3792, 6.5244]
        ]
      ]
    },
    "properties": {
      "crop_type": "maize",
      "area_ha": 4.2
    }
  }'
```

`properties.area_ha` is not trusted or stored from the client. The API calculates the area in hectares server-side with PostGIS and returns that calculated value.

### List Farms

```bash
curl http://localhost:8000/api/v1/farms
```

### Search Farms Within A Radius

Returns a GeoJSON `FeatureCollection` of farms whose boundaries intersect a circle around the given point.

```bash
curl "http://localhost:8000/api/v1/farms?lat=6.5244&lng=3.3792&radius_km=5"
```

The spatial search uses PostGIS `ST_DWithin` in the database. Latitude and longitude are validated against plausible Nigeria bounds with a small tolerance.

### Add Farm Readings

```bash
curl -X POST http://localhost:8000/api/v1/farms/45c37e29-72d1-43e7-a47a-8d9239aab888/readings \
  -H "Content-Type: application/json" \
  -d '{
    "readings": [
      {
        "sensor_id": "s_01",
        "recorded_at": "2024-11-01T08:00:00Z",
        "metric": "soil_moisture",
        "value": 0.34,
        "unit": "m3/m3"
      },
      {
        "sensor_id": "s_01",
        "recorded_at": "2024-11-01T08:00:00Z",
        "metric": "temperature",
        "value": 28.2,
        "unit": "celsius"
      },
      {
        "sensor_id": "s_01",
        "recorded_at": "2024-11-01T08:00:00Z",
        "metric": "ndvi",
        "value": 0.71,
        "unit": "index"
      }
    ]
  }'
```

### Get 30-Day Reading Summary

Returns per-metric `min`, `max`, `mean`, `latest_value`, and `reading_count` for readings recorded in the last 30 days.

```bash
curl http://localhost:8000/api/v1/farms/45c37e29-72d1-43e7-a47a-8d9239aab888/readings/summary
```

If the farm exists but has no readings for the last 30-days, the API returns an empty `summary` array with a clear message.

## Response Shape

Successful responses use this wrapper:

```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

Spatial farm searches return GeoJSON in `data`:

```json
{
  "success": true,
  "message": "Farms within radius retrieved successfully",
  "data": {
    "type": "FeatureCollection",
    "features": []
  }
}
```

## Database

The active tables are `farms` and `farm_readings`.

```sql
CREATE TABLE farms (
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

CREATE TABLE farm_readings (
  id UUID DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL,
  sensor_id VARCHAR(255) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  metric VARCHAR(50) NOT NULL,
  value NUMERIC(10, 4) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT farm_readings_pkey PRIMARY KEY (id),
  CONSTRAINT farm_readings_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);
```

The `geometry` column stores farm boundaries as PostGIS `geometry(Geometry, 4326)` with a check constraint that only allows Polygon or MultiPolygon values. A GiST index is created on this column to support spatial queries.

## Project Structure

```txt
src/
  app.ts
  index.ts
  config/
  controllers/
  entities/
  interfaces/
  migrations/
  middlewares/
  routes/
  services/
  tests/
  utils/
```

Services are where the bulk of database interactions take place, so we can more easily swap out service implementations while the controllers remain intact. This is another design feature aimed at more scalable code.

## Scripts

```bash
npm run dev              # Start dev server
npm run build            # Compile TypeScript
npm start                # Run compiled app
npm test                 # Run Jest tests
npm run typeorm:migrate  # Run TypeORM migrations
npm run typeorm:revert   # Revert the latest TypeORM migration

```

## shortcomings /tradeoffs

  1. This applies to the validateFarmReadings helper Function, for the updateFarmReadingsById service:
      If i had more time, I would use POSTGRESQL
    to run the array of readings, and do the validation, 
    because it would handle larger data sets faster, but
    I decided to loop through an array and set all my validation conditions
   I assumed there will be only 3 readings, temperature, soil moisture and ndvi
   and the readings will be submitted on a daily basis, so I did not worry about performance too much,
    but if there were more readings, then it would be better to do the validation in the database, because it would be faster and more efficient.

  2.NOTE:- I am unsure if this is a valid validation so i did not set it as a condition -
    perhaps temparature, ndvi and soil moisture should all have the same recorded_at date,
    because they are usually recorded at the same time (MAYBE),
    but i am not sure if that is a valid assumption, so i left it as a warning in the code comments.
 
  3.  I also set a validation that temperature readings must
    be below 50 degrees celsius, because that is impossible 
   in a farm setting, but again, I am not sure if that is a 
   valid assumption, so I left it as a warning in the code comments.


## Note

I added unit tests for each of the services that correspond to a specific route as a way of keeping focus on the end goal of each requirement. This is another way of ensuring the app is scalable, because unit tests remind developers of the end goal of a route or function even as the code grows and changes.
