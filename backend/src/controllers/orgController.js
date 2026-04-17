const { validationResult } = require('express-validator');
const { OrgStructure } = require('../models');
const { success, error } = require('../utils/response');

class OrgController {
  // 获取组织架构树
  async getTree(req, res) {
    try {
      const orgs = await OrgStructure.findAll({
        include: [{
          model: OrgStructure,
          as: 'childOrgs',
          required: false
        }],
        order: [['orgId', 'ASC']]
      });

      // 构建树形结构
      const buildTree = (parentId = null) => {
        return orgs
          .filter(org => org.parentOrgId === parentId)
          .map(org => ({
            ...org.toJSON(),
            children: buildTree(org.orgId)
          }));
      };

      const tree = buildTree();
      res.json(success(tree));
    } catch (err) {
      res.status(500).json(error(500, '获取组织架构失败', err.message));
    }
  }

  // 获取列表 (带分页)
  async getList(req, res) {
    try {
      const { page = 1, limit = 20, orgType, status, keyword } = req.query;
      const where = {};
      
      if (orgType) where.orgType = orgType;
      if (status) where.currentStatus = status;
      if (keyword) {
        where.orgName = { [require('sequelize').Op.iLike]: `%${keyword}%` };
      }

      const { count, rows } = await OrgStructure.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['orgId', 'ASC']]
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
      res.status(500).json(error(500, '获取组织列表失败', err.message));
    }
  }

  // 获取单个
  async getById(req, res) {
    try {
      const { id } = req.params;
      const org = await OrgStructure.findOne({
        where: { orgId: id },
        include: [{
          model: OrgStructure,
          as: 'parentOrg'
        }]
      });
      
      if (!org) {
        return res.status(404).json(error(404, '组织不存在'));
      }
      
      res.json(success(org));
    } catch (err) {
      res.status(500).json(error(500, '获取组织失败', err.message));
    }
  }

  // 创建
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(error(400, '参数校验失败', errors.array()));
      }

      // 生成orgId
      const lastOrg = await OrgStructure.findOne({
        where: { orgType: req.body.orgType },
        order: [['orgId', 'DESC']]
      });
      
      const prefix = req.body.orgType === '分院' ? 'D' : 'T';
      const lastNum = lastOrg ? parseInt(lastOrg.orgId.slice(1)) : 0;
      const newId = `${prefix}${String(lastNum + 1).padStart(3, '0')}`;

      const org = await OrgStructure.create({
        ...req.body,
        orgId: newId
      });

      res.status(201).json(success(org, '创建成功'));
    } catch (err) {
      res.status(500).json(error(500, '创建组织失败', err.message));
    }
  }

  // 更新
  async update(req, res) {
    try {
      const { id } = req.params;
      const org = await OrgStructure.findOne({ where: { orgId: id } });
      
      if (!org) {
        return res.status(404).json(error(404, '组织不存在'));
      }

      await org.update(req.body);
      res.json(success(org, '更新成功'));
    } catch (err) {
      res.status(500).json(error(500, '更新组织失败', err.message));
    }
  }

  // 删除
  async delete(req, res) {
    try {
      const { id } = req.params;
      const org = await OrgStructure.findOne({ where: { orgId: id } });
      
      if (!org) {
        return res.status(404).json(error(404, '组织不存在'));
      }

      await org.destroy();
      res.json(success(null, '删除成功'));
    } catch (err) {
      res.status(500).json(error(500, '删除组织失败', err.message));
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
          // 生成orgId
          const lastOrg = await OrgStructure.findOne({
            where: { orgType: row['组织类型'] },
            order: [['orgId', 'DESC']]
          });
          const prefix = row['组织类型'] === '分院' ? 'D' : 'T';
          const lastNum = lastOrg ? parseInt(lastOrg.orgId.slice(1)) : 0;
          const newId = `${prefix}${String(lastNum + 1).padStart(3, '0')}`;

          await OrgStructure.create({
            orgId: newId,
            orgType: row['组织类型'],
            orgName: row['组织名称'],
            parentOrgId: row['父组织ID'],
            awardCoefficient: row['计奖系数'] || 0.75,
            managementCostRate: row['管理成本率'] || 0.15,
            startFundAmount: row['启动资金额度'] || 1000000,
            targetPerCapitaPerformance: row['目标人均绩效'] || 200000
          });
          results.success.push(row['组织名称']);
        } catch (err) {
          results.failed.push({ name: row['组织名称'], error: err.message });
        }
      }

      res.json(success(results, `导入完成: 成功${results.success.length}条, 失败${results.failed.length}条`));
    } catch (err) {
      res.status(500).json(error(500, '导入失败', err.message));
    }
  }
}

module.exports = new OrgController();
