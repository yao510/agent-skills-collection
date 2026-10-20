#!/usr/bin/env bash
# 核对 HarmonyOS 项目 AGC 上架基础合规性
# 用法: bash check_agc_compliance.sh <项目根目录>
set -u
ROOT="${1:-.}"
echo "=========================================="
echo " AGC 上架合规性自检: $ROOT"
echo "=========================================="

echo ""
echo "== 1. 图标尺寸 (单层图/分层组件 应全部 1024x1024) =="
find "$ROOT" -path '*/build/*' -prune -o \
  \( -iname 'app_icon.png' -o -iname 'foreground.png' -o -iname 'background.png' -o -iname 'startIcon.png' \) \
  -print 2>/dev/null | while read -r f; do
  dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$f" 2>/dev/null)
  flag="OK"
  case "$dims" in
    1024x1024) flag="OK " ;;
    "") flag="??? (无法读取)" ;;
    *) flag="❌ 非1024" ;;
  esac
  printf "  [%-12s] %-78s %s\n" "$flag" "$f" "$dims"
done

echo ""
echo "== 2. 截图尺寸 (手机1080x1920 / 平板1600x2560 / PC1920x1080) =="
found_shot=0
while read -r f; do
  found_shot=1
  dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$f" 2>/dev/null)
  flag="OK"
  case "$dims" in
    1080x1920|1600x2560|1920x1080|2560x1600) flag="OK " ;;
    "") flag="??? (无法读取)" ;;
    *) flag="❌ 非规范尺寸" ;;
  esac
  printf "  [%-14s] %-60s %s\n" "$flag" "$f" "$dims"
done < <(find "$ROOT" \( -iname 'screenshot*.png' -o -iname 'screenshot*.jpg' -o -iname 'screenshot*.jpeg' \) 2>/dev/null)
if [ "$found_shot" -eq 0 ]; then echo "  (未发现截图文件)"; fi

echo ""
echo "== 3. 签名配置 (build-profile.json5 signingConfigs 是否空) =="
if [ -f "$ROOT/build-profile.json5" ]; then
  if grep -q 'signingConfigs": *\[\]' "$ROOT/build-profile.json5"; then
    echo "  ❌ signingConfigs 为空 -> 需在 DevEco 配置签名(建议自动签名/关联已注册应用)"
  else
    echo "  ✅ signingConfigs 已配置"
  fi
else
  echo "  (未找到 build-profile.json5)"
fi

echo ""
echo "== 4. 包名一致性 =="
bf=$(find "$ROOT" -path '*/build/*' -prune -o -name 'app.json5' -print 2>/dev/null | head -1)
if [ -n "$bf" ]; then
  echo "  $bf:"
  grep -n 'bundleName' "$bf" 2>/dev/null | sed 's/^/    /'
fi
echo ""
echo "提示: 以上 ❌ 项需在上架前修复。详见 SKILL.md。"
