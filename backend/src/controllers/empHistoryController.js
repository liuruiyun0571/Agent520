const { validationResult } = require('express-validator');
const { EmpHistory, Employee, OrgStructure } = require('../models');
const { success, error } = require('../utils/response');
const dayjs = require('dayjs');

class EmpHistoryController {
  // 获取人员调岗历史
  async getList(req, res) {
    try {
      const { empId } = req.query;
      const where = {};
      if (empId) where.empId = empId;

      const list = await EmpHistory.findAll({
        where,
        include: [
          { model: Employee, attributes: ['empId', 'name'] },
          { model: OrgStructure, as: 'newOrg', attributes: ['orgId', 'orgName'] }
        ],
        order: [['transferDate', 'DESC']]
      });

      res.json(success(list));
    } catch (err) {
      res.status(500).json(error(500, '获取历史记录失败', err.message));
    }
  }

  // 创建调岗记录
  async create(req, res) {
    try {
      const { empId, newOrgId, transferDate, transferReason, costShareRatio = 1.00 } = req.body;

      const employee = await Employee.findOne({ where: { empId } });
      if (!employee) {
        return res.status(404).json(error(404, '人员不存在'));
      }

      // 生成recordId
      const last = await EmpHistory.findOne({ order: [['recordId', 'DESC']] });
      const lastNum = last ? parseInt(last.recordId.slice(2)) : 0;
      const newId = `EH${String(lastNum + 1).padStart(6, '0')}`;

      const record = await EmpHistory.create({
        recordId: newId,
        empId,
        employeeName: employee.name,
        oldOrgId: employee.orgId,
        newOrgId,
        transferDate,
        transferReason,
        originalOrg: employee.orgId,
        targetOrg: newOrgId,
        costShareRatio,
        shareExpiryDate: dayjs(transferDate).add(12, 'month').format('YYYY-MM-DD')
      });

      // 更新人员当前组织
      await employee.update({ orgId: newOrgId });

      res.status(201).json(success(record, '调岗成功'));
    } catch (err) {
      res.status(500).json(error(500, '创建调岗记录失败', err.message));
    }
  }

  // 更新成本分摊
  async updateShareRatio(req, res) {
    try {
      const { id } = req.params;
      const { costShareRatio, shareExpiryDate } = req.body;

      const record = await EmpHistory.findOne({ where: { recordId: id } });
      if (!record) {
        return res.status(404).json(error(404, '记录不存在'));
      }

      await record.update({ costShareRatio, shareExpiryDate });
      res.json(success(record, '更新成功'));
    } catch (err) {
      res.status(500).json(error(500, '更新失败', err.message));
    }
  }
}

module.exports = new EmpHistoryController();
