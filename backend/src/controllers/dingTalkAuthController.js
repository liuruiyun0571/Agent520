/**
 * 钉钉登录控制器
 */

const jwt = require('jsonwebtoken');
const dingtalkAuth = require('../services/dingtalkAuth');
const { User, Role } = require('../models');
const authConfig = require('../config/auth');
const { success, error } = require('../utils/response');

class DingTalkAuthController {
  /**
   * 获取钉钉 JS-SDK 配置
   */
  async getJsConfig(req, res) {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json(error(400, '缺少 url 参数'));
      }

      const config = await dingtalkAuth.generateJsConfig(url);
      res.json(success(config));
    } catch (err) {
      console.error('获取 JS 配置失败:', err);
      res.status(500).json(error(500, '获取 JS 配置失败', err.message));
    }
  }

  /**
   * 钉钉扫码登录回调
   */
  async loginByCode(req, res) {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json(error(400, '缺少授权码'));
      }

      // 1. 获取钉钉用户信息
      const dingUser = await dingtalkAuth.getUserInfoByCode(code);
      console.log('[钉钉登录] 用户信息:', dingUser);

      // 2. 查找或创建系统用户
      let user = await User.findOne({
        where: { dingUserId: dingUser.userId },
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['roleCode', 'roleName', 'permissions', 'dataScope'],
          through: { attributes: [] }
        }]
      });

      if (!user) {
        // 新用户：自动创建账号
        user = await User.create({
          username: dingUser.mobile || dingUser.userId, // 用手机号作为用户名
          passwordHash: '', // 钉钉登录不需要密码
          role: '普通用户', // 默认角色
          empId: null, // 需要后续关联
          dingUserId: dingUser.userId,
          dingUnionId: dingUser.unionId,
          name: dingUser.name,
          avatar: dingUser.avatar,
          isActive: true
        });

        console.log('[钉钉登录] 自动创建用户:', user.id);
      } else {
        // 更新用户信息
        await user.update({
          name: dingUser.name,
          avatar: dingUser.avatar,
          lastLoginAt: new Date()
        });
      }

      // 3. 生成 JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      // 4. 返回用户信息
      const userData = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        empId: user.empId,
        avatar: user.avatar || dingUser.avatar,
        roles: user.roles || [],
        isNewUser: !user.empId // 标记是否需要完善信息
      };

      res.json(success({
        token,
        user: userData,
        dingUser: {
          name: dingUser.name,
          avatar: dingUser.avatar,
          title: dingUser.title
        }
      }, '登录成功'));
    } catch (err) {
      console.error('钉钉登录失败:', err);
      res.status(500).json(error(500, '钉钉登录失败', err.message));
    }
  }

  /**
   * 绑定钉钉账号（已有系统账号的用户）
   */
  async bindDingTalk(req, res) {
    try {
      const { code } = req.body;
      const userId = req.user.userId;

      const dingUser = await dingtalkAuth.getUserInfoByCode(code);
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json(error(404, '用户不存在'));
      }

      // 检查是否已被其他账号绑定
      const existing = await User.findOne({
        where: { dingUserId: dingUser.userId }
      });
      if (existing && existing.id !== userId) {
        return res.status(409).json(error(409, '该钉钉账号已被绑定'));
      }

      await user.update({
        dingUserId: dingUser.userId,
        dingUnionId: dingUser.unionId,
        name: dingUser.name,
        avatar: dingUser.avatar
      });

      res.json(success({
        name: dingUser.name,
        avatar: dingUser.avatar
      }, '绑定成功'));
    } catch (err) {
      console.error('绑定钉钉失败:', err);
      res.status(500).json(error(500, '绑定失败', err.message));
    }
  }
}

module.exports = new DingTalkAuthController();