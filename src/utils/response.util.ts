import { Response } from 'express';

/**
 * Standard API Response Format
 */

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): void => {
  const response: IApiResponse<T> = {
    success: true,
    message,
    data,
  };

  res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  error: string,
  message: string = 'Error',
  statusCode: number = 500
): void => {
  const response: IApiResponse = {
    success: false,
    message,
    error,
  };

  res.status(statusCode).json(response);
};

/**
 * Send validation error response
 */
export const sendValidationError = (res: Response, errors: any): void => {
  const response: IApiResponse = {
    success: false,
    message: 'Validation Error',
    error: errors,
  };

  res.status(422).json(response);
};
