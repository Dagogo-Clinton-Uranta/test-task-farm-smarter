import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from './response.util.js';
import { NotFoundError } from './error.util.js';

/**
 * Generic CRUD Handlers
 * Reusable handler functions for common CRUD operations
 */

/**
 * Generic Get by ID handler
 * @param getByIdFn Service function that retrieves entity by ID
 * @param paramName Parameter name in req.params (default: 'id')
 * @param successMessage Success message (default: 'Resource retrieved successfully')
 * @param transform Optional transformation function for the result
 */
export const createGetByIdHandler = <T = any>(
  getByIdFn: (id: string, ...args: any[]) => Promise<T | null>,
  paramName: string = 'id',
  successMessage: string = 'Resource retrieved successfully',
  transform?: (data: T) => any,
  beforeGet?: (req: Request, id: string) => Promise<void>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params[paramName]!;

      // Run pre-get checks if provided
      if (beforeGet) {
        await beforeGet(req, id);
      }

      const result = await getByIdFn(id);

      if (!result) {
        throw new NotFoundError('Resource not found');
      }

      const data = transform ? transform(result) : result;
      sendSuccess(res, data, successMessage);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Generic Update handler
 * @param updateFn Service function that updates entity
 * @param paramName Parameter name in req.params (default: 'id')
 * @param successMessage Success message (default: 'Resource updated successfully')
 * @param statusCode HTTP status code (default: 200)
 * @param beforeUpdate Optional function to run before update (e.g., authorization checks)
 * @param transformUpdateData Optional function to transform update data from request body
 */
export const createUpdateHandler = <T = any>(
  updateFn: (id: string, data: any) => Promise<T | void>,
  paramName: string = 'id',
  successMessage: string = 'Resource updated successfully',
  statusCode: number = 200,
  beforeUpdate?: (req: Request, id: string) => Promise<void>,
  transformUpdateData?: (req: Request) => any
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params[paramName]!;

      // Run pre-update checks if provided
      if (beforeUpdate) {
        await beforeUpdate(req, id);
      }

      // Transform update data if provided, otherwise use body as-is
      const updateData = transformUpdateData ? transformUpdateData(req) : req.body;

      await updateFn(id, updateData);
      sendSuccess(res, null, successMessage, statusCode);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Generic Delete handler (soft delete)
 * @param deleteFn Service function that deletes entity (or updates with is_deleted flag)
 * @param paramName Parameter name in req.params (default: 'id')
 * @param successMessage Success message (default: 'Resource deleted successfully')
 * @param beforeDelete Optional function to run before delete (e.g., authorization checks, fetch entity)
 * @param deleteData Optional data to pass to delete function. Can be a function that receives req to generate dynamic data (default: { is_deleted: true })
 */
export const createDeleteHandler = <T = any>(
  deleteFn: (id: string, data?: any) => Promise<T | void>,
  paramName: string = 'id',
  successMessage: string = 'Resource deleted successfully',
  beforeDelete?: (req: Request, id: string) => Promise<void>,
  deleteData: any | ((req: Request) => any) = { is_deleted: true }
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params[paramName]!;

      // Run pre-delete checks if provided
      if (beforeDelete) {
        await beforeDelete(req, id);
      }

      // If deleteData is a function, call it with req, otherwise use it directly
      const data = typeof deleteData === 'function' ? deleteData(req) : deleteData;
      await deleteFn(id, data);
      sendSuccess(res, null, successMessage, 204);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Generic handler that checks if entity exists before operation
 * Useful for operations that need to verify existence first
 */
export const createExistsCheckHandler = async <T = any>(
  getByIdFn: (id: string) => Promise<T | null>,
  id: string,
  entityName: string = 'Resource'
): Promise<T> => {
  const entity = await getByIdFn(id);
  if (!entity) {
    throw new NotFoundError(`${entityName} not found`);
  }
  return entity;
};
