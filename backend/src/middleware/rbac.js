/**
 * RBAC权限中间件
 * 支持角色和细粒度权限检查
 */

const { error } = require('../utils/response');
const { User, Role } = require('../models');

/**
 * 认证中间件 - 验证JWT令牌
 */
const authenticate = async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const authConfig = require('../config/auth');
    
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json(error(401, '未提供访问令牌'));
    }

    const decoded = jwt.verify(token, authConfig.jwtSecret);
    
    // 获取用户完整信息（包括角色）
    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['roleCode', 'roleName', 'permissions', 'dataScope']
      }]
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json(error(401, '用户不存在或已禁用'));
    }
    
    req.user = {
      id: user.id,
      username: user.username,
      empId: user.empId,
      roles: user.roles || [],
      // 合并所有角色的权限
      permissions: user.roles?.flatMap(r => r.permissions || []) || [],
      // 取最高级别的数据权限
      dataScope: user.roles?.reduce((max, r) => {
        const scopeLevel = { personal: 1, team: 2, dept: 3, all: 4 };
        return scopeLevel[r.dataScope] > scopeLevel[max] ? r.dataScope : max;
      }, 'personal') || 'personal'
    };
    
    next();
  } catch (err) {
    console.error('认证失败:', err);
    return res.status(401).json(error(401, '令牌无效或已过期'));
  }
};

/**
 * 角色检查中间件
 * @param  {...string} roles 允许的角色编码
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(error(401, '未认证'));
    }
    
    const userRoles = req.user.roles?.map(r => r.roleCode) || [];
    const hasRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json(error(403, '权限不足，需要角色: ' + roles.join(' 或 ')));
    }
    
    next();
  };
};

/**
 * 权限检查中间件
 * @param  {...string} permissions 需要的权限编码
 */
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(error(401, '未认证'));
    }
    
    const userPermissions = req.user.permissions || [];
    
    // 超级管理员拥有所有权限
    if (userPermissions.includes('*')) {
      return next();
    }
    
    const hasPermission = permissions.every(p => userPermissions.includes(p));
    
    if (!hasPermission) {
      return res.status(403).json(error(403, '权限不足，需要权限: ' + permissions.join(', ')));
    }
    
    next();
  };
};

/**
 * 数据权限过滤中间件
 * 根据用户的数据权限范围添加查询条件
 */
const dataScopeFilter = (options = {}) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(error(401, '未认证'));
    }
    
    const { scope } = req.user;
    const { orgIdField = 'orgId', userIdField = 'userId' } = options;
    
    // 将数据权限信息附加到请求对象
    req.dataScope = {
      scope,
      filter: {}
    };
    
    switch (scope) {
      case 'all':
        // 全部数据，不添加过滤条件
        break;
      case 'dept':
        // 部门数据，需要获取用户所在部门
        // 这里简化处理，实际应该查询用户部门及其子部门
        req.dataScope.filter[orgIdField] = req.user.orgId;
        break;
      case 'team':
        // 团队数据
        req.dataScope.filter[orgIdField] = req.user.orgId;
        break;
      case 'personal':
      default:
        // 个人数据
        req.dataScope.filter[userIdField] = req.user.id;
        break;
    }
    
    next();
  };
};

/**
 * 操作日志中间件
 * 自动记录API操作日志
 */
const operationLog = (options = {}) => {
  const { module, action, description } = options;
  
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalJson = res.json.bind(res);
    
    // 拦截响应
    res.json = function(data) {
      const endTime = Date.now();
      
      // 异步记录日志，不阻塞响应
      const { OperationLog } = require('../models');
      OperationLog.create({
        userId: req.user?.id,
        username: req.user?.username,
        module: module || req.baseUrl?.replace('/api/', '') || 'unknown',
        action: action || req.method?.toLowerCase(),
        description: typeof description === 'function' ? description(req, data) : description,
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        requestParams: { ...req.body, ...req.query },
        responseData: { code: data?.code, success: data?.success },
        ipAddress: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
        executionTime: endTime - startTime,
        status: data?.success ? 'success' : 'failed',
        errorMessage: data?.message
      }).catch(err => console.error('记录操作日志失败:', err));
      
      return originalJson(data);
    };
    
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  dataScopeFilter,
  operationLog
};
