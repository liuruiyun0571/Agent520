const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const { error } = require('../utils/response');

// JWT认证中间件
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json(error(401, '未提供访问令牌'));
    }

    const decoded = jwt.verify(token, authConfig.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json(error(401, '令牌无效或已过期'));
  }
};

// 角色权限检查
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(error(401, '未认证'));
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(error(403, '权限不足'));
    }
    
    next();
  };
};

module.exports = { auth, checkRole };
