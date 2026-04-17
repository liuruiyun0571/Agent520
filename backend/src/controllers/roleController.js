/**
 * 角色控制器
 */

const { Role, User, UserRole } = require('../models');
const { Op } = require('sequelize');

const roleController = {
  // 获取角色列表
  async getList(req, res) {
    try {
      const { keyword, page = 1, limit = 50 } = req.query;
      
      const where = {};
      if (keyword) {
        where[Op.or] = [
          { roleCode: { [Op.iLike]: `%${keyword}%` } },
          { roleName: { [Op.iLike]: `%${keyword}%` } }
        ];
      }
      
      const { count, rows } = await Role.findAndCountAll({
        where,
        order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
        offset: (page - 1) * limit,
        limit: parseInt(limit)
      });
      
      res.json({
        code: 200,
        success: true,
        data: {
          list: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('获取角色列表失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '获取角色列表失败'
      });
    }
  },

  // 获取角色详情
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      const role = await Role.findByPk(id, {
        include: [{
          model: User,
          as: 'users',
          attributes: ['id', 'username', 'empId'],
          through: { attributes: [] }
        }]
      });
      
      if (!role) {
        return res.status(404).json({
          code: 404,
          success: false,
          message: '角色不存在'
        });
      }
      
      res.json({
        code: 200,
        success: true,
        data: role
      });
    } catch (error) {
      console.error('获取角色详情失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '获取角色详情失败'
      });
    }
  },

  // 创建角色
  async create(req, res) {
    try {
      const { roleCode, roleName, description, permissions, dataScope, sortOrder } = req.body;
      
      // 检查角色编码是否已存在
      const existing = await Role.findOne({ where: { roleCode } });
      if (existing) {
        return res.status(400).json({
          code: 400,
          success: false,
          message: '角色编码已存在'
        });
      }
      
      const role = await Role.create({
        roleCode,
        roleName,
        description,
        permissions: permissions || [],
        dataScope: dataScope || 'personal',
        sortOrder: sortOrder || 0
      });
      
      res.json({
        code: 200,
        success: true,
        message: '创建成功',
        data: role
      });
    } catch (error) {
      console.error('创建角色失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '创建角色失败'
      });
    }
  },

  // 更新角色
  async update(req, res) {
    try {
      const { id } = req.params;
      const { roleName, description, permissions, dataScope, sortOrder } = req.body;
      
      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({
          code: 404,
          success: false,
          message: '角色不存在'
        });
      }
      
      // 系统角色不允许修改编码
      if (role.isSystem) {
        return res.status(403).json({
          code: 403,
          success: false,
          message: '系统内置角色不允许修改'
        });
      }
      
      await role.update({
        roleName,
        description,
        permissions,
        dataScope,
        sortOrder
      });
      
      res.json({
        code: 200,
        success: true,
        message: '更新成功',
        data: role
      });
    } catch (error) {
      console.error('更新角色失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '更新角色失败'
      });
    }
  },

  // 删除角色
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({
          code: 404,
          success: false,
          message: '角色不存在'
        });
      }
      
      if (role.isSystem) {
        return res.status(403).json({
          code: 403,
          success: false,
          message: '系统内置角色不允许删除'
        });
      }
      
      await role.destroy();
      
      res.json({
        code: 200,
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      console.error('删除角色失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '删除角色失败'
      });
    }
  },

  // 分配角色给用户
  async assignToUser(req, res) {
    try {
      const { userId, roleIds } = req.body;
      
      // 删除现有角色关联
      await UserRole.destroy({ where: { userId } });
      
      // 创建新的角色关联
      if (roleIds?.length > 0) {
        const userRoles = roleIds.map(roleId => ({
          userId,
          roleId
        }));
        await UserRole.bulkCreate(userRoles);
      }
      
      res.json({
        code: 200,
        success: true,
        message: '角色分配成功'
      });
    } catch (error) {
      console.error('分配角色失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '分配角色失败'
      });
    }
  },

  // 获取所有权限列表（用于前端选择）
  async getAllPermissions(req, res) {
    // 预定义的权限列表
    const permissions = [
      { code: '*', name: '超级管理员', description: '拥有所有权限' },
      
      // 项目管理权限
      { code: 'project:view', name: '查看项目', module: '项目管理' },
      { code: 'project:create', name: '创建项目', module: '项目管理' },
      { code: 'project:edit', name: '编辑项目', module: '项目管理' },
      { code: 'project:delete', name: '删除项目', module: '项目管理' },
      { code: 'project:allocate', name: '分配团队', module: '项目管理' },
      
      // 回款管理权限
      { code: 'payment:view', name: '查看回款', module: '回款管理' },
      { code: 'payment:create', name: '登记回款', module: '回款管理' },
      { code: 'payment:approve', name: '审批回款', module: '回款管理' },
      
      // 成本管理权限
      { code: 'cost:view', name: '查看成本', module: '成本管理' },
      { code: 'cost:create', name: '登记成本', module: '成本管理' },
      { code: 'cost:edit', name: '编辑成本', module: '成本管理' },
      { code: 'cost:confirm', name: '确认成本', module: '成本管理' },
      { code: 'cost:import', name: '导入成本', module: '成本管理' },
      
      // 人员管理权限
      { code: 'employee:view', name: '查看人员', module: '人员管理' },
      { code: 'employee:create', name: '添加人员', module: '人员管理' },
      { code: 'employee:edit', name: '编辑人员', module: '人员管理' },
      { code: 'employee:delete', name: '删除人员', module: '人员管理' },
      { code: 'employee:transfer', name: '人员调岗', module: '人员管理' },
      
      // 组织管理权限
      { code: 'org:view', name: '查看组织', module: '组织架构' },
      { code: 'org:create', name: '创建组织', module: '组织架构' },
      { code: 'org:edit', name: '编辑组织', module: '组织架构' },
      { code: 'org:delete', name: '删除组织', module: '组织架构' },
      
      // 系统管理权限
      { code: 'system:config', name: '系统配置', module: '系统管理' },
      { code: 'system:role', name: '角色管理', module: '系统管理' },
      { code: 'system:user', name: '用户管理', module: '系统管理' },
      { code: 'system:log', name: '操作日志', module: '系统管理' },
      { code: 'system:data-factory', name: '数据工厂', module: '系统管理' }
    ];
    
    res.json({
      code: 200,
      success: true,
      data: permissions
    });
  }
};

module.exports = roleController;
