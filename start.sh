#!/bin/bash

# ========================================
# 云工程绩效管理系统 - 一键启动脚本 (SQLite 版)
# ========================================

set -e

echo "🚀 云工程绩效管理系统启动中..."
echo "================================"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    exit 1
fi

echo "✓ Node.js 版本: $(node --version)"

# 安装后端依赖
echo ""
echo "📦 安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✓ 后端依赖已安装"
fi

# 创建数据库目录
mkdir -p database

# 初始化数据库
echo ""
echo "🗄️  初始化数据库..."
node scripts/initDatabase.js || echo "数据库已存在，跳过初始化"

# 启动后端（后台运行）
echo ""
echo "🔧 启动后端服务..."
nohup node server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
echo "✓ 后端已启动 (PID: $BACKEND_PID)"

# 等待后端启动
sleep 3

# 检查后端健康
echo ""
echo "🏥 检查后端服务..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✓ 后端运行正常"
else
    echo "⚠️ 后端启动中，请稍后检查日志"
fi

# 安装前端依赖
echo ""
echo "📦 安装前端依赖..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✓ 前端依赖已安装"
fi

# 构建前端
echo ""
echo "🔨 构建前端..."
npm run build

# 启动前端预览（后台运行）
echo ""
echo "🌐 启动前端服务..."
nohup npm run preview > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid
echo "✓ 前端已启动 (PID: $FRONTEND_PID)"

# 等待前端启动
sleep 2

echo ""
echo "================================"
echo "✅ 系统启动完成！"
echo ""
echo "📱 访问地址:"
echo "   前端: http://localhost:4173"
echo "   后端: http://localhost:3000"
echo "   健康检查: http://localhost:3000/health"
echo ""
echo "📝 日志文件:"
echo "   后端日志: logs/backend.log"
echo "   前端日志: logs/frontend.log"
echo ""
echo "🛑 停止服务: ./stop.sh"
echo "================================"
