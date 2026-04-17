#!/bin/bash
# 运行后端测试脚本

echo "🧪 开始运行后端测试..."

cd "$(dirname "$0")/backend"

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 运行单元测试
echo ""
echo "📋 运行单元测试..."
npm test -- --testPathPattern=unit --coverage=false

# 运行集成测试
echo ""
echo "🔗 运行集成测试..."
npm test -- --testPathPattern=integration --coverage=false

# 生成覆盖率报告
echo ""
echo "📊 生成覆盖率报告..."
npm test -- --coverage --collectCoverageFrom="src/**/*.js"

echo ""
echo "✅ 测试完成！"
