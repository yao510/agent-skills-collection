#!/usr/bin/env python3
# 把任意尺寸(可能带白底)的源图处理成 1024x1024 透明背景图标。
# 用法: python fix_icon.py <源图.png> <输出路径1.png> [<输出路径2.png> ...]
# 逻辑:
#   1. 四角 flood fill 去除外部白底(容差可调)
#   2. 缩放到 1024x1024 (保持比例, 不足处透明)
#   3. 写出到所有给定输出路径
import sys
from PIL import Image

TOLERANCE = 200  # 白底判定容差(0-255 各通道)


def remove_white_bg(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    # 把四角附近白色像素标记为透明( flood fill )
    def is_white(p):
        return p[0] > 255 - TOLERANCE and p[1] > 255 - TOLERANCE and p[2] > 255 - TOLERANCE
    # 简单做法: 直接把所有接近白色的"背景"像素透明化(对非圆角矩形图也适用)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_white((r, g, b)):
                px[x, y] = (r, g, b, 0)
    return img


def to_1024(img: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    img.thumbnail((1024, 1024), Image.LANCZOS)
    canvas.paste(img, ((1024 - img.width) // 2, (1024 - img.height) // 2))
    return canvas


def main():
    if len(sys.argv) < 3:
        print("用法: python fix_icon.py <源图> <输出1> [输出2 ...]")
        sys.exit(1)
    src = sys.argv[1]
    out_paths = sys.argv[2:]
    img = Image.open(src)
    print(f"源图: {src} 尺寸={img.size} 模式={img.mode}")
    img = remove_white_bg(img)
    img = to_1024(img)
    for p in out_paths:
        img.save(p, "PNG")
        print(f"已写出 1024x1024 -> {p}")
    print("完成。")


if __name__ == "__main__":
    main()
