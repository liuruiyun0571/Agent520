# 云工程绩效管理系统 - 部署文档

## 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 内存: 至少 2GB RAM
- 磁盘: 至少 10GB 可用空间

## 快速部署

### 1. 克隆代码

```bash
git clone <repository-url>
cd cloud-engineering-performance
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库密码、JWT密钥等
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
- API 文档: http://localhost:3000/api-docs (如果有)

## 生产环境部署

### 1. 安全加固

```bash
# 生成强密码
openssl rand -base64 32

# 配置 .env
DB_PASSWORD=<strong-password>
JWT_SECRET=<strong-secret>
```

### 2. 配置 HTTPS

使用 Nginx 或 Traefik 作为反向代理，配置 SSL 证书。

#### Nginx 示例配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. 数据库备份

```bash
# 手动备份
docker-compose exec db pg_dump -U postgres cloud_engineering > backup.sql

# 恢复
docker-compose exec -T db psql -U postgres cloud_engineering < backup.sql
```

### 4. 定时备份（Crontab）

```bash
# 每天凌晨2点备份
0 2 * * * cd /path/to/project && docker-compose exec -T db pg_dump -U postgres cloud_engineering > backups/backup_$(date +\%Y\%m\%d).sql
```

## 系统维护

### 查看日志

```bash
# 全部日志
docker-compose logs

# 后端日志
docker-compose logs backend

# 实时日志
docker-compose logs -f backend
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart backend
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose down
docker-compose up -d --build

# 数据库迁移（如有需要）
docker-compose exec backend npm run migrate
```

## 故障排查

### 数据库连接失败

```bash
# 检查数据库状态
docker-compose ps db
docker-compose logs db

# 检查连接
docker-compose exec backend node -e "console.log(require('./src/config/database'))"
```

### 后端启动失败

```bash
# 查看详细日志
docker-compose logs --tail=100 backend

# 进入容器调试
docker-compose exec backend sh
```

### 前端白屏

```bash
# 检查构建
docker-compose logs frontend

# 检查 Nginx 配置
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

## 性能优化

### 数据库优化

```sql
-- 为常用查询添加索引
CREATE INDEX idx_payments_project_date ON payments(project_id, payment_date);
CREATE INDEX idx_monthly_costs_month ON monthly_costs(belong_month);
CREATE INDEX idx_team_accounts_month ON team_accounts(org_id, belong_month);
```

### Nginx 缓存配置

已在 nginx.conf 中配置静态资源缓存（1年）。

### 数据库连接池

后端已配置连接池，可根据并发量调整：

```javascript
// src/models/index.js
sequelize: new Sequelize(database, username, password, {
  pool: {
    max: 10,  // 最大连接数
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});
```

## 监控建议

1. **应用监控**: 使用 PM2 或 Docker 健康检查
2. **数据库监控**: PostgreSQL 慢查询日志
3. **系统监控**: 使用 Node Exporter + Prometheus + Grafana
4. **日志收集**: ELK Stack 或 Loki

## 钉钉通知配置

1. 在钉钉群中添加机器人
2. 获取 Webhook URL 和 Secret
3. 配置到 .env 文件：

```env
DINGTALK_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=xxx
DINGTALK_SECRET=your_secret
```

## 默认账号

部署后使用以下账号登录：

- **用户名**: admin
- **密码**: 需要查看数据库初始化脚本或联系管理员

## 支持

如有问题，请提交 Issue 或联系开发团队。
