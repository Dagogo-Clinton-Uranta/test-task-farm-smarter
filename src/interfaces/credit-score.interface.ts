import { Document, Types } from 'mongoose';

export type CreditScoreFieldRuleType =
  | 'open_ended'
  | 'single_choice'
  | 'multi_choice'
  | 'number_range'
  | 'not_applicable';

export interface ICreditScoreOptionRule {
  value: string;
  points: number;
}

export interface ICreditScoreRangeRule {
  min: number;
  max: number;
  points: number;
}

export interface ICreditScoreFieldRule {
  fieldName: string;
  fieldLabel?: string;
  fieldType: CreditScoreFieldRuleType;
  openEndedPoints?: number;
  optionPoints?: ICreditScoreOptionRule[];
  ranges?: ICreditScoreRangeRule[];
  notes?: string;
}

export interface ICreditScoreExternalSourceConfig {
  enabled: boolean;
  status: 'not_applicable' | 'active';
  weight: number;
}

export interface ICreditScoreCalculatorConfig {
  form: {
    enabled: boolean;
    formId?: Types.ObjectId;
    formVersion?: number;
    rules: ICreditScoreFieldRule[];
  };
  external: {
    creditBureau: ICreditScoreExternalSourceConfig;
    bankTransactions: ICreditScoreExternalSourceConfig;
  };
}

export interface ICreditScoreCalculatorVersion extends Document {
  _id: Types.ObjectId;
  version: number;
  name: string;
  description?: string;
  config: ICreditScoreCalculatorConfig;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

export type FarmerScoreReason =
  | 'farmer_create'
  | 'farmer_update'
  | 'manual_admin'
  | 'calculator_apply_existing';

export interface IFarmerCreditScoreBreakdownItem {
  fieldName: string;
  fieldLabel?: string;
  fieldType: CreditScoreFieldRuleType;
  responseValue: unknown;
  awardedPoints: number;
  maxPoints: number;
  notes?: string;
}

export interface IFarmerCreditScoreEvent extends Document {
  _id: Types.ObjectId;
  farmer_id: Types.ObjectId;
  calculator_version_id: Types.ObjectId;
  calculator_version: number;
  response_id?: Types.ObjectId;
  reason: FarmerScoreReason;
  triggered_by?: Types.ObjectId;
  total_score: number;
  form_raw_score: number;
  form_max_score: number;
  external_scores: {
    creditBureau: number;
    bankTransactions: number;
  };
  breakdown: IFarmerCreditScoreBreakdownItem[];
  response_snapshot: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

export interface ICreateCreditScoreCalculatorInput {
  name: string;
  description?: string;
  config: ICreditScoreCalculatorConfig;
  setActive?: boolean;
  applyToExistingFarmers?: boolean;
}

