import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.util.js';
import { loanService } from '../services/loan.service.js';

export const getAdminLoans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, limit, search, status } = req.query;
    const result = await loanService.getLoansForAdmin({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string | undefined,
      status: status as string | undefined,
    });

    sendSuccess(res, result, 'Loans retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getAdminLoanDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const details = await loanService.getLoanDetailsForAdmin(id!);
    sendSuccess(res, details, 'Loan details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const markAdminRetailerInstallmentPaid = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, installmentId } = req.params;
    const adminUserId = req.userId!;
    const { paidDate, reference, note } = req.body;

    const details = await loanService.markRetailerInstallmentPaidByAdmin(
      id!,
      installmentId!,
      adminUserId,
      { paidDate, reference, note }
    );

    sendSuccess(res, details, 'Installment marked as paid successfully');
  } catch (error) {
    next(error);
  }
};
