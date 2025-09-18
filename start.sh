#!/bin/bash

# OpenCut 开发服务器启动脚本
# 检查并处理端口占用，然后启动开发服务器

set -e

PORT=5555
PROJECT_NAME="OpenCut"

echo "🚀 启动 $PROJECT_NAME 开发服务器..."
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
    
    # 获取占用端口的进程ID
    PIDS=$(lsof -Pi :$PORT -sTCP:LISTEN -t 2>/dev/null || true)
    
    if [ -n "$PIDS" ]; then
        echo "🔍 发现以下进程占用端口 $PORT:"
        for PID in $PIDS; do
            PROCESS_INFO=$(ps -p $PID -o pid,ppid,comm,args --no-headers 2>/dev/null || echo "$PID unknown unknown")
            echo "   PID: $PROCESS_INFO"
        done
        
        echo "🛑 正在停止占用端口的进程..."
        
        # 尝试优雅地终止进程
        for PID in $PIDS; do
            if kill -TERM $PID 2>/dev/null; then
                echo "   ✅ 已发送 TERM 信号给进程 $PID"
            fi
        done
        
        # 等待进程优雅退出
        sleep 2
        
        # 检查是否还有进程占用端口
        REMAINING_PIDS=$(lsof -Pi :$PORT -sTCP:LISTEN -t 2>/dev/null || true)
        
        if [ -n "$REMAINING_PIDS" ]; then
            echo "⚡ 强制终止剩余进程..."
            for PID in $REMAINING_PIDS; do
                if kill -KILL $PID 2>/dev/null; then
                    echo "   ✅ 已强制终止进程 $PID"
                fi
            done
            sleep 1
        fi
        
        # 最终检查
        if check_port; then
            echo "❌ 无法释放端口 $PORT，请手动检查"
            exit 1
        else
            echo "✅ 端口 $PORT 已释放"
        fi
    fi
}

# 检查是否在正确的目录
if [ ! -f "package.json" ] || [ ! -d "apps" ]; then
    echo "❌ 错误: 请在 OpenCut 项目根目录下运行此脚本"
    echo "📁 当前目录: $(pwd)"
    exit 1
fi

# 检查 bun 是否安装
if ! command -v bun &> /dev/null; then
    echo "❌ 错误: 未找到 bun 命令"
    echo "💡 请先安装 bun: https://bun.sh/docs/installation"
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
echo "📝 按 Ctrl+C 停止服务器"
echo ""

# 启动开发服务器
exec bun dev
