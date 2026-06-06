import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware.js';
import { validateParam } from '../middlewares/validate.middleware.js';
import { validate, loanQuerySchema, markInstallmentPaidSchema } from '../middlewares/validation.middleware.js';
import {
  getAdminLoanDetails,
  getAdminLoans,
  markAdminRetailerInstallmentPaid,
} from '../controllers/loan.controller.js';

const router = Router();

router.get('/admin', authenticate, authorizeAdmin, validate(loanQuerySchema, 'query'), getAdminLoans);
router.get('/:id/details', authenticate, authorizeAdmin, validateParam('id', 'Loan ID is required'), getAdminLoanDetails);
router.put(
  '/:id/installments/:installmentId/mark-paid',
  authenticate,
  authorizeAdmin,
  validateParam('id', 'Loan ID is required'),
  validateParam('installmentId', 'Installment ID is required'),
  validate(markInstallmentPaidSchema),
  markAdminRetailerInstallmentPaid
);

export default router;
