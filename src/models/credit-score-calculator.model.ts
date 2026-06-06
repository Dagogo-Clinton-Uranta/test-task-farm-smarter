import mongoose, { Model, Schema } from 'mongoose';
import { ICreditScoreCalculatorVersion } from '../interfaces/credit-score.interface.js';

interface CreditScoreCalculatorModel extends Model<ICreditScoreCalculatorVersion> {}

const optionRuleSchema = new Schema(
  {
    value: { type: String, required: true, trim: true },
    points: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const rangeRuleSchema = new Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    points: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const fieldRuleSchema = new Schema(
  {
    fieldName: { type: String, required: true, trim: true },
    fieldLabel: { type: String, trim: true },
    fieldType: {
      type: String,
      enum: ['open_ended', 'single_choice', 'multi_choice', 'number_range', 'not_applicable'],
      required: true,
    },
    openEndedPoints: { type: Number, default: 0 },
    optionPoints: { type: [optionRuleSchema], default: [] },
    ranges: { type: [rangeRuleSchema], default: [] },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const externalSourceSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['not_applicable', 'active'],
      default: 'not_applicable',
    },
    weight: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const creditScoreCalculatorSchema = new Schema<ICreditScoreCalculatorVersion, CreditScoreCalculatorModel>(
  {
    version: { type: Number, required: true, unique: true, min: 1 },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    config: {
      form: {
        enabled: { type: Boolean, default: true },
        formId: { type: Schema.Types.ObjectId, ref: 'Form' },
        formVersion: { type: Number, min: 1 },
        rules: { type: [fieldRuleSchema], default: [] },
      },
      external: {
        creditBureau: { type: externalSourceSchema, default: () => ({}) },
        bankTransactions: { type: externalSourceSchema, default: () => ({}) },
      },
    },
    isActive: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'creditscorecalculators',
    strict: true,
  }
);

creditScoreCalculatorSchema.index({ version: -1 });
creditScoreCalculatorSchema.index({ createdAt: -1 });

export const CreditScoreCalculatorVersion = mongoose.model<ICreditScoreCalculatorVersion, CreditScoreCalculatorModel>(
  'CreditScoreCalculatorVersion',
  creditScoreCalculatorSchema
);

