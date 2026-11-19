class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const DB_DOWN = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ENOTFOUND',
  'ECONNRESET', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'];

function notFound(req, res, next) {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}]`, err.code || '', err.message);

  if (err instanceof AppError)
    return res.status(err.status).json({ success: false, message: err.message });
  if (err.type === 'entity.parse.failed')
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  if (DB_DOWN.includes(err.code))
    return res.status(503).json({ success: false, message: 'Database is currently unavailable. Please try again later.' });

  const map = {
    ER_DUP_ENTRY: [409, 'A record with this unique value (e.g. phone number or name) already exists'],
    ER_ROW_IS_REFERENCED_2: [409, 'Cannot delete: this record is referenced by other records (e.g. purchases or sales)'],
    ER_NO_REFERENCED_ROW_2: [400, 'A referenced record (supplier, vendor or fruit) does not exist'],
    ER_CHECK_CONSTRAINT_VIOLATED: [400, 'Value violates a database constraint (e.g. negative stock)'],
    ER_DATA_TOO_LONG: [400, 'A value is too long for its field'],
    ER_BAD_NULL_ERROR: [400, 'A required field is missing'],
    WARN_DATA_TRUNCATED: [400, 'Invalid value supplied for a field'],
  };
  if (map[err.code]) return res.status(map[err.code][0]).json({ success: false, message: map[err.code][1] });

  res.status(500).json({ success: false, message: 'Internal server error' });
}

module.exports = { AppError, notFound, errorHandler };
