#!/bin/bash

# OpenCut Web 应用启动脚本
# 从 apps/web 目录启动开发服务器

set -e

PORT=5555

echo "🚀 启动 OpenCut Web 应用..."
echo "📍 目标端口: $PORT"

# 检查端口是否被占用
check_port() {
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口空闲
    fi
}

# 停止占用端口的进程
kill_port_processes() {
    echo "⚠️  检测到端口 $PORT 被占用"
    
    PIDS=$(lsof -Pi :$PORT -sTCP:LISTEN -t 2>/dev/null || true)
    
    if [ -n "$PIDS" ]; then
        echo "🛑 正在停止占用端口的进程..."
        
        # 尝试优雅地终止进程
        for PID in $PIDS; do
            kill -TERM $PID 2>/dev/null && echo "   ✅ 已发送 TERM 信号给进程 $PID"
        done
        
        sleep 2
        
        # 强制终止剩余进程
        REMAINING_PIDS=$(lsof -Pi :$PORT -sTCP:LISTEN -t 2>/dev/null || true)
        if [ -n "$REMAINING_PIDS" ]; then
            for PID in $REMAINING_PIDS; do
                kill -KILL $PID 2>/dev/null && echo "   ✅ 已强制终止进程 $PID"
            done
        fi
        
        sleep 1
        
        if check_port; then
            echo "❌ 无法释放端口 $PORT"
            exit 1
        else
            echo "✅ 端口 $PORT 已释放"
        fi
    fi
}

# 检查是否在 web 应用目录
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ 错误: 请在 apps/web 目录下运行此脚本"
    exit 1
fi

# 检查并处理端口占用
if check_port; then
    kill_port_processes
fi

echo "🔧 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    bun install
fi

echo "🎯 启动开发服务器..."
echo "🌐 应用将在 http://localhost:$PORT 启动"
echo ""

# 启动开发服务器
exec bun run dev
