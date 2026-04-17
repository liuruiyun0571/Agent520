# 云工程绩效管理系统 - 项目结构

## 技术栈
- **后端**: Node.js + Express + PostgreSQL + Sequelize ORM
- **前端**: Vue 3 + Vite + Vant 4 (移动端UI) + Pinia
- **认证**: JWT (jsonwebtoken)
- **定时任务**: node-cron
- **Excel处理**: xlsx

## 项目目录结构

```
cloud-performance-system/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   │   ├── database.js    # 数据库配置
│   │   │   └── auth.js        # JWT配置
│   │   ├── models/            # 数据模型 (11张表)
│   │   │   ├── index.js       # 模型统一导出
│   │   │   ├── OrgStructure.js    # 组织架构
│   │   │   ├── Employee.js        # 人员
│   │   │   ├── GlobalConfig.js    # 全局配置
│   │   │   ├── User.js            # 用户
│   │   │   ├── Project.js         # 项目
│   │   │   ├── ProjectTeam.js     # 项目团队分配
│   │   │   ├── Payment.js         # 回款
│   │   │   ├── ProjectEmp.js      # 项目人员
│   │   │   ├── EmpHistory.js      # 调岗历史
│   │   │   ├── MonthlyCost.js     # 月度成本
│   │   │   ├── TeamAccount.js     # 团队账户
│   │   │   └── BonusAllocationDetail.js  # 奖金明细
│   │   ├── controllers/       # 控制器
│   │   │   ├── authController.js
│   │   │   ├── orgController.js
│   │   │   ├── employeeController.js
│   │   │   ├── configController.js
│   │   │   ├── projectController.js
│   │   │   ├── paymentController.js
│   │   │   ├── projectEmpController.js
│   │   │   ├── empHistoryController.js
│   │   │   ├── monthlyCostController.js
│   │   │   ├── teamAccountController.js  # ⭐ 团队账户
│   │   │   └── dataFactoryController.js  # ⭐ 数据工厂
│   │   ├── routes/            # 路由
│   │   │   ├── auth.js
│   │   │   ├── org.js
│   │   │   ├── employee.js
│   │   │   ├── config.js
│   │   │   ├── project.js
│   │   │   ├── payment.js
│   │   │   ├── projectEmp.js
│   │   │   ├── empHistory.js
│   │   │   ├── monthlyCost.js
│   │   │   ├── teamAccount.js    # ⭐ 团队账户路由
│   │   │   └── dataFactory.js    # ⭐ 数据工厂路由
│   │   ├── middleware/        # 中间件
│   │   │   ├── auth.js        # 认证中间件
│   │   │   └── validation.js  # 参数校验
│   │   ├── services/          # 业务逻辑
│   │   │   └── dataFactoryService.js  # ⭐ 数据工厂核心服务 (500+行)
│   │   ├── utils/             # 工具函数
│   │   │   ├── response.js    # 统一响应格式
│   │   │   ├── dingtalk.js    # 钉钉通知
│   │   │   └── excel.js       # Excel处理
│   │   ├── cron/              # ⭐ 定时任务 (Phase 4)
│   │   │   ├── index.js               # 任务调度中心
│   │   │   ├── monthlyAccountJob.js   # 月度账户创建
│   │   │   ├── teamAccountDaily.js    # 日结任务
│   │   │   ├── overdraftCheckJob.js   # 超支检测
│   │   │   ├── providentFundJob.js    # 公积金划转
│   │   │   ├── protectionCheckJob.js  # 保护期检查
│   │   │   └── monthlySettlementJob.js # 月度结算
│   │   └── app.js             # 应用入口
│   ├── tests/                 # 测试脚本
│   │   └── testDataFactory.js # 数据工厂测试
│   ├── package.json
│   ├── .env.example
│   └── server.js
│
├── frontend/                   # 前端H5
│   ├── src/
│   │   ├── api/               # API接口
│   │   │   └── index.js       # ⭐ 统一API封装
│   │   ├── components/        # 公共组件
│   │   ├── views/             # 页面
│   │   │   ├── dashboard/     # ⭐ 驾驶舱 (Phase 5)
│   │   │   │   └── Index.vue  # 院领导驾驶舱
│   │   │   ├── team/          # ⭐ 团队看板 (Phase 5)
│   │   │   │   └── Index.vue  # 团队经理看板
│   │   │   ├── project/       # 项目管理
│   │   │   │   └── Index.vue
│   │   │   ├── cost/          # 成本管理
│   │   │   │   └── Index.vue
│   │   │   ├── report/        # ⭐ 报表中心 (Phase 5)
│   │   │   │   └── Index.vue  # 团队/项目/成本报表
│   │   │   ├── admin/         # ⭐ 管理后台 (Phase 5)
│   │   │   │   └── DataFactory.vue  # 数据工厂管理
│   │   │   ├── org/           # 组织架构
│   │   │   │   └── Index.vue
│   │   │   ├── employee/      # 人员管理
│   │   │   │   └── Index.vue
│   │   │   └── auth/          # 登录/注册
│   │   │       └── Login.vue
│   │   ├── stores/            # Pinia状态管理
│   │   ├── router/            # 路由
│   │   │   └── index.js
│   │   ├── utils/             # 工具函数
│   │   ├── styles/            # 样式
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── database/                   # 数据库
│   ├── migrations/            # 迁移文件
│   ├── seeds/                 # 种子数据
│   └── init.sql               # 初始化SQL
│
├── docs/                       # 文档
│   ├── api.md                 # API文档
│   └── database-design.md     # 数据库设计
│
├── deploy/                     # 部署脚本
│   └── deploy.sh
│
├── README.md
└── package.json
```

## 开发计划

### ✅ Phase 1: 基础数据架构
- [x] 数据库设计与迁移
- [x] 组织架构表API
- [x] 人员主表API + 调岗逻辑
- [x] 全局配置表API
- [x] Excel导入功能

### ✅ Phase 2: 项目与回款管理
- [x] 项目主表API + 支付节点子表单
- [x] 项目团队分配API
- [x] 回款记录流程表单
- [x] 奖金自动分配逻辑

### ✅ Phase 3: 跨团队成本核心
- [x] 项目参与记录API
- [x] 人员归属历史API
- [x] 月度成本流程表单
- [x] 成本自动拆分逻辑

### ✅ Phase 4: 数据工厂
- [x] 团队月度账户表
- [x] 数据工厂服务 (dataFactoryService.js)
- [x] 定时任务框架 (node-cron)
- [x] 月度账户自动创建
- [x] 日结任务
- [x] 超支检测与冻结
- [x] 公积金自动划转
- [x] 保护期检查
- [x] 任务调度中心

**定时任务清单:**

| 任务 | Cron表达式 | 时区 | 说明 |
|------|-----------|------|------|
| 日结任务 | `0 1 * * *` | Asia/Shanghai | 每日汇总回款和成本 |
| 月度账户创建 | `0 2 1 * *` | Asia/Shanghai | 每月1日创建新账户并结转余额 |
| 超支检测 | `0 3 * * *` | Asia/Shanghai | 检测超支并冻结/预警 |
| 月度结算 | `0 4 1 * *` | Asia/Shanghai | 月末完整结算 |
| 公积金划转 | `30 2 5 * *` | Asia/Shanghai | 每月5日划转公积金 |
| 保护期检查 | `0 4 * * 1` | Asia/Shanghai | 每周一检查保护期 |

### ✅ Phase 5: H5前端完善 (已完成)
- [x] **院领导驾驶舱** (`views/dashboard/Index.vue`)
  - 团队健康度统计
  - 资金热力图
  - 预警待处理列表
  - 快捷操作入口
- [x] **团队经理看板** (`views/team/Index.vue`)
  - 账户概览卡片（余额、回款、成本、公积金）
  - 近6个月趋势图
  - 透支比例进度条
  - 关联项目列表
- [x] **报表中心** (`views/report/Index.vue`)
  - 团队报表：排名、余额统计
  - 项目报表：回款进度、统计
  - 成本分析：结构、对比
- [x] **数据工厂管理** (`views/admin/DataFactory.vue`)
  - 定时任务列表
  - 手动触发功能
  - 执行日志展示

**前端路由:**

| 路径 | 组件 | 说明 |
|------|------|------|
| `/dashboard` | dashboard/Index.vue | 驾驶舱 |
| `/team` | team/Index.vue | 团队看板 |
| `/project` | project/Index.vue | 项目管理 |
| `/cost` | cost/Index.vue | 成本管理 |
| `/report` | report/Index.vue | 报表中心 |
| `/org` | org/Index.vue | 组织架构 |
| `/employee` | employee/Index.vue | 人员管理 |
| `/admin/data-factory` | admin/DataFactory.vue | 数据工厂管理 |

**数据工厂API:**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/data-factory/status` | 获取任务状态 |
| POST | `/api/data-factory/jobs/:jobName/run` | 手动触发任务 |
| POST | `/api/data-factory/monthly-accounts/create` | 创建月度账户 |
| POST | `/api/data-factory/overdraft-check` | 超支检测 |
| POST | `/api/data-factory/provident-fund/transfer` | 公积金划转 |
| POST | `/api/data-factory/monthly-settlement` | 月度结算 |

### ⏳ Phase 6: 权限与集成
- [ ] RBAC权限体系完善
- [ ] 钉钉通知集成
- [ ] 审批流程优化

### ⏳ Phase 7: 测试与上线
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 部署上线
