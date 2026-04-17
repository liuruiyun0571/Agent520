const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User, Role } = require('../models');
const authConfig = require('../config/auth');
const { success, error } = require('../utils/response');

class AuthController {
  // 登录
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(error(400, '参数校验失败', errors.array()));
      }

      const { username, password } = req.body;
      
      // 查找用户（包含角色信息）
      const user = await User.findOne({
        where: { username, isActive: true },
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['roleCode', 'roleName', 'permissions', 'dataScope'],
          through: { attributes: [] }
        }]
      });
      
      if (!user) {
        return res.status(401).json(error(401, '用户名或密码错误'));
      }

      // 验证密码
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json(error(401, '用户名或密码错误'));
      }

      // 更新最后登录时间
      await user.update({ lastLoginAt: new Date() });

      // 生成JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      // 构建返回的用户信息
      const userData = {
        id: user.id,
        username: user.username,
        role: user.role, // 兼容旧版
        empId: user.empId,
        roles: user.roles || []
      };

      res.json(success({
        token,
        user: userData
      }, '登录成功'));
    } catch (err) {
      console.error('登录失败:', err);
      res.status(500).json(error(500, '登录失败', err.message));
    }
  }

  // 注册 (仅管理员可用)
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(error(400, '参数校验失败', errors.array()));
      }

      const { username, password, role = '普通用户', empId, roleIds } = req.body;

      // 检查用户是否已存在
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(409).json(error(409, '用户名已存在'));
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(password, authConfig.bcryptSaltRounds);

      // 创建用户
      const user = await User.create({
        username,
        passwordHash,
        role,
        empId
      });

      // 分配角色（如果提供了roleIds）
      if (roleIds?.length > 0) {
        const { UserRole } = require('../models');
        const userRoles = roleIds.map(roleId => ({
          userId: user.id,
          roleId
        }));
        await UserRole.bulkCreate(userRoles);
      }

      res.status(201).json(success({
        id: user.id,
        username: user.username,
        role: user.role
      }, '注册成功'));
    } catch (err) {
      console.error('注册失败:', err);
      res.status(500).json(error(500, '注册失败', err.message));
    }
  }

  // 获取当前用户信息
  async me(req, res) {
    try {
      const user = await User.findByPk(req.user.userId, {
        attributes: ['id', 'username', 'role', 'empId', 'lastLoginAt'],
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['roleCode', 'roleName', 'permissions', 'dataScope'],
          through: { attributes: [] }
        }]
      });
      
      if (!user) {
        return res.status(404).json(error(404, '用户不存在'));
      }

      res.json(success({
        id: user.id,
        username: user.username,
        role: user.role,
        empId: user.empId,
        lastLoginAt: user.lastLoginAt,
        roles: user.roles || []
      }));
    } catch (err) {
      res.status(500).json(error(500, '获取用户信息失败', err.message));
    }
  }

  // 修改密码
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      
      const user = await User.findByPk(req.user.userId);
      const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
      
      if (!isValid) {
        return res.status(401).json(error(401, '原密码错误'));
      }

      const newPasswordHash = await bcrypt.hash(newPassword, authConfig.bcryptSaltRounds);
      await user.update({ passwordHash: newPasswordHash });

      res.json(success(null, '密码修改成功'));
    } catch (err) {
      res.status(500).json(error(500, '修改密码失败', err.message));
    }
  }
}

module.exports = new AuthController();
