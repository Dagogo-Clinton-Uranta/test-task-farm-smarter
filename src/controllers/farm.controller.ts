import { NextFunction, Request, Response } from 'express';
import { farmService } from '../services/farm.service.js';
import { sendSuccess } from '../utils/response.util.js';

type FarmIdParams = {
  farm_id: string;
};

export const createFarm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const farm = await farmService.createFarm(req.body);
    sendSuccess(res, farm, 'Farm created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getFarms = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hasSpatialQuery =
      req.query.lat !== undefined ||
      req.query.lng !== undefined ||
      req.query.radius_km !== undefined;

    if (hasSpatialQuery) {
      const farms = await farmService.getFarmsWithinRadius({
        lat: Number(req.query.lat),
        lng: Number(req.query.lng),
        radius_km: Number(req.query.radius_km),
      });

      sendSuccess(res, farms, 'Farms within radius retrieved successfully');
      return;
    }

    const farms = await farmService.getFarms();
    sendSuccess(res, farms, 'Farms retrieved successfully');
  } catch (error) {
    next(error);
  }
};



export const updateFarmReadingsById = async (
  req: Request<FarmIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await farmService.updateFarmReadingsById(req.params.farm_id, req.body);
    sendSuccess(res, summary, 'Farm readings updated successfully');
  } catch (error) {
    next(error);
  }
};

export const getFarmReadingsSummaryById = async (
  req: Request<FarmIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await farmService.getFarmReadingsSummaryById(req.params.farm_id);
    const message =
      summary.summary.length === 0
        ? 'Farm exists but has no readings in the last 30 days'
        : 'Farm readings summary retrieved successfully';

    sendSuccess(res, summary, message);
  } catch (error) {
    next(error);
  }
};
