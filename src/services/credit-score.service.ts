import mongoose from 'mongoose';
import {
  CreditScoreFieldRuleType,
  FarmerScoreReason,
  ICreateCreditScoreCalculatorInput,
  ICreditScoreCalculatorVersion,
  ICreditScoreFieldRule,
} from '../interfaces/credit-score.interface.js';
import { CreditScoreCalculatorVersion } from '../models/credit-score-calculator.model.js';
import { FarmerCreditScoreEvent } from '../models/farmer-credit-score.model.js';
import { Farmer } from '../models/farmer.model.js';
import { Response } from '../models/response.model.js';
import { ValidationError, NotFoundError } from '../utils/error.util.js';
import { logger } from '../utils/logger.js';

interface ScoreBreakdownItem {
  fieldName: string;
  fieldLabel?: string;
  fieldType: CreditScoreFieldRuleType;
  responseValue: unknown;
  awardedPoints: number;
  maxPoints: number;
  notes?: string;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

const normalizeText = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const validateCalculatorConfig = (input: ICreateCreditScoreCalculatorInput): void => {
  if (!input?.name?.trim()) {
    throw new ValidationError('Calculator name is required');
  }

  if (!input.config?.form?.rules || input.config.form.rules.length === 0) {
    throw new ValidationError('At least one form scoring rule is required');
  }

  for (const rule of input.config.form.rules) {
    if (!rule.fieldName?.trim()) {
      throw new ValidationError('Each scoring rule must include fieldName');
    }

    if (rule.fieldType === 'single_choice' || rule.fieldType === 'multi_choice') {
      if (!rule.optionPoints || rule.optionPoints.length === 0) {
        throw new ValidationError(
          `Rule "${rule.fieldName}" requires optionPoints for ${rule.fieldType}`
        );
      }
    }

    if (rule.fieldType === 'number_range') {
      if (!rule.ranges || rule.ranges.length === 0) {
        throw new ValidationError(`Rule "${rule.fieldName}" requires ranges`);
      }
    }
  }
};

const getRuleMaxPoints = (rule: ICreditScoreFieldRule): number => {
  switch (rule.fieldType) {
    case 'open_ended':
      return Math.max(0, rule.openEndedPoints ?? 0);
    case 'single_choice':
      return Math.max(0, ...(rule.optionPoints || []).map((item) => item.points));
    case 'multi_choice':
      return Math.max(
        0,
        (rule.optionPoints || []).reduce((sum, item) => sum + Math.max(0, item.points), 0)
      );
    case 'number_range':
      return Math.max(0, ...(rule.ranges || []).map((item) => item.points));
    case 'not_applicable':
    default:
      return 0;
  }
};

const scoreRule = (rule: ICreditScoreFieldRule, value: unknown): ScoreBreakdownItem => {
  const maxPoints = getRuleMaxPoints(rule);
  const normalizedValue = normalizeText(value);

  let awardedPoints = 0;
  let notes = '';

  switch (rule.fieldType) {
    case 'open_ended': {
      const hasValue =
        typeof value === 'string'
          ? value.trim().length > 0
          : value !== undefined && value !== null && value !== '';
      awardedPoints = hasValue ? Math.max(0, rule.openEndedPoints ?? 0) : 0;
      if (!hasValue) notes = 'Missing response';
      break;
    }
    case 'single_choice': {
      const match = (rule.optionPoints || []).find(
        (option) => normalizeText(option.value) === normalizedValue
      );
      awardedPoints = match ? match.points : 0;
      if (!match) notes = normalizedValue ? 'No matching option rule' : 'Missing response';
      break;
    }
    case 'multi_choice': {
      const selected = Array.isArray(value) ? value.map((item) => normalizeText(item)) : [];
      if (selected.length === 0) {
        notes = 'Missing response';
      }
      awardedPoints = (rule.optionPoints || [])
        .filter((option) => selected.includes(normalizeText(option.value)))
        .reduce((sum, option) => sum + option.points, 0);
      if (awardedPoints > maxPoints) {
        awardedPoints = maxPoints;
      }
      break;
    }
    case 'number_range': {
      const numericValue = toFiniteNumber(value);
      if (numericValue === null) {
        notes = value === undefined || value === null || value === '' ? 'Missing response' : 'Invalid number';
        awardedPoints = 0;
      } else {
        const matchingRange = (rule.ranges || []).find(
          (range) => numericValue >= range.min && numericValue <= range.max
        );
        awardedPoints = matchingRange ? matchingRange.points : 0;
        if (!matchingRange) notes = 'No matching range';
      }
      break;
    }
    case 'not_applicable':
    default:
      awardedPoints = 0;
      notes = 'Not applicable';
      break;
  }

  if (awardedPoints < 0) awardedPoints = 0;
  if (awardedPoints > maxPoints) awardedPoints = maxPoints;

  return {
    fieldName: rule.fieldName,
    fieldLabel: rule.fieldLabel,
    fieldType: rule.fieldType,
    responseValue: value,
    awardedPoints,
    maxPoints,
    notes: notes || rule.notes,
  };
};

const calculateFormScore = (
  calculator: ICreditScoreCalculatorVersion,
  responseObject: Record<string, unknown>
): {
  totalScore: number;
  formRawScore: number;
  formMaxScore: number;
  breakdown: ScoreBreakdownItem[];
} => {
  const rules = calculator.config.form.rules || [];
  const breakdown = rules.map((rule) => scoreRule(rule, responseObject[rule.fieldName]));
  const formRawScore = breakdown.reduce((sum, item) => sum + item.awardedPoints, 0);
  const formMaxScore = breakdown.reduce((sum, item) => sum + item.maxPoints, 0);
  const totalScore = formMaxScore > 0 ? round2((formRawScore / formMaxScore) * 10) : 0;

  return {
    totalScore,
    formRawScore,
    formMaxScore,
    breakdown,
  };
};

const applyCalculatorToExistingFarmers = async (
  calculator: ICreditScoreCalculatorVersion,
  triggeredBy?: string
): Promise<{ processed: number; success: number; failed: number }> => {
  const farmers = await Farmer.find({ is_deleted: { $ne: true } })
    .select('_id OriginalResponseId')
    .lean();

  let success = 0;
  let failed = 0;

  for (const farmer of farmers) {
    try {
      const response = farmer.OriginalResponseId
        ? await Response.findById(farmer.OriginalResponseId).select('responseObject').lean()
        : null;

      const responseObject = (response?.responseObject || {}) as Record<string, unknown>;

      await calculateAndStoreFarmerScore({
        farmerId: String(farmer._id),
        reason: 'calculator_apply_existing',
        calculator,
        responseObject,
        responseId: response?._id ? String(response._id) : undefined,
        triggeredBy,
      });
      success += 1;
    } catch (error) {
      failed += 1;
      logger.error('Failed to apply calculator to existing farmer', {
        farmerId: String(farmer._id),
        version: calculator.version,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    processed: farmers.length,
    success,
    failed,
  };
};

interface CalculateAndStoreInput {
  farmerId: string;
  reason: FarmerScoreReason;
  responseObject: Record<string, unknown>;
  responseId?: string;
  triggeredBy?: string;
  calculator?: ICreditScoreCalculatorVersion;
}

export const getActiveCalculatorVersion = async (): Promise<ICreditScoreCalculatorVersion | null> => {
  return CreditScoreCalculatorVersion.findOne({ isActive: true }).sort({ version: -1 }).exec();
};

export const createCalculatorVersion = async (
  input: ICreateCreditScoreCalculatorInput,
  createdBy?: string
): Promise<{
  calculator: ICreditScoreCalculatorVersion;
  applyStats?: { processed: number; success: number; failed: number };
}> => {
  validateCalculatorConfig(input);

  const latest = await CreditScoreCalculatorVersion.findOne().sort({ version: -1 }).select('version').lean();
  const nextVersion = (latest?.version || 0) + 1;
  const setActive = input.setActive !== false;

  const calculator = await CreditScoreCalculatorVersion.create({
    version: nextVersion,
    name: input.name.trim(),
    description: input.description?.trim(),
    config: {
      ...input.config,
      external: {
        creditBureau: {
          enabled: input.config.external?.creditBureau?.enabled ?? false,
          status: input.config.external?.creditBureau?.status ?? 'not_applicable',
          weight: input.config.external?.creditBureau?.weight ?? 0,
        },
        bankTransactions: {
          enabled: input.config.external?.bankTransactions?.enabled ?? false,
          status: input.config.external?.bankTransactions?.status ?? 'not_applicable',
          weight: input.config.external?.bankTransactions?.weight ?? 0,
        },
      },
    },
    isActive: setActive,
    createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
  });

  if (setActive) {
    await CreditScoreCalculatorVersion.updateMany(
      { _id: { $ne: calculator._id }, isActive: true },
      { $set: { isActive: false } }
    ).exec();
  }

  let applyStats: { processed: number; success: number; failed: number } | undefined;
  if (setActive && input.applyToExistingFarmers) {
    applyStats = await applyCalculatorToExistingFarmers(calculator, createdBy);
  }

  return { calculator, applyStats };
};

export const listCalculatorVersions = async (): Promise<ICreditScoreCalculatorVersion[]> => {
  return CreditScoreCalculatorVersion.find().sort({ version: -1 }).exec();
};

export const calculateAndStoreFarmerScore = async (
  payload: CalculateAndStoreInput
): Promise<{ eventId: string; totalScore: number; version: number }> => {
  const calculator = payload.calculator || (await getActiveCalculatorVersion());

  if (!calculator) {
    throw new NotFoundError('No active credit score calculator version found');
  }

  const score = calculateFormScore(calculator, payload.responseObject);

  const event = await FarmerCreditScoreEvent.create({
    farmer_id: new mongoose.Types.ObjectId(payload.farmerId),
    calculator_version_id: calculator._id,
    calculator_version: calculator.version,
    response_id: payload.responseId ? new mongoose.Types.ObjectId(payload.responseId) : undefined,
    reason: payload.reason,
    triggered_by: payload.triggeredBy ? new mongoose.Types.ObjectId(payload.triggeredBy) : undefined,
    total_score: score.totalScore,
    form_raw_score: score.formRawScore,
    form_max_score: score.formMaxScore,
    external_scores: {
      creditBureau: 0,
      bankTransactions: 0,
    },
    breakdown: score.breakdown,
    response_snapshot: payload.responseObject,
  });

  return {
    eventId: event._id.toString(),
    totalScore: score.totalScore,
    version: calculator.version,
  };
};

export const recalculateFarmerScoreManually = async (
  farmerId: string,
  triggeredBy?: string
): Promise<{ eventId: string; totalScore: number; version: number }> => {
  const farmer = await Farmer.findById(farmerId).select('_id OriginalResponseId').lean();
  if (!farmer) {
    throw new NotFoundError('Farmer not found');
  }

  const response = farmer.OriginalResponseId
    ? await Response.findById(farmer.OriginalResponseId).select('responseObject').lean()
    : null;

  const responseObject = (response?.responseObject || {}) as Record<string, unknown>;

  return calculateAndStoreFarmerScore({
    farmerId: String(farmer._id),
    reason: 'manual_admin',
    responseObject,
    responseId: response?._id ? String(response._id) : undefined,
    triggeredBy,
  });
};

export const getLatestFarmerScore = async (farmerId: string) => {
  return FarmerCreditScoreEvent.findOne({
    farmer_id: new mongoose.Types.ObjectId(farmerId),
  })
    .sort({ createdAt: -1 })
    .exec();
};

export const getFarmerScoreHistory = async (farmerId: string, limit = 20) => {
  return FarmerCreditScoreEvent.find({
    farmer_id: new mongoose.Types.ObjectId(farmerId),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

export const creditScoreService = {
  getActiveCalculatorVersion,
  createCalculatorVersion,
  listCalculatorVersions,
  calculateAndStoreFarmerScore,
  recalculateFarmerScoreManually,
  getLatestFarmerScore,
  getFarmerScoreHistory,
};

