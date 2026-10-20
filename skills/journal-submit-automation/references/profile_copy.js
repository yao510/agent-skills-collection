// 复制登录态 profile 到隔离副本，供离线读信/查状态用，避免锁住正在使用的 live profile。
// 跳过 SingletonLock/SingletonCookie/SingletonSocket/lock 等锁文件。
// 参数(env): AI_PROFILE_SRC(默认 <浏览器profile目录>) / AI_PROFILE_DST(默认 .../profile_mailread)
// 运行: node profile_copy.js
const fs = require('fs');
const path = require('path');

const src = process.env.AI_PROFILE_SRC || '<浏览器profile目录>';
const dst = process.env.AI_PROFILE_DST || '<浏览器profile副本>';
const SKIP = new Set(['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lock']);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const f = path.join(from, e.name), t = path.join(to, e.name);
    if (e.isDirectory()) copyDir(f, t);
    else fs.copyFileSync(f, t);
  }
}
if (!fs.existsSync(src)) { console.error('[FAIL] 源 profile 不存在:', src); process.exit(1); }
copyDir(src, dst);
console.log('[OK] 已复制 profile 到', dst, '（已跳过锁文件）');
console.log('[提示] 读信用: AI_PROFILE=' + dst + ' node mail_read.js');
