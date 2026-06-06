import { Loan } from '../models/loan.model.js';
import { LoanInstallment } from '../models/loan-installment.model.js';
import { Transaction } from '../models/transaction.model.js';
import { Request } from '../models/request.model.js';
import mongoose from 'mongoose';
import { IMarkInstallmentPaidInput } from '../interfaces/loan.interface.js';
import { BadRequestError, NotFoundError } from '../utils/error.util.js';

interface LoanQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const getLoansForAdmin = async (filters: LoanQueryFilters = {}) => {
  const { page = 1, limit = 10, search, status } = filters;

  const query: any = {};
  if (status) {
    query.status = status;
  }

  const loans = await Loan.find(query)
    .populate('requestId', 'farmerName status requestType createdAt')
    .populate('retailerUserId', 'firstName lastName email')
    .populate('retailerId', 'businessName')
    .populate('farmerId', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();

  const filteredLoans = search
    ? loans.filter((loan: any) => {
        const request = loan.requestId;
        const retailerName = [loan.retailerUserId?.firstName, loan.retailerUserId?.lastName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const farmerName = request?.farmerName?.toLowerCase() || '';
        const requestId = request?._id?.toString().toLowerCase() || '';
        const loanId = loan._id.toString().toLowerCase();
        const q = search.toLowerCase();
        return (
          retailerName.includes(q) ||
          farmerName.includes(q) ||
          requestId.includes(q) ||
          loanId.includes(q)
        );
      })
    : loans;

  const total = search ? filteredLoans.length : await Loan.countDocuments(query);
  const sliced = search ? filteredLoans.slice(0, limit) : loans;

  return {
    loans: sliced,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    total,
  };
};

export const getLoanDetailsForAdmin = async (loanId: string) => {
  const loan = await Loan.findById(loanId)
    .populate('requestId')
    .populate('retailerUserId', 'firstName lastName email phone')
    .populate('retailerId', 'businessName')
    .populate('farmerId', 'firstName lastName email phone')
    .exec();

  if (!loan) {
    throw new NotFoundError('Loan not found');
  }

  const installments = await LoanInstallment.find({ loanId: loan._id })
    .sort({ leg: 1, installmentNumber: 1 })
    .exec();

  const transactions = await Transaction.find({ loanId: loan._id })
    .sort({ createdAt: -1 })
    .exec();

  return {
    loan,
    installments,
    transactions,
  };
};

export const markRetailerInstallmentPaidByAdmin = async (
  loanId: string,
  installmentId: string,
  adminUserId: string,
  input: IMarkInstallmentPaidInput
) => {
  const loan = await Loan.findById(loanId).exec();
  if (!loan) {
    throw new NotFoundError('Loan not found');
  }

  const installment = await LoanInstallment.findOne({
    _id: installmentId,
    loanId: loan._id,
    leg: 'retailer_to_platform',
  }).exec();

  if (!installment) {
    throw new NotFoundError('Retailer installment not found');
  }

  if (installment.status === 'paid') {
    throw new BadRequestError('Installment is already paid');
  }

  const installmentsInLeg = await LoanInstallment.find({
    loanId: loan._id,
    leg: 'retailer_to_platform',
  })
    .sort({ installmentNumber: 1 })
    .lean();

  const firstUnpaid = installmentsInLeg.find((entry) => entry.status !== 'paid');
  if (firstUnpaid && String(firstUnpaid._id) !== String(installment._id)) {
    throw new BadRequestError(
      `Installments must be paid sequentially. Please pay installment ${firstUnpaid.installmentNumber} first.`
    );
  }

  const paidAt = new Date(input.paidDate);
  if (Number.isNaN(paidAt.getTime())) {
    throw new BadRequestError('Invalid paid date');
  }

  installment.paidAmount = installment.amount;
  installment.status = 'paid';
  installment.paidAt = paidAt;
  installment.metadata = {
    ...(installment.metadata || {}),
    paidBy: 'retailer',
    note: input.note?.trim() || undefined,
    transactionReference: input.reference.trim(),
  };
  await installment.save();

  await Transaction.create({
    loanId: loan._id,
    requestId: loan.requestId,
    type: 'repayment',
    leg: 'retailer_to_platform',
    amount: installment.amount,
    reference: input.reference.trim(),
    note: input.note?.trim(),
    status: 'posted',
    createdBy: new mongoose.Types.ObjectId(adminUserId),
    createdAt: paidAt,
    updatedAt: paidAt,
  });

  const remainingUnpaid = await LoanInstallment.countDocuments({
    loanId: loan._id,
    leg: 'retailer_to_platform',
    status: { $ne: 'paid' },
  });

  if (remainingUnpaid === 0 && loan.status === 'active') {
    loan.status = 'repaid';
    await loan.save();

    await Request.updateOne(
      { _id: loan.requestId },
      {
        $set: {
          status: 'completed',
          completedAt: paidAt,
          updatedAt: paidAt,
        },
      }
    ).exec();
  }

  const refreshedDetails = await getLoanDetailsForAdmin(String(loan._id));
  return refreshedDetails;
};

export const loanService = {
  getLoansForAdmin,
  getLoanDetailsForAdmin,
  markRetailerInstallmentPaidByAdmin,
};
