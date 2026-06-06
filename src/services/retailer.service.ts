import mongoose from 'mongoose';
import { Retailer } from '../models/retailer.model.js';
import { User } from '../models/user.model.js';
import { RetailerProduct } from '../models/retailer-product.model.js';
import { IRetailer, IRetailerRegisterInput, IRetailerUpdateInput, IRetailerWithUser } from '../interfaces/retailer.interface.js';
import { logger } from '../utils/logger.js';
import { getUserByEmailWithPassword } from './user.service.js';
import { ConflictError, NotFoundError } from '../utils/error.util.js';

const deriveOnboardingProgress = (data: Partial<IRetailer>) => {
  const completedSteps: number[] = [];
  const hasStepOne = Boolean(
    data.firstName?.trim() &&
    data.lastName?.trim() &&
    data.phoneNumber?.trim() &&
    data.email?.trim() &&
    data.meansOfId?.trim() &&
    data.idNumber?.trim() &&
    data.idDocument
  );

  if (hasStepOne) {
    completedSteps.push(1);
  }

  const hasStepTwo = Boolean(
    hasStepOne &&
      data.hasBvn &&
      (data.hasBvn === 'no' || data.bvn?.trim()) &&
      data.hasBusinessBankAccount &&
      data.businessAccountType &&
      data.accountNumber?.trim() &&
      data.bankName?.trim()
  );

  if (hasStepTwo) {
    completedSteps.push(2);
  }

  const hasManualHomeAddress = Boolean(
    data.address?.trim() &&
      data.location?.trim() &&
      data.currentState?.trim() &&
      data.currentLocalGovernment?.trim() &&
      data.nearestLandmark?.trim()
  );

  const hasGpsHomeAddress = Boolean(data.gps?.trim());

  const hasStepThree = Boolean(
    hasStepTwo &&
      (
        (data.homeAddressMode === 'gps' && hasGpsHomeAddress) ||
        (data.homeAddressMode === 'manual' && hasManualHomeAddress)
      )
  );

  if (hasStepThree) {
    completedSteps.push(3);
  }

  const hasStepFour = Boolean(
    hasStepThree &&
      data.businessName?.trim() &&
      data.cacRegistered &&
      (data.cacRegistered === 'no' || data.cacRegistrationNumber?.trim()) &&
      data.yearsInBusiness?.trim() &&
      data.shopOwnership?.trim() &&
      data.shopSize?.trim() &&
      data.businessChannel?.trim()
  );

  if (hasStepFour) {
    completedSteps.push(4);
  }

  const hasManualBusinessLocation = Boolean(
    data.businessAddress?.trim() &&
      data.businessTown?.trim() &&
      data.state?.trim() &&
      data.localGovernment?.trim() &&
      data.businessNearestLandmark?.trim()
  );

  const hasGpsBusinessLocation = Boolean(data.businessGps?.trim());

  const hasStepFive = Boolean(
    hasStepFour &&
      (
        (data.businessAddressMode === 'gps' && hasGpsBusinessLocation) ||
        (data.businessAddressMode === 'manual' && hasManualBusinessLocation)
      )
  );

  if (hasStepFive) {
    completedSteps.push(5);
  }

  return {
    onboardingCompletedSteps: completedSteps,
    onboardingCurrentStep: hasStepFive ? 6 : hasStepFour ? 5 : hasStepThree ? 4 : hasStepTwo ? 3 : hasStepOne ? 2 : 1,
    onboardingStatus: completedSteps.length > 0 ? 'in_progress' : 'not_started',
  };
};

const withDerivedOnboardingProgress = <T extends Partial<IRetailer>>(data: T): T & {
  onboardingCompletedSteps: number[];
  onboardingCurrentStep: number;
  onboardingStatus: string;
} => {
  const derivedProgress = deriveOnboardingProgress(data);

  return {
    ...data,
    onboardingCompletedSteps:
      Array.isArray(data.onboardingCompletedSteps) && data.onboardingCompletedSteps.length > 0
        ? data.onboardingCompletedSteps
        : derivedProgress.onboardingCompletedSteps,
    onboardingCurrentStep:
      typeof data.onboardingCurrentStep === 'number'
        ? data.onboardingCurrentStep
        : derivedProgress.onboardingCurrentStep,
    onboardingStatus:
      typeof data.onboardingStatus === 'string' && data.onboardingStatus.length > 0
        ? data.onboardingStatus
        : derivedProgress.onboardingStatus,
  };
};

const withFinancialProgress = async <T extends Partial<IRetailer>>(data: T) => {
  const retailer = withDerivedOnboardingProgress(data);
  const retailerUserId = data.retailer_user_id?.toString();

  if (!retailerUserId) {
    return retailer;
  }

  const hasStepSix =
    retailer.onboardingCompletedSteps.includes(5) &&
    retailer.estimatedStockValue?.trim() &&
    retailer.estimatedRestockValue?.trim() &&
    retailer.restockingFrequency?.trim();

  if (!hasStepSix) {
    return retailer;
  }

  const withStepSix = {
    ...retailer,
    onboardingCompletedSteps: [...new Set([...retailer.onboardingCompletedSteps, 6])],
    onboardingCurrentStep: Math.max(retailer.onboardingCurrentStep, 7),
  };

  const hasStepSeven =
    withStepSix.onboardingCompletedSteps.includes(6) &&
    withStepSix.estimatedDailySalesRevenue?.trim() &&
    withStepSix.slowestDaySales?.trim() &&
    Array.isArray(withStepSix.paymentModes) &&
    withStepSix.paymentModes.length > 0 &&
    withStepSix.monthlyNetProfit?.trim() &&
    withStepSix.hasPosTerminal &&
    (withStepSix.hasPosTerminal === 'no' || withStepSix.posProviderName?.trim()) &&
    withStepSix.salesTrackingMethod?.trim();

  if (!hasStepSeven) {
    return withStepSix;
  }

  const withStepSeven = {
    ...withStepSix,
    onboardingCompletedSteps: [...new Set([...withStepSix.onboardingCompletedSteps, 7])],
    onboardingCurrentStep: Math.max(withStepSix.onboardingCurrentStep, 8),
  };

  const hasStepEight =
    withStepSeven.onboardingCompletedSteps.includes(7) &&
    withStepSeven.creditStartTimeline?.trim() &&
    withStepSeven.willingDailyRepayment &&
    withStepSeven.informationConfirmed === true;

  if (!hasStepEight) {
    return withStepSeven;
  }

  return {
    ...withStepSeven,
    onboardingCompletedSteps: [...new Set([...withStepSeven.onboardingCompletedSteps, 8])],
    onboardingCurrentStep: 8,
    onboardingStatus: 'completed',
  };
};

/**
 * Retailer Service
 * Handles all retailer-related business logic
 */

/**
 * Create a new retailer with associated user account
 */
export const createRetailerWithUser = async (
  input: IRetailerRegisterInput
): Promise<{ user: any; retailer: IRetailer }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create user first
    const user = new User({
      email: input.email.toLowerCase().trim(),
      passWord: input.passWord, // Will be hashed by pre-save hook
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phoneNumber,
      phoneNumber: input.phoneNumber,
      role: 'Retailer',
      isRetailer: true,
      is_active: false, // Will be activated after OTP verification
    });

    const savedUser = await user.save({ session });

    // Create retailer profile linked to user
    const retailer = new Retailer({
      retailer_user_id: savedUser._id,
      phoneNumber: input.phoneNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase().trim(),
      businessName: input.businessName,
      businessAddress: input.businessAddress,
      companyName: input.companyName,
      companyEmail: input.companyEmail,
      storeName: input.storeName,
      state: input.state,
      localGovernment: input.localGovernment,
      is_active: false,
    });

    const savedRetailer = await retailer.save({ session });

    await session.commitTransaction();

    logger.info('Retailer created successfully', {
      userId: savedUser._id.toString(),
      retailerId: savedRetailer._id.toString(),
      email: input.email,
    });

    return {
      user: savedUser.toJSON(),
      retailer: savedRetailer,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Activate retailer account after OTP verification
 */
export const activateRetailer = async (userId: string): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Activate user
    await User.findByIdAndUpdate(
      userId,
      { is_active: true },
      { session }
    );

    // Activate retailer
    await Retailer.findOneAndUpdate(
      { retailer_user_id: userId },
      { is_active: true },
      { session }
    );

    await session.commitTransaction();

    logger.info('Retailer activated', { userId });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get retailer by user ID
 */
export const getRetailerByUserId = async (userId: string): Promise<IRetailer | null> => {
  return await Retailer.findOne({ retailer_user_id: userId }).exec();
};

/**
 * Get retailer by ID
 */
export const getRetailerById = async (id: string): Promise<IRetailer | null> => {
  return await Retailer.findById(id).exec();
};

/**
 * Get retailer with populated user data
 */
export const getRetailerWithUser = async (userId: string): Promise<IRetailerWithUser | null> => {
  const pipeline = [
    {
      $match: {
        retailer_user_id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: 'userdbs',
        localField: 'retailer_user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unset: ['user.passWord', 'user.password', 'user.pin'],
    },
  ];

  const results = await Retailer.aggregate(pipeline);
  return results.length > 0 ? withFinancialProgress(results[0]) : null;
};

export const getRetailerByIdWithUser = async (retailerId: string): Promise<IRetailerWithUser | null> => {
  const pipeline = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(retailerId),
      },
    },
    {
      $lookup: {
        from: 'userdbs',
        localField: 'retailer_user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unset: ['user.passWord', 'user.password', 'user.pin'],
    },
  ];

  const results = await Retailer.aggregate(pipeline);
  return results.length > 0 ? withFinancialProgress(results[0]) : null;
};

/**
 * Update retailer profile
 */
export const updateRetailerProfile = async (
  userId: string,
  updateData: IRetailerUpdateInput
): Promise<IRetailer | null> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const normalizedUpdateData: IRetailerUpdateInput = { ...updateData };
    const userUpdateData: Record<string, unknown> = {};
    delete normalizedUpdateData.onboardingCurrentStep;
    delete normalizedUpdateData.onboardingCompletedSteps;
    delete normalizedUpdateData.onboardingStatus;
    delete normalizedUpdateData.phoneNumber;
    delete normalizedUpdateData.phone;

    if (normalizedUpdateData.email) {
      normalizedUpdateData.email = normalizedUpdateData.email.toLowerCase().trim();

      const existingUser = await User.findOne({
        email: normalizedUpdateData.email,
        _id: { $ne: new mongoose.Types.ObjectId(userId) },
      }).session(session);

      if (existingUser) {
        throw new ConflictError('Email is already in use');
      }
    }

    if (normalizedUpdateData.firstName !== undefined) {
      userUpdateData.firstName = normalizedUpdateData.firstName;
    }
    if (normalizedUpdateData.lastName !== undefined) {
      userUpdateData.lastName = normalizedUpdateData.lastName;
    }
    if (normalizedUpdateData.middleName !== undefined) {
      userUpdateData.middleName = normalizedUpdateData.middleName;
    }
    if (normalizedUpdateData.email !== undefined) {
      userUpdateData.email = normalizedUpdateData.email;
    }
    if (normalizedUpdateData.gender !== undefined) {
      userUpdateData.gender = normalizedUpdateData.gender;
    }
    if (normalizedUpdateData.dateOfBirth !== undefined) {
      userUpdateData.dateOfBirth = normalizedUpdateData.dateOfBirth;
    }
    if (normalizedUpdateData.address !== undefined) {
      userUpdateData.address = normalizedUpdateData.address;
    }
    if (normalizedUpdateData.currentState !== undefined) {
      userUpdateData.state = normalizedUpdateData.currentState;
    }
    if (normalizedUpdateData.location !== undefined) {
      userUpdateData.location = normalizedUpdateData.location;
    }

    const existingRetailer = await Retailer.findOne({ retailer_user_id: userId }).session(session).exec();
    if (!existingRetailer) {
      await session.abortTransaction();
      return null;
    }

    const mergedRetailerData = {
      ...(existingRetailer.toObject() as Partial<IRetailer>),
      ...normalizedUpdateData,
    };

    const baseProgress = deriveOnboardingProgress(mergedRetailerData);
    const productCount = await RetailerProduct.countDocuments({
      retailer_user_id: new mongoose.Types.ObjectId(userId),
      status: { $ne: 'archived' },
    }).session(session);

    const hasStepSix =
      baseProgress.onboardingCompletedSteps.includes(5) &&
      productCount > 0 &&
      Boolean(
        mergedRetailerData.estimatedStockValue?.trim() &&
          mergedRetailerData.estimatedRestockValue?.trim() &&
          mergedRetailerData.restockingFrequency?.trim()
      );

    const stepSixCompletedSteps = hasStepSix
      ? [...new Set([...baseProgress.onboardingCompletedSteps, 6])]
      : baseProgress.onboardingCompletedSteps;
    const stepSixCurrentStep = hasStepSix ? 7 : baseProgress.onboardingCurrentStep;

    const hasStepSeven =
      stepSixCompletedSteps.includes(6) &&
      Boolean(
        mergedRetailerData.estimatedDailySalesRevenue?.trim() &&
          mergedRetailerData.slowestDaySales?.trim() &&
          Array.isArray(mergedRetailerData.paymentModes) &&
          mergedRetailerData.paymentModes.length > 0 &&
          mergedRetailerData.monthlyNetProfit?.trim() &&
          mergedRetailerData.hasPosTerminal &&
          (mergedRetailerData.hasPosTerminal === 'no' || mergedRetailerData.posProviderName?.trim()) &&
          mergedRetailerData.salesTrackingMethod?.trim()
      );

    const stepSevenCompletedSteps = hasStepSeven
      ? [...new Set([...stepSixCompletedSteps, 7])]
      : stepSixCompletedSteps;
    const stepSevenCurrentStep = hasStepSeven ? 8 : stepSixCurrentStep;

    const hasStepEight =
      stepSevenCompletedSteps.includes(7) &&
      Boolean(
        mergedRetailerData.creditStartTimeline?.trim() &&
          mergedRetailerData.willingDailyRepayment &&
          mergedRetailerData.informationConfirmed === true
      );

    const onboardingProgress = {
      onboardingCompletedSteps: hasStepEight
        ? [...new Set([...stepSevenCompletedSteps, 8])]
        : stepSevenCompletedSteps,
      onboardingCurrentStep: hasStepEight ? 8 : stepSevenCurrentStep,
      onboardingStatus: hasStepEight ? 'completed' : baseProgress.onboardingStatus,
    };

    const retailer = await Retailer.findOneAndUpdate(
      { retailer_user_id: userId },
      {
        $set: {
          ...normalizedUpdateData,
          ...onboardingProgress,
        },
      },
      { new: true, session }
    ).exec();

    if (Object.keys(userUpdateData).length > 0) {
      await User.findByIdAndUpdate(
        userId,
        { $set: userUpdateData },
        { new: true, session }
      ).exec();
    }

    await session.commitTransaction();
    return retailer;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get all retailers with pagination
 */
export const getAllRetailers = async (
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<{ retailers: IRetailer[]; total: number; pages: number }> => {
  const query: any = {};

  if (search) {
    query.$or = [
      { businessName: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Retailer.countDocuments(query);
  const retailers = await Retailer.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();

  return {
    retailers,
    total,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Check if email is already registered
 */
export const isEmailRegistered = async (email: string): Promise<boolean> => {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).exec();
  return !!user;
};

/**
 * Check if phone is already registered
 */
export const isPhoneRegistered = async (phone: string): Promise<boolean> => {
  const retailer = await Retailer.findOne({ phoneNumber: phone }).exec();
  return !!retailer;
};

export const getRetailerByPhone = async (phone: string): Promise<IRetailer | null> => {
  return await Retailer.findOne({ phoneNumber: phone }).exec();
};

/**
 * Set retailer PIN
 */
export const setRetailerPin = async (userId: string, pin: string): Promise<void> => {
  const user = await User.findById(userId).select('+pin').exec();

  if (!user) {
    throw new NotFoundError('Retailer account not found');
  }

  user.pin = pin;
  await user.save();
};

/**
 * Get user by phone number
 */
export const getUserByPhone = async (phone: string): Promise<any | null> => {
  return await User.findOne({
    $or: [{ phone }, { phoneNumber: phone }],
  }).exec();
};

export const getUserByIdWithPin = async (userId: string): Promise<any | null> => {
  return await User.findById(userId).select('+pin').exec();
};

// Export service object
export const retailerService = {
  createRetailerWithUser,
  activateRetailer,
  getRetailerByUserId,
  getRetailerById,
  getRetailerWithUser,
  getRetailerByIdWithUser,
  updateRetailerProfile,
  getAllRetailers,
  isEmailRegistered,
  isPhoneRegistered,
  getRetailerByPhone,
  setRetailerPin,
  getUserByEmail: getUserByEmailWithPassword, // Reuse from user.service.ts
  getUserByPhone,
  getUserByIdWithPin,
};
