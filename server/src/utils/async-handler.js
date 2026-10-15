/**
 * Wraps an async route handler to catch errors and pass them to next()
 * @param {Function} fn - Async express route handler
 * @returns {import('express').RequestHandler}
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
