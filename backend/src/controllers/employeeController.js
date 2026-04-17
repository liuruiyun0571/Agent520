const { validationResult } = require('express-validator');
const { Employee, OrgStructure } = require('../models');
const { success, error } = require('../utils/response');

class EmployeeController {
  // 获取列表
  async getList(req, res) {
    try {
      const { page = 1, limit = 20, orgId, status, keyword, canCrossTeam } = req.query;
      const where = {};
      
      if (orgId) where.orgId = orgId;
      if (status) where.status = status;
      if (canCrossTeam !== undefined) where.canCrossTeam = canCrossTeam === 'true';
      if (keyword) {
        where[require('sequelize').Op.or] = [
          { name: { [require('sequelize').Op.iLike]: `%${keyword}%` } },
          { empId: { [require('sequelize').Op.iLike]: `%${keyword}%` } }
        ];
      }

      const { count, rows } = await Employee.findAndCountAll({
        where,
        include: [{
          model: OrgStructure,
          as: 'organization',
          attributes: ['orgId', 'orgName', 'orgType']
        }],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['empId', 'ASC']]
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
      res.status(500).json(error(500, '获取人员列表失败', err.message));
    }
  }

  // 获取单个
  async getById(req, res) {
    try {
      const { id } = req.params;
      const emp = await Employee.findOne({
        where: { empId: id },
        include: [{
          model: OrgStructure,
          as: 'organization'
        }]
      });
      
      if (!emp) {
        return res.status(404).json(error(404, '人员不存在'));
      }
      
      res.json(success(emp));
    } catch (err) {
      res.status(500).json(error(500, '获取人员失败', err.message));
    }
  }

  // 创建
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(error(400, '参数校验失败', errors.array()));
      }

      // 生成empId
      const lastEmp = await Employee.findOne({ order: [['empId', 'DESC']] });
      const lastNum = lastEmp ? parseInt(lastEmp.empId.slice(1)) : 0;
      const newId = `E${String(lastNum + 1).padStart(3, '0')}`;

      const emp = await Employee.create({
        ...req.body,
        empId: newId
      });

      res.status(201).json(success(emp, '创建成功'));
    } catch (err) {
      res.status(500).json(error(500, '创建人员失败', err.message));
    }
  }

  // 更新 (包含调岗逻辑)
  async update(req, res) {
    try {
      const { id } = req.params;
      const emp = await Employee.findOne({ where: { empId: id } });
      
      if (!emp) {
        return res.status(404).json(error(404, '人员不存在'));
      }

      const oldOrgId = emp.orgId;
      const newOrgId = req.body.orgId;

      await emp.update(req.body);

      // 调岗历史记录由数据库触发器自动处理
      if (oldOrgId !== newOrgId && newOrgId) {
        console.log(`人员 ${emp.name} 从 ${oldOrgId} 调岗至 ${newOrgId}`);
      }

      res.json(success(emp, '更新成功'));
    } catch (err) {
      res.status(500).json(error(500, '更新人员失败', err.message));
    }
  }

  // 删除
  async delete(req, res) {
    try {
      const { id } = req.params;
      const emp = await Employee.findOne({ where: { empId: id } });
      
      if (!emp) {
        return res.status(404).json(error(404, '人员不存在'));
      }

      await emp.destroy();
      res.json(success(null, '删除成功'));
    } catch (err) {
      res.status(500).json(error(500, '删除人员失败', err.message));
    }
  }

  // Excel导入
  async importExcel(req, res) {
    try {
      const xlsx = require('xlsx');
      const workbook = xlsx.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);

      const results = { success: [], failed: [] };

      for (const row of data) {
        try {
          // 生成empId
          const lastEmp = await Employee.findOne({ order: [['empId', 'DESC']] });
          const lastNum = lastEmp ? parseInt(lastEmp.empId.slice(1)) : 0;
          const newId = `E${String(lastNum + 1).padStart(3, '0')}`;

          await Employee.create({
            empId: newId,
            name: row['姓名'],
            orgId: row['组织ID'],
            email: row['邮箱'],
            phone: row['手机号码'],
            entryDate: row['入职日期'],
            status: row['状态'] || '在职',
            defaultCostStandard: row['默认成本标准'] || 30000,
            defaultPerformanceBase: row['默认绩效基数'] || 5000,
            canCrossTeam: row['是否可跨团队'] === '是'
          });
          results.success.push(row['姓名']);
        } catch (err) {
          results.failed.push({ name: row['姓名'], error: err.message });
        }
      }

      res.json(success(results, `导入完成: 成功${results.success.length}条, 失败${results.failed.length}条`));
    } catch (err) {
      res.status(500).json(error(500, '导入失败', err.message));
    }
  }
}

module.exports = new EmployeeController();
