# 云工程绩效管理系统 - 部署指南

## 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 内存
- 至少 10GB 磁盘空间

## 快速部署

### 1. 克隆项目
```bash
git clone <repository-url>
cd cloud-engineering-performance
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，设置数据库密码和 JWT 密钥
```

### 3. 启动服务
```bash
docker-compose up -d
```

### 4. 初始化数据库
```bash
docker-compose exec backend node scripts/initDatabase.js
```

### 5. 访问系统
- 前端: http://localhost
- 后端 API: http://localhost:3000
- API 文档: http://localhost:3000/api-docs (如已配置)

## 生产环境部署

### 数据库配置
1. 使用外部 PostgreSQL 实例
2. 修改 `.env` 中的数据库连接信息
3. 确保数据库用户有足够权限

### 安全配置
1. **必须修改** `JWT_SECRET` 为强密码
2. 启用 HTTPS (使用 nginx 反向代理)
3. 配置钉钉 Webhook (可选)

### 性能优化
1. 启用 PostgreSQL 连接池
2. 配置 Redis 缓存 (可选)
3. 启用 nginx gzip 压缩

## 监控与维护

### 查看日志
```bash
# 所有服务
docker-compose logs -f

# 仅后端
docker-compose logs -f backend

# 仅前端
docker-compose logs -f frontend
```

### 数据库备份
```bash
# 备份
docker-compose exec db pg_dump -U postgres cloud_engineering > backup.sql

# 恢复
docker-compose exec -T db psql -U postgres cloud_engineering < backup.sql
```

### 更新部署
```bash
# 拉取最新代码
git pull

# 重建并重启
docker-compose down
docker-compose up -d --build
```

## 故障排查

### 服务无法启动
1. 检查端口是否被占用
2. 检查 `.env` 配置是否正确
3. 查看详细日志: `docker-compose logs`

### 数据库连接失败
1. 确认数据库容器已启动: `docker-compose ps`
2. 检查数据库健康状态
3. 验证连接参数

### 前端无法访问 API
1. 确认后端服务正常运行
2. 检查 nginx 配置中的代理地址
3. 查看浏览器网络请求

## 定时任务

系统包含以下自动定时任务：

| 任务 | 时间 | 说明 |
|------|------|------|
| 日结 | 每日 01:00 | 汇总当日数据 |
| 月度账户 | 每月1日 02:00 | 创建新账户 |
| 超支检测 | 每日 03:00 | 检测透支并预警 |
| 月度结算 | 每月1日 04:00 | 月末结算 |
| 公积金划转 | 每月5日 02:30 | 盈利团队公积金 |
| 保护期检查 | 每周一 04:00 | 检查冻结团队 |

## 技术支持

如有问题，请检查：
1. 系统日志
2. 数据库状态
3. 网络连接
