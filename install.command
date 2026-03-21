#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting x-bookmark-to-obsidian installer..."
echo ""

bash "$SCRIPT_DIR/native-host/install-macos.sh"

echo ""
echo "安装完成。"
echo "下一步："
echo "  1. 重启 Chrome"
echo "  2. 打开扩展弹窗"
echo "  3. 选择你的 Obsidian 保存目录"
echo ""
printf "按回车关闭窗口..."
read -r _
