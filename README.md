# 云工程绩效管理系统

基于 Vue3 + Express + PostgreSQL 的绩效管理系统，支持跨团队成本拆分、回款奖金自动分配、数据工厂定时任务等功能。

## 功能特性

- 📊 **组织架构管理** - 支持多层级组织架构，团队独立核算
- 👥 **人员管理** - 支持跨团队人员标记、调岗历史记录
- 📁 **项目管理** - 项目立项、多团队分配、回款跟踪
- 💰 **回款管理** - 回款审批流程、自动奖金分配
- 🏭 **数据工厂** - 定时任务调度、自动结算、超支预警
- 📈 **数据可视化** - 院领导驾驶舱、团队看板、报表中心
- 🔐 **RBAC权限** - 角色权限控制、数据权限范围、操作审计
- 🔔 **通知集成** - 站内消息、钉钉通知

## 技术栈

### 后端
- **Node.js** 18+ / Express 4
- **Sequelize** ORM 框架
- **PostgreSQL** 数据库
- **JWT** 认证
- **node-cron** 定时任务

### 前端
- **Vue 3** Composition API
- **Vant 4** 移动端 UI 框架
- **Pinia** 状态管理
- **ECharts** 数据可视化
- **Axios** HTTP 客户端

## 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 14+
- Docker (可选)

### 本地开发

```bash
# 1. 克隆项目
git clone <repo-url>
cd cloud-engineering-performance

# 2. 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 3. 配置数据库
cp backend/.env.example backend/.env
# 编辑 backend/.env 配置数据库连接

# 4. 启动后端
cd backend
npm run dev

# 5. 启动前端
cd frontend
npm run dev
```

### Docker 部署

```bash
# 1. 配置环境
cp .env.example .env
# 编辑 .env 配置

# 2. 启动服务
docker-compose up -d

# 3. 初始化数据库
docker-compose exec backend node scripts/initDatabase.js
```

详细部署说明见 [docs/DEPLOY.md](docs/DEPLOY.md)

## 项目结构

```
cloud-engineering-performance/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由
│   │   ├── services/       # 业务服务
│   │   ├── utils/          # 工具函数
│   │   ├── app.js          # Express 应用
│   │   └── server.js       # 服务入口
│   ├── tests/              # 测试文件
│   ├── scripts/            # 脚本工具
│   └── Dockerfile
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── api/           # API 接口
│   │   ├── components/    # 公共组件
│   │   ├── router/        # 路由配置
│   │   ├── stores/        # Pinia 状态
│   │   ├── utils/         # 工具函数
│   │   ├── views/         # 页面视图
│   │   └── App.vue
│   └── Dockerfile
├── database/              # 数据库脚本
├── docs/                  # 文档
├── docker-compose.yml
└── README.md
```

## 核心算法

### 1. 成本拆分计算

```javascript
// 跨团队人员成本拆分
人员成本 = 月成本标准
分配金额 = 人员成本 × (项目分配比例 / 100)

// 调岗人员成本拆分
原部门天数 = 调岗日期 - 1
新部门天数 = 当月总天数 - 原部门天数
原部门成本 = 人员成本 × (原部门天数 / 当月总天数)
新部门成本 = 人员成本 × (新部门天数 / 当月总天数)
```

### 2. 奖金计算

```javascript
奖金 = 回款金额 
     × 毛利率 
     × (1 - 管理成本率) 
     × 计奖系数 
     × 分配比例
```

### 3. 透支检测

```javascript
期末余额 = 期初余额 + 本月回款奖金 - 本月成本消耗
透支比例 = ((期初余额 - 期末余额) / 期初余额) × 100%

if 透支比例 ≥ 100%: 账户冻结
if 透支比例 ≥ 80%:  发送预警
```

## API 文档

详见 [PROGRESS.md](PROGRESS.md) API清单部分。

## 定时任务

| 任务 | 调度 | 说明 |
|------|------|------|
| 日结任务 | 每日 01:00 | 汇总回款和成本 |
| 月度账户创建 | 每月1日 02:00 | 创建新账户并结转余额 |
| 超支检测 | 每日 03:00 | 检测超支并冻结/预警 |
| 月度结算 | 每月1日 04:00 | 月末完整结算 |
| 公积金划转 | 每月5日 02:30 | 盈利团队公积金划转 |
| 保护期检查 | 每周一 04:00 | 检查冻结团队保护期 |

## 默认角色

| 角色 | 编码 | 数据权限 | 主要权限 |
|------|------|----------|----------|
| 超级管理员 | admin | 全部 | 所有权限 |
| 团队经理 | team_manager | 团队 | 项目管理、回款、成本 |
| 财务人员 | finance | 全部 | 审批、确认 |
| 项目经理 | project_manager | 个人 | 项目相关 |
| 普通员工 | staff | 个人 | 只读 |

## 测试

```bash
# 后端测试
cd backend
npm test

# 覆盖率报告
npm run test:coverage
```

## 部署检查清单

- [ ] 修改默认 JWT Secret
- [ ] 修改数据库默认密码
- [ ] 配置钉钉 Webhook（可选）
- [ ] 配置 HTTPS
- [ ] 设置定时数据库备份
- [ ] 配置监控告警

## 贡献指南

1. Fork 项目
2. 创建分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -am 'Add xxx'`)
4. 推送分支 (`git push origin feature/xxx`)
5. 创建 Pull Request

## 许可证

MIT

## 联系方式

如有问题，请提交 Issue。
