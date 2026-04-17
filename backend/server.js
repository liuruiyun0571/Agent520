require('dotenv').config();
const express = require('express');
const path = require('path');
const app = require('./src/app');
const { syncDatabase } = require('./src/models');
const { initDatabase } = require('./scripts/initDatabase');
const cronJobs = require('./src/cron');

const PORT = process.env.PORT || 3000;

// 启动服务器
const startServer = async () => {
  try {
    // 初始化数据库
    console.log('🗄️ 初始化数据库...');
    await initDatabase();
    
    // 生产环境：提供前端静态文件
    if (process.env.NODE_ENV === 'production') {
      const staticPath = path.join(__dirname, '../frontend/dist');
      app.use(express.static(staticPath));
      
      // 所有路由都指向前端
      app.get('*', (req, res) => {
        res.sendFile(path.join(staticPath, 'index.html'));
      });
      console.log('📁 静态文件服务已启用:', staticPath);
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📚 健康检查: http://localhost:${PORT}/health`);
      
      // 启动数据工厂定时任务
      if (process.env.ENABLE_CRON_JOBS !== 'false') {
        cronJobs.startAllJobs();
      } else {
        console.log('⏸️ 定时任务已禁用');
      }
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  cronJobs.stopAllJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  cronJobs.stopAllJobs();
  process.exit(0);
});

startServer();
