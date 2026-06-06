import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/error.util.js';

/**
 * Validation Middleware
 * Validates required parameters from request params, query, or body
 */

type ValidationSource = 'params' | 'query' | 'body';

interface ValidationRule {
  source: ValidationSource;
  field: string;
  message?: string;
}

/**
 * Validate required parameters
 * @param rules Array of validation rules specifying source, field, and optional custom message
 * @example
 * validateParams([
 *   { source: 'params', field: 'id', message: 'Agent ID is required' },
 *   { source: 'query', field: 'agent_id' }
 * ])
 */
export const validateParams = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      for (const rule of rules) {
        let value: any;

        switch (rule.source) {
          case 'params':
            value = req.params[rule.field];
            break;
          case 'query':
            value = req.query[rule.field];
            break;
          case 'body':
            value = req.body[rule.field];
            break;
        }

        if (!value || (typeof value === 'string' && value.trim() === '')) {
          const errorMessage =
            rule.message ||
            `${rule.field.charAt(0).toUpperCase() + rule.field.slice(1)} is required`;
          throw new BadRequestError(errorMessage);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Convenience function for validating a single parameter from params
 * @param fieldName The field name in req.params
 * @param customMessage Optional custom error message
 * @example
 * validateParam('id', 'Agent ID is required')
 */
export const validateParam = (fieldName: string, customMessage?: string) => {
  return validateParams([
    {
      source: 'params',
      field: fieldName,
      message: customMessage || `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`,
    },
  ]);
};

/**
 * Convenience function for validating multiple parameters from params
 * @param fieldNames Array of field names in req.params
 * @example
 * validateParamsArray(['id', 'agentId'])
 */
export const validateParamsArray = (fieldNames: string[]) => {
  return validateParams(
    fieldNames.map((field) => ({
      source: 'params' as ValidationSource,
      field,
    }))
  );
};

/**
 * Convenience function for validating a query parameter
 * @param fieldName The field name in req.query
 * @param customMessage Optional custom error message
 * @example
 * validateQuery('agent_id', 'Agent ID is required')
 */
export const validateQuery = (fieldName: string, customMessage?: string) => {
  return validateParams([
    {
      source: 'query',
      field: fieldName,
      message: customMessage || `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`,
    },
  ]);
};
