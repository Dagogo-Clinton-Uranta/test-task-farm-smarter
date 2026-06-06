import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import { controlsService } from '../services/controls.service.js';
import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/response.util.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../utils/error.util.js';

import {  IControlsUpdateInterestRates,  IControlsUpdateCreditTiers, IControlsUpdateCreditCaps,IControlsInterestRates,  IControlsCreditTiers, IControlsCreditCaps } from '../interfaces/controls.interface.js';
import { createGetByIdHandler, createUpdateHandler, createExistsCheckHandler } from '../utils/crud.handlers.js';
import { createEntityWithUser } from '../utils/creation.handlers.js';

/**
 * Admin Controller
 * Handles all admin-related HTTP requests
 */




/**
 * Edit/Update controls - credit caps
 * PUT /api/controls/creditcaps/:id
 */

export const updateCreditCaps = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
   
    const controlId = req.params.id!;
    const updateData = req.body;

    console.log("credit caps id is-->",controlId)

    // Get existing farmer to verify ownership
    const existingControl = await controlsService.getControlsCreditCapsById(controlId);

    if (!existingControl) {
      throw new NotFoundError('Could not find Credit Caps');
    }


    const farmer = await controlsService.updateControlsCreditCapsById(controlId, updateData);

   

    sendSuccess(res, farmer, 'Credit Caps updated successfully');
  } catch (error) {
    next(error);
  }
};



/**
 * Edit/Update controls - credit tiers
 * PUT /api/controls/credittiers/:id
 */



export const updateCreditTiers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
   
    const controlId = req.params.id!;
    const updateData = req.body;

    console.log("credit tiers id is-->",controlId)

    // Get existing farmer to verify ownership
    const existingControl = await controlsService.getControlsCreditTiersById(controlId);

    if (!existingControl) {
      throw new NotFoundError('Could not find Credit Tiers');
    }


    const farmer = await controlsService.updateControlsCreditTiersById(controlId, updateData);

   

    sendSuccess(res, farmer, 'Credit Tiers updated successfully');
  } catch (error) {
    next(error);
  }
};




/**
 * Edit/Update controls - interest rates
 * PUT /api/controls/interestrates/:id
 */

export const updateInterestRates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
   
    const controlId = req.params.id!;
    const updateData = req.body;

    console.log("interest rates id is-->",controlId)

    console.log("UPDATE DATA is-->",updateData)

    // Get existing farmer to verify ownership
    const existingControl = await controlsService.getControlsInterestRatesById(controlId);

    if (!existingControl) {
      throw new NotFoundError('Could not find Interest Rates');
    }


    const farmer = await controlsService.updateControlsInterestRatesById(controlId, updateData);

   

    sendSuccess(res, farmer, 'Interest Rates updated successfully');
  } catch (error) {
    next(error);
  }
};







