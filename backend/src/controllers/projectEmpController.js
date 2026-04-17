const { validationResult } = require('express-validator');
const { ProjectEmp, Project, Employee, OrgStructure } = require('../models');
const { success, error } = require('../utils/response');
const dayjs = require('dayjs');

class ProjectEmpController {
  // 获取项目人员列表
  async getList(req, res) {
    try {
      const { projectId, status } = req.query;
      const where = {};
      if (projectId) where.projectId = projectId;
      if (status) where.status = status;

      const list = await ProjectEmp.findAll({
        where,
        include: [
          { model: Project, attributes: ['projectId', 'projectName'] },
          { model: Employee, as: 'employee', attributes: ['empId', 'name', 'orgId'] }
        ],
        order: [['joinDate', 'DESC']]
      });

      res.json(success(list));
    } catch (err) {
      res.status(500).json(error(500, '获取项目人员失败', err.message));
    }
  }

  // 添加项目人员
  async create(req, res) {
    try {
      const { projectId, empId, roleType, joinDate } = req.body;

      // 生成entryId
      const last = await ProjectEmp.findOne({ order: [['entryId', 'DESC']] });
      const lastNum = last ? parseInt(last.entryId.slice(2)) : 0;
      const newId = `PE${String(lastNum + 1).padStart(6, '0')}`;

      // 校验人员是否已在此项目中
      const existing = await ProjectEmp.findOne({
        where: { projectId, empId, status: '进行中' }
      });
      if (existing) {
        return res.status(400).json(error(400, '该人员已在此项目中'));
      }

      const entry = await ProjectEmp.create({
        entryId: newId,
        projectId,
        empId,
        roleType,
        joinDate: joinDate || dayjs().format('YYYY-MM-DD'),
        status: '进行中'
      });

      res.status(201).json(success(entry, '添加成功'));
    } catch (err) {
      res.status(500).json(error(500, '添加项目人员失败', err.message));
    }
  }

  // 更新/退出项目
  async update(req, res) {
    try {
      const { id } = req.params;
      const entry = await ProjectEmp.findOne({ where: { entryId: id } });
      
      if (!entry) {
        return res.status(404).json(error(404, '记录不存在'));
      }

      // 如果标记为退出
      if (req.body.status === '已退出' && !req.body.leaveDate) {
        req.body.leaveDate = dayjs().format('YYYY-MM-DD');
      }

      await entry.update(req.body);
      res.json(success(entry, '更新成功'));
    } catch (err) {
      res.status(500).json(error(500, '更新失败', err.message));
    }
  }

  // 删除
  async delete(req, res) {
    try {
      const { id } = req.params;
      const entry = await ProjectEmp.findOne({ where: { entryId: id } });
      if (!entry) {
        return res.status(404).json(error(404, '记录不存在'));
      }
      await entry.destroy();
      res.json(success(null, '删除成功'));
    } catch (err) {
      res.status(500).json(error(500, '删除失败', err.message));
    }
  }
}

module.exports = new ProjectEmpController();
