import { Document, Types } from 'mongoose';

export type LoanStatus = 'active' | 'repaid' | 'completed' | 'defaulted' | 'cancelled';
export type InstallmentStatus = 'pending' | 'paid' | 'partially_paid' | 'overdue';
export type InstallmentLeg = 'retailer_to_platform' | 'farmer_to_retailer';
export type TransactionType = 'disbursement' | 'repayment';
export type TransactionLeg = 'platform_to_retailer' | InstallmentLeg;

export interface ILoan extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  retailerUserId: Types.ObjectId;
  retailerId?: Types.ObjectId;
  farmerId: Types.ObjectId;
  principalAmount: number;
  disbursedAmount: number;
  approvedTenorWeeks: number;
  coveragePercent?: number;
  disbursedAt: Date;
  disbursementReference?: string;
  disbursementNote?: string;
  createdBy: Types.ObjectId;
  status: LoanStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoanInstallment extends Document {
  _id: Types.ObjectId;
  loanId: Types.ObjectId;
  requestId: Types.ObjectId;
  leg: InstallmentLeg;
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  status: InstallmentStatus;
  paidAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  loanId: Types.ObjectId;
  requestId: Types.ObjectId;
  type: TransactionType;
  leg: TransactionLeg;
  amount: number;
  reference?: string;
  note?: string;
  status: 'posted' | 'failed' | 'reversed';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRequestDisburseInput {
  amount: number;
  reference?: string;
  note?: string;
}

export interface IMarkInstallmentPaidInput {
  paidDate: Date | string;
  reference: string;
  note?: string;
}
