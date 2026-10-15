import { AppError } from '../utils/app-error.js';

/**
 * Validates request parameters, query, or body using custom validator functions
 * @param {Object} schema
 * @param {'body'|'query'|'params'} [target='body']
 */
export const validate = (schemaValidator, target = 'body') => (req, res, next) => {
  try {
    const data = req[target];
    const errors = schemaValidator(data);
    if (errors && errors.length > 0) {
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors));
    }
    next();
  } catch (err) {
    next(new AppError(`Validation error: ${err.message}`, 400, 'VALIDATION_ERROR'));
  }
};
