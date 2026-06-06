import mongoose from 'mongoose';
import { Admin } from '../models/admin.model.js';
import { Controls } from '../models/controls.model.js';
import { NotFoundError } from '../utils/error.util.js';
import { IAdmin, IAdminCreateInput, IAdminUpdateInput, IAdminWithDetails } from '../interfaces/admin.interface.js';
import { IControlsUpdateCreditCaps,IControlsUpdateCreditTiers, IControlsUpdateInterestRates,IControlsCreditTiers ,IControlsInterestRates ,IControlsCreditCaps } from '../interfaces/controls.interface.js';

/**
 * Admin Service
 * Handles all admin-related business logic including aggregation pipelines
 */

/**
 * Get base pipeline for admin aggregation
 * Includes user lookup and forms created by admin
 */
const getBaseAdminPipeline = (): any[] => {
  return [
    {
      $lookup: {
        from: 'userdbs',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $match: {
        'user.is_active': { $ne: false },
      },
    },
    { $unset: 'user.passWord' },
    { $unset: 'user.password' },
    { $unset: 'updatedAt' },
    { $unset: 'createdAt' },
  ];
};




/**
 * Get admin by user ID
 */
export const getAdminByUserId = async (userId: string): Promise<IAdmin | null> => {
  return await Admin.findOne({ user_id: userId });
};


/**
 * Get controls by ID
 */
export const getControlsCreditTiersById = async (id: string): Promise<IControlsCreditTiers | null> => {

  const objectId = new mongoose.Types.ObjectId(id);

 
  return await Controls.findById(objectId);

};


export const getControlsCreditCapsById = async (id: string): Promise<IControlsCreditCaps | null> => {


  
  const objectId = new mongoose.Types.ObjectId(id);

 
  return await Controls.findById(objectId);


};


export const getControlsInterestRatesById = async (id: string): Promise<IControlsInterestRates | null> => {

 // Convert string ID to MongoDB ObjectId
 const objectId = new mongoose.Types.ObjectId(id);



  return await Controls.findById(objectId)
};




export const updateControlsCreditCapsById = async (controlId: string, updateData: IControlsUpdateCreditCaps): Promise<IControlsCreditCaps> => {
 // Convert string ID to MongoDB ObjectId
 const objectId = new mongoose.Types.ObjectId(controlId);

 
  const control = await Controls.findById(objectId);

  if (!control) {
    throw new NotFoundError('control not found');
  }

  
  control.retailers = updateData.retailers;
  
  await control.save();

  console.log(
    'CONTROL AFTER ASSIGN',
    JSON.stringify(control, null, 2)
  );


  await control.save();
  return control as unknown as IControlsCreditCaps;
};


export const updateControlsCreditTiersById = async (controlId: string, updateData: IControlsUpdateCreditTiers): Promise<IControlsCreditTiers> => {
 

  const objectId = new mongoose.Types.ObjectId(controlId);

 
  const control = await Controls.findById(objectId);


  if (!control) {
    throw new NotFoundError('control not found');
  }

  control.farmers = updateData.farmers;
control.retailers = updateData.retailers;

await control.save();

  console.log(
    'CONTROL AFTER ASSIGN',
    JSON.stringify(control, null, 2)
  );

  await control.save();
  return control  as unknown as IControlsCreditTiers;
};



//export const updateControlsInterestRatesById = async (controlId: string, updateData: IControlsUpdateInterestRates): Promise<IControlsInterestRates> => {
//  const objectId = new mongoose.Types.ObjectId(controlId);
//
// 
//  const control = await Controls.findById(objectId);
//
//
//
//
//  if (!control) {
//    throw new NotFoundError('control not found');
//  }
//
//  Object.assign(control, updateData);
//  await control.save();
//  return control;
//};


export const updateControlsInterestRatesById = async (
  controlId: string, updateData: IControlsUpdateInterestRates
) => {

  const objectId =
    new mongoose.Types.ObjectId(controlId);

  const control =
    await Controls.findById(objectId);

  if (!control) {
    throw new NotFoundError(
      'control not found'
    );
  }

  control.farmers = updateData.farmers;
  control.retailers = updateData.retailers;

  console.log("CONTROL INTEREST--->",control)

await control.save();


console.log("CONTROL INTEREST IS NOW--->",control)

  /**
   * Ensure correct control type
   */

  if (control.name !== 'interest_rates') {
    throw new Error(
      'Control is not interest_rates'
    );
  }

  return control as unknown as IControlsInterestRates;
};



// Export service object
export const controlsService = {
 
  getControlsCreditTiersById,
  getControlsCreditCapsById,
  getControlsInterestRatesById,
  updateControlsInterestRatesById,
  updateControlsCreditTiersById,
  updateControlsCreditCapsById,

 
};
