const { body } = require('express-validator');

// 登录验证
const loginValidation = [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
];

// 注册验证
const registerValidation = [
  body('username').isLength({ min: 3, max: 20 }).withMessage('用户名长度3-20位'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  body('role').optional().isIn(['系统管理员', '部门管理员', '团队负责人', '项目经理', '普通用户'])
];

// 组织创建验证
const orgValidation = [
  body('orgType').notEmpty().isIn(['团队', '部门', '分院']),
  body('orgName').notEmpty().trim(),
  body('awardCoefficient').optional().isDecimal({ decimal_digits: '0,2' }).isFloat({ min: 0, max: 1 }),
  body('managementCostRate').optional().isDecimal({ decimal_digits: '0,2' }).isFloat({ min: 0, max: 1 }),
  body('startFundAmount').optional().isDecimal({ decimal_digits: '0,2' }),
  body('targetPerCapitaPerformance').optional().isDecimal({ decimal_digits: '0,2' })
];

// 人员创建验证
const employeeValidation = [
  body('name').notEmpty().trim(),
  body('orgId').notEmpty(),
  body('entryDate').notEmpty().isDate(),
  body('defaultCostStandard').optional().isDecimal(),
  body('defaultPerformanceBase').optional().isDecimal(),
  body('canCrossTeam').optional().isBoolean()
];

module.exports = {
  loginValidation,
  registerValidation,
  orgValidation,
  employeeValidation
};
