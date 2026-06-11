import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/error.util.js';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true, //because we dont trust input from the user,we remove fields that aren't in the schema
    });

    if (error) {
      const message = error.details
        .map((detail) => detail.context?.message || detail.message)
        .join(', ');
      next(new ValidationError(message));
      return;
    }

    req.body = value;
    next();
  };
};
