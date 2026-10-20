#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scan_template_residue.py — 批量复制工程模板（如从 D:\\hua 复制生成新应用）后的"模板残留"扫描。

背景：从已上架工程复制骨架生成新应用时，极易残留上一个应用的痕迹，导致：
  1) rawfile/privacy_policy.html 里包名还是旧应用（如 com.hanzi.learn）→ AGC 审核硬伤
  2) resources/en/element/string.json 英文应用名还是旧应用（如 Hanzi Challenge）
  3) check_dups.ps1 等调试脚本、obfuscation-rules.txt 旧类名 keep 规则
  4) oh-package.json5 的 description/author 还是旧应用
  5) EntryAbility hilog tag 还是 'testTag'；空 components/models/viewmodel 目录

用法：
  python scan_template_residue.py <工程根目录> [--old-name Hanzi] [--old-bundle com.hanzi.learn]

只读扫描并输出报告，不修改任何文件。修复建议见报告尾部。
"""
import os
import re
import sys

def scan(root: str, old_names: list, old_bundles: list) -> list:
    """返回问题列表 [(级别, 路径, 说明)]"""
    issues = []
    old_names = [n.lower() for n in old_names if n]
    old_bundles = [b.lower() for b in old_bundles if b]

    def hit(text: str) -> str:
        tl = text.lower()
        for b in old_bundles:
            if b in tl:
                return b
        for n in old_names:
            if n in tl:
                return n
        return ''

    for folder in sorted(os.listdir(root)):
        base = os.path.join(root, folder)
        if not os.path.isdir(base):
            continue

        # 1) rawfile/privacy_policy.html（无引用时建议删除；有引用时用本应用隐私政策覆盖）
        for rel in ['entry/src/main/resources/rawfile/privacy_policy.html',
                    'listing-assets/privacy_policy.html']:
            p = os.path.join(base, rel)
            if os.path.isfile(p):
                try:
                    with open(p, encoding='utf-8', errors='ignore') as f:
                        c = f.read()
                    h = hit(c)
                    if h:
                        issues.append(('HIGH', p, '含旧应用痕迹: %s（尤其包名/隐私声明，审核硬伤）' % h))
                except Exception:
                    pass

        # 2) en string.json 英文名残留
        for rel in ['AppScope/resources/en/element/string.json',
                    'entry/src/main/resources/en/element/string.json']:
            p = os.path.join(base, rel)
            if os.path.isfile(p):
                try:
                    with open(p, encoding='utf-8') as f:
                        c = f.read()
                    h = hit(c)
                    if h:
                        issues.append(('HIGH', p, '英文应用名残留: %s' % h))
                except Exception:
                    pass

        # 3) 调试脚本 / 旧类名 keep 规则
        p = os.path.join(base, 'check_dups.ps1')
        if os.path.isfile(p):
            issues.append(('LOW', p, '模板调试脚本残留，建议删除'))
        p = os.path.join(base, 'entry/obfuscation-rules.txt')
        if os.path.isfile(p):
            try:
                with open(p, encoding='utf-8') as f:
                    c = f.read()
                h = hit(c)
                if h:
                    issues.append(('MED', p, '混淆规则含旧类名: %s' % h))
            except Exception:
                pass

        # 4) oh-package.json5 description/author
        for rel in ['oh-package.json5', 'entry/oh-package.json5']:
            p = os.path.join(base, rel)
            if os.path.isfile(p):
                try:
                    with open(p, encoding='utf-8') as f:
                        c = f.read()
                    if re.search(r'Please describe the basic information', c):
                        issues.append(('LOW', p, 'description 仍为 DevEco 占位文案'))
                    h = hit(c)
                    if h:
                        issues.append(('MED', p, 'description/author 含旧应用: %s' % h))
                except Exception:
                    pass

        # 5) EntryAbility hilog tag
        p = os.path.join(base, 'entry/src/main/ets/entryability/EntryAbility.ets')
        if os.path.isfile(p):
            try:
                with open(p, encoding='utf-8') as f:
                    c = f.read()
                if "'testTag'" in c:
                    issues.append(('LOW', p, 'hilog tag 仍为模板 testTag'))
            except Exception:
                pass

        # 6) 空目录
        ets = os.path.join(base, 'entry/src/main/ets')
        if os.path.isdir(ets):
            for sub in os.listdir(ets):
                d = os.path.join(ets, sub)
                if os.path.isdir(d) and not os.listdir(d):
                    issues.append(('LOW', d, '空目录（模板残留），建议删除'))

    return issues

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    root = sys.argv[1]
    old_names = []
    old_bundles = []
    for a in sys.argv[2:]:
        if a.startswith('--old-name'):
            old_names.append(a.split('=', 1)[1])
        elif a.startswith('--old-bundle'):
            old_bundles.append(a.split('=', 1)[1])
    # 默认按最常见模板(汉字学习挑战)兜底
    old_names = old_names or ['hanzi', 'hanzi challenge']
    old_bundles = old_bundles or ['com.hanzi.learn']

    problems = scan(root, old_names, old_bundles)
    if not problems:
        print('OK: 未发现模板残留（%s）' % root)
        sys.exit(0)
    levels = {'HIGH': 0, 'MED': 0, 'LOW': 0}
    for lvl, path, msg in problems:
        levels[lvl] += 1
        print('[%s] %s\n      -> %s' % (lvl, path, msg))
    print('\n共 %d 项（HIGH %d / MED %d / LOW %d）。' % (len(problems), levels['HIGH'], levels['MED'], levels['LOW']))
    print('修复建议：HIGH 必须修（删残留文件或改写为当前应用信息）；MED/LOW 建议修（工程整洁）。')
