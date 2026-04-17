#!/bin/bash

# 停止服务脚本

echo "🛑 停止云工程绩效管理系统..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 停止后端
if [ -f "backend.pid" ]; then
    PID=$(cat backend.pid)
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "✓ 后端已停止 (PID: $PID)"
    else
        echo "✓ 后端未运行"
    fi
    rm -f backend.pid
fi

# 停止前端
if [ -f "frontend.pid" ]; then
    PID=$(cat frontend.pid)
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "✓ 前端已停止 (PID: $PID)"
    else
        echo "✓ 前端未运行"
    fi
    rm -f frontend.pid
fi

echo "✅ 所有服务已停止"
