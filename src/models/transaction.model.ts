import mongoose, { Model, Schema } from 'mongoose';
import { ITransaction } from '../interfaces/loan.interface.js';

interface TransactionModel extends Model<ITransaction> {}

const transactionSchema = new Schema<ITransaction, TransactionModel>(
  {
    loanId: { type: Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    requestId: { type: Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    type: {
      type: String,
      enum: ['disbursement', 'repayment'],
      required: true,
      index: true,
    },
    leg: {
      type: String,
      enum: ['platform_to_retailer', 'retailer_to_platform', 'farmer_to_retailer'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    reference: { type: String, trim: true, index: true },
    note: { type: String, trim: true },
    status: {
      type: String,
      enum: ['posted', 'failed', 'reversed'],
      default: 'posted',
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  {
    timestamps: true,
    collection: 'transactions',
    strict: true,
  }
);

transactionSchema.index({ loanId: 1, type: 1, createdAt: -1 });
transactionSchema.index({ requestId: 1, type: 1, createdAt: -1 });

export const Transaction = mongoose.model<ITransaction, TransactionModel>('Transaction', transactionSchema);
