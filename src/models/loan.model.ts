import mongoose, { Model, Schema } from 'mongoose';
import { ILoan } from '../interfaces/loan.interface.js';

interface LoanModel extends Model<ILoan> {}

const loanSchema = new Schema<ILoan, LoanModel>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'Request', required: true, unique: true, index: true },
    retailerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    retailerId: { type: Schema.Types.ObjectId, ref: 'Retailer', index: true },
    farmerId: { type: Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
    principalAmount: { type: Number, required: true },
    disbursedAmount: { type: Number, required: true },
    approvedTenorWeeks: { type: Number, required: true },
    coveragePercent: { type: Number },
    disbursedAt: { type: Date, required: true },
    disbursementReference: { type: String, trim: true },
    disbursementNote: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['active', 'repaid', 'completed', 'defaulted', 'cancelled'],
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'loans',
    strict: true,
  }
);

/*loanSchema.index({ requestId: 1 }, { unique: true });*/
loanSchema.index({ retailerUserId: 1, createdAt: -1 });
loanSchema.index({ farmerId: 1, createdAt: -1 });

export const Loan = mongoose.model<ILoan, LoanModel>('Loan', loanSchema);
