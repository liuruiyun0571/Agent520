#!/bin/bash

# ============================================
# Agent520 部署脚本
# 用于阿里云服务器一键部署
# ============================================

set -e

echo "=========================================="
echo "🚀 Agent520 部署脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 权限检查通过${NC}"

# ============================================
# 1. 安装基础依赖
# ============================================
echo ""
echo "📦 安装基础依赖..."
apt-get update -qq

# 安装 Node.js 18
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "18" ]; then
    echo "  → 安装 Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
fi

# 安装 Git
if ! command -v git &> /dev/null; then
    echo "  → 安装 Git..."
    apt-get install -y git > /dev/null 2>&1
fi

# 安装 Nginx
if ! command -v nginx &> /dev/null; then
    echo "  → 安装 Nginx..."
    apt-get install -y nginx > /dev/null 2>&1
fi

echo -e "${GREEN}✓ 基础依赖安装完成${NC}"

# 显示版本
echo ""
echo "📋 环境版本："
echo "  Node.js: $(node -v)"
echo "  NPM: $(npm -v)"
echo "  Git: $(git -v | head -1)"

# ============================================
# 2. 拉取代码
# ============================================
echo ""
echo "📥 拉取代码..."
APP_DIR="/opt/agent520"

if [ -d "$APP_DIR" ]; then
    echo "  → 目录已存在，更新代码..."
    cd "$APP_DIR"
    git pull origin master
else
    echo "  → 克隆仓库..."
    git clone https://github.com/liuruiyun0571/Agent520.git "$APP_DIR"
    cd "$APP_DIR"
fi

echo -e "${GREEN}✓ 代码拉取完成${NC}"

# ============================================
# 3. 安装后端依赖
# ============================================
echo ""
echo "🔧 安装后端依赖..."
cd "$APP_DIR/backend"
npm install --production

echo -e "${GREEN}✓ 后端依赖安装完成${NC}"

# ============================================
# 4. 安装前端依赖并构建
# ============================================
echo ""
echo "🎨 构建前端..."
cd "$APP_DIR/frontend"
npm install
npm run build

echo -e "${GREEN}✓ 前端构建完成${NC}"

# ============================================
# 5. 创建环境变量文件
# ============================================
echo ""
echo "⚙️ 配置环境变量..."
cat > "$APP_DIR/backend/.env" << 'EOF'
NODE_ENV=production
PORT=3000
JWT_SECRET=your-jwt-secret-change-this
DB_PATH=/opt/agent520/data/database.sqlite

# 钉钉配置（请修改为你的实际配置）
DINGTALK_CORP_ID=ding706ecb8da3a63f6dbc961a6cb783455b
DINGTALK_AGENT_ID=4476839008
DINGTALK_APP_KEY=dingwerhjmrjkssctcri
DINGTALK_APP_SECRET=5zuSpP5gEUDUsdw4MxdAVV-IQJQz6SnpvBkyAEjzkugmfe4nfqTiI5YKMZm12IyU
EOF

# 创建数据库目录
mkdir -p /opt/agent520/data

echo -e "${GREEN}✓ 环境变量配置完成${NC}"

# ============================================
# 6. 配置 Nginx
# ============================================
echo ""
echo "🌐 配置 Nginx..."
cat > /etc/nginx/sites-available/agent520 << 'EOF'
server {
    listen 80;
    server_name _;

    # 前端静态文件
    location / {
        root /opt/agent520/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 启用配置
ln -sf /etc/nginx/sites-available/agent520 /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试并重载 Nginx
nginx -t && systemctl reload nginx

echo -e "${GREEN}✓ Nginx 配置完成${NC}"

# ============================================
# 7. 创建 Systemd 服务
# ============================================
echo ""
echo "🔧 创建系统服务..."
cat > /etc/systemd/system/agent520.service << 'EOF'
[Unit]
Description=Agent520 Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/agent520/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd
systemctl daemon-reload
systemctl enable agent520

echo -e "${GREEN}✓ 系统服务创建完成${NC}"

# ============================================
# 8. 启动服务
# ============================================
echo ""
echo "🚀 启动服务..."
systemctl start agent520

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "=========================================="
echo ""
echo "📍 访问地址："
echo "  http://$(curl -s ifconfig.me)"
echo ""
echo "📋 常用命令："
echo "  查看服务状态: systemctl status agent520"
echo "  查看日志: journalctl -u agent520 -f"
echo "  重启服务: systemctl restart agent520"
echo "  重载 Nginx: nginx -s reload"
echo ""
echo -e "${YELLOW}⚠️ 注意：生产环境请修改 JWT_SECRET 和钉钉配置${NC}"
echo ""
