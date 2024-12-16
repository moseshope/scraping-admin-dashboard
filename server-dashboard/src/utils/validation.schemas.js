const { check, validationResult } = require('express-validator');

const registerSchema = [
  check('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  check('password')
    .trim()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter'),
  
  check('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  
  check('role')
    .optional()
    .trim()
    .isIn(['user', 'admin'])
    .withMessage('Invalid role specified'),
];

const loginSchema = [
  check('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  check('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required'),
];

const updateProfileSchema = [
  check('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  
  check('role')
    .optional()
    .trim()
    .isIn(['user', 'admin'])
    .withMessage('Invalid role specified'),
];

const changePasswordSchema = [
  check('currentPassword')
    .trim()
    .notEmpty()
    .withMessage('Current password is required'),
  
  check('newPassword')
    .trim()
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('New password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('New password must contain at least one letter')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  
  check('confirmPassword')
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const createProjectSchema = [
  check('projectName')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 200 })
    .withMessage('Project name must not exceed 200 characters'),

  check('entireScraping')
    .optional()
    .isBoolean()
    .withMessage('Entire scraping must be a boolean'),

  check('highPriority')
    .optional()
    .isBoolean()
    .withMessage('High priority must be a boolean'),

  check('taskCount')
    .notEmpty()
    .withMessage('Task count is required')
    .isInt({ min: 1 })
    .withMessage('Task count must be a positive integer'),

  check('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),

  check('customQuery')
    .optional()
    .isString()
    .withMessage('Custom query must be a string'),

  check('selectedStates')
    .optional()
    .isArray()
    .withMessage('Selected states must be an array'),

  check('cities')
    .optional()
    .isArray()
    .withMessage('Cities must be an array'),

  check('businessTypes')
    .optional()
    .isArray()
    .withMessage('Business types must be an array'),
];

const updateProjectStatusSchema = [
  check('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'running', 'completed', 'failed', 'paused'])
    .withMessage('Invalid status'),

  check('success')
    .optional()
    .isBoolean()
    .withMessage('Success must be a boolean'),
];

const validateResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  createProjectSchema,
  updateProjectStatusSchema,
  validateResults
};