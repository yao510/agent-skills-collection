#!/usr/bin/env bash
# 把截图裁剪/缩放为 AGC 要求的竖屏 1080x1920 (9:16)。
# 用法: bash fix_screenshots.sh <输入目录> <输出目录>
# 策略: 中心裁剪到 1080x1920 (优先保留中间内容)。
set -u
IN="${1:?用法: fix_screenshots.sh <输入目录> <输出目录>}"
OUT="${2:?用法: fix_screenshots.sh <输入目录> <输出目录>}"
mkdir -p "$OUT"
count=0
for f in "$IN"/*.{png,jpg,jpeg,PNG,JPG,JPEG}; do
  [ -f "$f" ] || continue
  name=$(basename "$f")
  base="${name%.*}"
  ext="${name##*.}"
  out="$OUT/${base}.${ext}"
  # 中心裁剪到 1080x1920
  ffmpeg -y -loglevel error -i "$f" -vf "crop=1080:1920:0:210" "$out"
  dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$out" 2>/dev/null)
  printf "  %-30s -> %s (%s)\n" "$name" "$dims" "$out"
  count=$((count+1))
done
echo "处理完成: $count 张 -> $OUT"
