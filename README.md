# Farm Boundary API

TypeScript + Express API for storing farm boundary polygons and farm sensor readings in PostgreSQL/PostGIS. Prisma is used for database access, with raw SQL for PostGIS geometry operations because Prisma does not natively model PostGIS geometry columns.

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL
- PostGIS extension installed
- npm

### Installation

```bash
npm install
npm run prisma:generate
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
npm run prisma:migrate
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
    }
  }'
```

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

If the farm exists but has no readings in the 30-day window, the API returns an empty `summary` array with a clear message.

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
  geometry geometry(Polygon, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT farms_pkey PRIMARY KEY (id)
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

The `geometry` column stores farm boundaries as PostGIS `geometry(Polygon, 4326)`. A GiST index is created on this column to support spatial queries.

## Project Structure

```txt
src/
  app.ts
  index.ts
  config/
  controllers/
  interfaces/
  middlewares/
  routes/
  services/
  tests/
  utils/
prisma/
  schema.prisma
  migrations/
```

## Scripts

```bash
npm run dev              # Start dev server
npm run build            # Compile TypeScript
npm start                # Run compiled app
npm test                 # Run Jest tests
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run Prisma migrations
```
