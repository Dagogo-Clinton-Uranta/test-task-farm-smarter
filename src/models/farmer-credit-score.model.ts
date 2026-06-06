import mongoose, { Model, Schema } from 'mongoose';
import { IFarmerCreditScoreEvent } from '../interfaces/credit-score.interface.js';

interface FarmerCreditScoreModel extends Model<IFarmerCreditScoreEvent> {}

const breakdownItemSchema = new Schema(
  {
    fieldName: { type: String, required: true, trim: true },
    fieldLabel: { type: String, trim: true },
    fieldType: {
      type: String,
      enum: ['open_ended', 'single_choice', 'multi_choice', 'number_range', 'not_applicable'],
      required: true,
    },
    responseValue: { type: Schema.Types.Mixed },
    awardedPoints: { type: Number, required: true, default: 0 },
    maxPoints: { type: Number, required: true, default: 0 },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const farmerCreditScoreSchema = new Schema<IFarmerCreditScoreEvent, FarmerCreditScoreModel>(
  {
    farmer_id: { type: Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
    calculator_version_id: {
      type: Schema.Types.ObjectId,
      ref: 'CreditScoreCalculatorVersion',
      required: true,
      index: true,
    },
    calculator_version: { type: Number, required: true, min: 1, index: true },
    response_id: { type: Schema.Types.ObjectId, ref: 'Response', index: true },
    reason: {
      type: String,
      enum: ['farmer_create', 'farmer_update', 'manual_admin', 'calculator_apply_existing'],
      required: true,
      index: true,
    },
    triggered_by: { type: Schema.Types.ObjectId, ref: 'User' },
    total_score: { type: Number, required: true, min: 0, max: 10, index: true },
    form_raw_score: { type: Number, required: true, default: 0 },
    form_max_score: { type: Number, required: true, default: 0 },
    external_scores: {
      creditBureau: { type: Number, default: 0 },
      bankTransactions: { type: Number, default: 0 },
    },
    breakdown: { type: [breakdownItemSchema], default: [] },
    response_snapshot: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'farmercreditscores',
    strict: true,
  }
);

farmerCreditScoreSchema.index({ farmer_id: 1, createdAt: -1 });
farmerCreditScoreSchema.index({ calculator_version: 1, createdAt: -1 });

export const FarmerCreditScoreEvent = mongoose.model<IFarmerCreditScoreEvent, FarmerCreditScoreModel>(
  'FarmerCreditScoreEvent',
  farmerCreditScoreSchema
);

