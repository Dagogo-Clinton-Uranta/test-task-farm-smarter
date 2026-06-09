import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import farmRoutes from './routes/farm.routes.js';

const app: Application = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: false,
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/farms', farmRoutes);
app.use('/api/v1/farms', farmRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
