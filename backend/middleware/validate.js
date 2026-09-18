const { validationResult } = require('express-validator');

// Runs after an array of express-validator checks. If any failed,
// responds 400 with a flat list of messages instead of letting bad
// input reach a controller.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = validate;
