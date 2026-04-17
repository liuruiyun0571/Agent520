const { validationResult } = require('express-validator');
const { Project, ProjectTeam, OrgStructure } = require('../models');
const { success, error } = require('../utils/response');
const dayjs = require('dayjs');

class ProjectController {
  // 获取列表
  async getList(req, res) {
    try {
      const { page = 1, limit = 20, status, keyword } = req.query;
      const where = {};
      
      if (status) where.projectStatus = status;
      if (keyword) {
        where[require('sequelize').Op.or] = [
          { projectName: { [require('sequelize').Op.iLike]: `%${keyword}%` } },
          { customerName: { [require('sequelize').Op.iLike]: `%${keyword}%` } }
        ];
      }

      const { count, rows } = await Project.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['created_at', 'DESC']]
      });

      res.json(success({
        list: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }));
    } catch (err) {
      res.status(500).json(error(500, '获取项目列表失败', err.message));
    }
  }

  // 获取单个
  async getById(req, res) {
    try {
      const { id } = req.params;
      const project = await Project.findOne({
        where: { projectId: id },
        include: [{
          model: ProjectTeam,
          include: [{
            model: OrgStructure,
            as: 'organization',
            attributes: ['orgId', 'orgName']
          }]
        }]
      });
      
      if (!project) {
        return res.status(404).json(error(404, '项目不存在'));
      }
      
      res.json(success(project));
    } catch (err) {
      res.status(500).json(error(500, '获取项目失败', err.message));
    }
  }

  // 创建
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(error(400, '参数校验失败', errors.array()));
      }

      const { projectName, contractAmount, paymentNodes = [] } = req.body;

      // 校验支付节点比例合计
      const totalRatio = paymentNodes.reduce((sum, node) => sum + (parseInt(node.paymentRatio) || 0), 0);
      if (totalRatio !== 100) {
        return res.status(400).json(error(400, `支付节点付款比例合计必须等于100%，当前合计${totalRatio}%`));
      }

      // 生成projectId: XM2024001格式
      const year = dayjs().year();
      const lastProject = await Project.findOne({
        where: { projectId: { [require('sequelize').Op.like]: `XM${year}%` } },
        order: [['projectId', 'DESC']]
      });
      const lastNum = lastProject ? parseInt(lastProject.projectId.slice(-3)) : 0;
      const newId = `XM${year}${String(lastNum + 1).padStart(3, '0')}`;

      const project = await Project.create({
        ...req.body,
        projectId: newId,
        remainingReceivable: contractAmount
      });

      res.status(201).json(success(project, '创建成功'));
    } catch (err) {
      res.status(500).json(error(500, '创建项目失败', err.message));
    }
  }

  // 更新
  async update(req, res) {
    try {
      const { id } = req.params;
      const project = await Project.findOne({ where: { projectId: id } });
      
      if (!project) {
        return res.status(404).json(error(404, '项目不存在'));
      }

      // 如果更新支付节点,校验比例
      if (req.body.paymentNodes) {
        const totalRatio = req.body.paymentNodes.reduce((sum, node) => sum + (parseInt(node.paymentRatio) || 0), 0);
        if (totalRatio !== 100) {
          return res.status(400).json(error(400, `支付节点付款比例合计必须等于100%，当前合计${totalRatio}%`));
        }
      }

      await project.update(req.body);
      res.json(success(project, '更新成功'));
    } catch (err) {
      res.status(500).json(error(500, '更新项目失败', err.message));
    }
  }

  // 删除
  async delete(req, res) {
    try {
      const { id } = req.params;
      const project = await Project.findOne({ where: { projectId: id } });
      
      if (!project) {
        return res.status(404).json(error(404, '项目不存在'));
      }

      await project.destroy();
      res.json(success(null, '删除成功'));
    } catch (err) {
      res.status(500).json(error(500, '删除项目失败', err.message));
    }
  }

  // 分配团队
  async allocateTeams(req, res) {
    try {
      const { id } = req.params;
      const { allocations } = req.body; // [{ orgId, ratio, isMainTeam }]

      // 校验比例合计
      const totalRatio = allocations.reduce((sum, a) => sum + parseInt(a.ratio), 0);
      if (totalRatio > 100) {
        return res.status(400).json(error(400, `团队分配比例合计不能超过100%，当前${totalRatio}%`));
      }

      const results = [];
      for (const alloc of allocations) {
        const lastAlloc = await ProjectTeam.findOne({ order: [['allocationId', 'DESC']] });
        const lastNum = lastAlloc ? parseInt(lastAlloc.allocationId.slice(2)) : 0;
        const newId = `PT${String(lastNum + 1).padStart(6, '0')}`;

        const pt = await ProjectTeam.create({
          allocationId: newId,
          projectId: id,
          orgId: alloc.orgId,
          allocationRatio: alloc.ratio,
          effectiveDate: dayjs().format('YYYY-MM-DD'),
          isMainTeam: alloc.isMainTeam || false
        });
        results.push(pt);
      }

      res.json(success(results, '分配成功'));
    } catch (err) {
      res.status(500).json(error(500, '分配团队失败', err.message));
    }
  }
}

module.exports = new ProjectController();
