# 云工程绩效管理系统 - Render 部署指南

## 一、注册 Render 账号

1. 打开 https://render.com
2. 点击 "Get Started for Free"
3. 用 GitHub 账号登录（推荐）

## 二、创建代码仓库

### 方案 A：GitHub（推荐）
1. 在 GitHub 创建新仓库（如 `cloud-performance`）
2. 上传代码：
```bash
cd /root/.openclaw/workspace
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/cloud-performance.git
git push -u origin main
```

### 方案 B：直接用 Render 的 Web Service
1. 在 Render 点击 "New" → "Web Service"
2. 选择 "Build and deploy from a Git repository"
3. 连接你的 GitHub 仓库

## 三、配置 Render 服务

1. **Name**: `cloud-performance-backend`
2. **Runtime**: Node
3. **Build Command**: 
   ```
   cd backend && npm install
   ```
4. **Start Command**: 
   ```
   cd backend && node server.js
   ```

### 环境变量设置
点击 "Advanced" → "Add Environment Variable"，添加：

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | `cloud-engineering-jwt-secret-2024` |
| `DB_PATH` | `/tmp/data.sqlite` |
| `DINGTALK_CORP_ID` | `ding706ecb8da3a63f6dbc961a6cb783455b` |
| `DINGTALK_AGENT_ID` | `4476839008` |
| `DINGTALK_APP_KEY` | `dingwerhjmrjkssctcri` |
| `DINGTALK_APP_SECRET` | `5zuSpP5gEUDUsdw4MxdAVV-IQJQz6SnpvBkyAEjzkugmfe4nfqTiI5YKMZm12IyU` |

## 四、部署

点击 "Create Web Service"，等待部署完成。

完成后你会得到一个地址：
```
https://cloud-performance-backend.onrender.com
```

## 五、配置钉钉

1. 打开 https://open.dingtalk.com/
2. 进入你的 H5 微应用
3. 设置 **应用首页地址**：
   ```
   https://cloud-performance-backend.onrender.com
   ```
4. 保存并发布

## 六、注意事项

### 免费版限制
- 15 分钟无访问会自动休眠
- 首次访问需要等待 30 秒唤醒
- 每月 100GB 流量

### 数据库
- SQLite 存储在 `/tmp/data.sqlite`
- **重启服务数据会丢失**（因为 /tmp 是临时目录）
- 如需持久化，后期需要迁移到 PostgreSQL

### 前端部署
Render 只托管了后端 API，前端需要：
- 方案 1：用 Gitee Pages 托管前端静态文件
- 方案 2：后端同时提供前端静态文件（需要修改代码）

## 七、一键部署（如果不用 Git）

如果你不想用 GitHub，可以直接在 Render 创建：
1. "New" → "Web Service"
2. 选择 "Deploy an existing image from a registry"
3. 或者上传代码压缩包

## 八、测试

部署完成后访问：
```
https://你的服务名.onrender.com/health
```

返回 `{"status":"ok"}` 表示成功！
