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
  check('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 200 })
    .withMessage('Project name must not exceed 200 characters'),

  check('settings')
    .isObject()
    .withMessage('Settings must be an object'),

  check('settings.entireScraping')
    .isBoolean()
    .withMessage('Entire scraping must be a boolean'),

  check('settings.highPriority')
    .isBoolean()
    .withMessage('High priority must be a boolean'),

  check('settings.taskCount')
    .isInt({ min: 1 })
    .withMessage('Task count must be a positive integer'),

  check('settings.startDate')
    .isISO8601()
    .withMessage('Invalid start date format'),

  check('settings.customQuery')
    .optional()
    .isString()
    .withMessage('Custom query must be a string'),

  check('filters')
    .isObject()
    .withMessage('Filters must be an object'),

  check('filters.states')
    .isArray()
    .withMessage('States must be an array'),

  check('filters.cities')
    .isArray()
    .withMessage('Cities must be an array'),

  check('filters.businessTypes')
    .isArray()
    .withMessage('Business types must be an array'),

  check('queryCount')
    .isInt({ min: 0 })
    .withMessage('Query count must be a non-negative integer'),

  check('queryIds')
    .isArray()
    .withMessage('Query IDs must be an array'),

  check('scrapingTasks')
    .isArray()
    .withMessage('Scraping tasks must be an array'),

  check('scrapingTasks.*.taskArn')
    .isString()
    .withMessage('Task ARN must be a string'),

  check('scrapingTasks.*.taskDefinitionArn')
    .isString()
    .withMessage('Task definition ARN must be a string'),

  check('scrapingTasks.*.lastStatus')
    .isString()
    .withMessage('Last status must be a string'),

  check('scrapingTasks.*.createdAt')
    .optional()
    .isString()
    .withMessage('Created at must be a string'),

  check('scrapingTasks.*.desiredStatus')
    .isString()
    .withMessage('Desired status must be a string'),

  check('scrapingTasks.*.group')
    .optional()
    .isString()
    .withMessage('Group must be a string'),

  check('scrapingTasks.*.launchType')
    .isString()
    .withMessage('Launch type must be a string'),

  check('scrapingTasks.*.containers')
    .optional()
    .isArray()
    .withMessage('Containers must be an array'),

  check('scrapingTasks.*.containers.*.name')
    .optional()
    .isString()
    .withMessage('Container name must be a string'),

  check('scrapingTasks.*.containers.*.lastStatus')
    .optional()
    .isString()
    .withMessage('Container last status must be a string'),
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