const { GlobalConfig } = require('../models');
const { success, error } = require('../utils/response');

class ConfigController {
  // 获取配置
  async get(req, res) {
    try {
      let config = await GlobalConfig.findOne();
      
      // 如果没有则自动创建
      if (!config) {
        config = await GlobalConfig.create({ configId: 'CFG001' });
      }
      
      res.json(success(config));
    } catch (err) {
      res.status(500).json(error(500, '获取配置失败', err.message));
    }
  }

  // 更新配置
  async update(req, res) {
    try {
      let config = await GlobalConfig.findOne();
      
      if (!config) {
        config = await GlobalConfig.create({ configId: 'CFG001', ...req.body });
      } else {
        await config.update(req.body);
      }
      
      res.json(success(config, '配置更新成功'));
    } catch (err) {
      res.status(500).json(error(500, '更新配置失败', err.message));
    }
  }
}

module.exports = new ConfigController();
