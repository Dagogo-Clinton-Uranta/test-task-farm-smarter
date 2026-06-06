import mongoose, { Model, Schema } from 'mongoose';
import { ILoanInstallment } from '../interfaces/loan.interface.js';

interface LoanInstallmentModel extends Model<ILoanInstallment> {}

const loanInstallmentSchema = new Schema<ILoanInstallment, LoanInstallmentModel>(
  {
    loanId: { type: Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    requestId: { type: Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    leg: {
      type: String,
      enum: ['retailer_to_platform', 'farmer_to_retailer'],
      required: true,
      index: true,
    },
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true, index: true },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partially_paid', 'overdue'],
      default: 'pending',
      required: true,
    },
    paidAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'loaninstallments',
    strict: true,
  }
);

loanInstallmentSchema.index({ loanId: 1, leg: 1, installmentNumber: 1 }, { unique: true });
loanInstallmentSchema.index({ requestId: 1, leg: 1, dueDate: 1 });

export const LoanInstallment = mongoose.model<ILoanInstallment, LoanInstallmentModel>(
  'LoanInstallment',
  loanInstallmentSchema
);
