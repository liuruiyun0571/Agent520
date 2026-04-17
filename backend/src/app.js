const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const dingtalkAuthRoutes = require('./routes/dingtalkAuth');
const orgRoutes = require('./routes/org');
const employeeRoutes = require('./routes/employee');
const configRoutes = require('./routes/config');
const projectRoutes = require('./routes/project');
const paymentRoutes = require('./routes/payment');
const projectEmpRoutes = require('./routes/projectEmp');
const empHistoryRoutes = require('./routes/empHistory');
const monthlyCostRoutes = require('./routes/monthlyCost');
const dataFactoryRoutes = require('./routes/dataFactory');
const teamAccountRoutes = require('./routes/teamAccount');
const roleRoutes = require('./routes/role');
const notificationRoutes = require('./routes/notification');
const operationLogRoutes = require('./routes/operationLog');

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/dingtalk', dingtalkAuthRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/config', configRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/project-emps', projectEmpRoutes);
app.use('/api/emp-history', empHistoryRoutes);
app.use('/api/monthly-costs', monthlyCostRoutes);
app.use('/api/data-factory', dataFactoryRoutes);
app.use('/api/team-accounts', teamAccountRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/operation-logs', operationLogRoutes);

// 404处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: 500, message: err.message || '服务器内部错误' });
});

module.exports = app;
