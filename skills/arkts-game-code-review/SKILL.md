---
name: arkts-game-code-review
description: Review HarmonyOS (HarmonyOS NEXT) native ArkTS game code for
  architecture, performance, and ArkTS-strict-mode pitfalls. Establishes a
  state-separated simulation layer + Node/esbuild self-test gate so game logic
  can be verified without a device/SDK. Use when reviewing or auditing any
  ArkTS/ArkUI game or canvas-heavy HarmonyOS app.
repo: https://github.com/yao510/agent-skills-collection
---

# ArkTS Game Code Review (鸿蒙原生游戏代码评审)

Senior-developer review methodology for HarmonyOS NEXT native ArkTS games (no third-party engine). Built from a real Survivor-like bullet-heaven project; reusable for any canvas/heavy ArkTS app.

## When to use
- Auditing ArkTS/ArkUI game code for quality, performance, or build-safety.
- Setting up a "quality gate" process for a team that cannot run a device locally.
- Reviewing PRs that touch the simulation layer, game loop, or `preferences`/storage.

## Core principle: state separation (the keystone)
Require the **simulation layer** (= pure TS: entities, systems, balance config) to import **zero** `@ohos.*` / ArkUI. This makes it runnable in Node, enabling logic self-tests without a device.

- Simulation: `game/simulation/*`, `game/pool/*`, `balance.ts` — pure TS, no UI.
- Presentation: `pages/*.ets`, `SaveManager.ts` — may use `@ohos`, only does input capture, `world.update`, draw, persist.

If simulation imports `@ohos`, the self-test gate is dead. Flag it first.

## Self-test gate (run logic without a device)
The simulation layer is pure TS, so bundle it with esbuild and run real matches in Node:

```bash
ESBUILD="$HOME/.workbuddy/binaries/node/workspace/node_modules/.bin/esbuild"
"$ESBUILD" sim-test/harness.ts --bundle --platform=node --format=esm \
  --loader:.ets=ts --resolve-extensions=.ets,.ts,.js,.json --outfile=sim-test/bundle.mjs
node sim-test/bundle.mjs
```
- Loader maps `.ets`→`ts`; ArkTS `struct`/`@State` are NOT in sim layer so they don't break the bundle.
- Harness drives full matches with a "real player" bot (flee nearest + collect gems to level up — NOT idle, which proves nothing about winnability). Assert: no exceptions, win-rate, enemy cap, perf budget (avg step < 8.33ms), reset cleanliness, shield delay, difficulty ramp.
- **Gate rule: any sim-layer change must keep the harness green. Red = reject.**

## Review checklist (severity-graded)
### 🔴 Blocker (must clear before ship)
- Game loop driven by `Animator` with huge `duration` hack → migrate to `XComponent.onFrame`. Accumulator that silently drops time causes invisible slow-motion at low FPS.
- `preferences.get(...)` cast with bare `as number`/`as string` on `ValueType` → ArkTS strict mode can fail `hvigor build`. Use `typeof` narrowing or `Number()`/`JSON.parse`. VERIFY on device.

### 🟠 High (before perf/device testing)
- Hot-path `new Vec2()` per frame (esp. `Projectile.update`, `Camera.update`, `fireProjectiles`) → GC jitter on low-end. Add in-place mutators (`set/addMut/scaleMut`) or use scalars (mirror `Enemy.update`).
- Pooled entity `init()` does `this.pos = new Vec2(...)` → defeats pooling of child objects. Use `this.pos.set(x,y)`.
- Particles/transient FX not pooled AND unbounded → cap with `CFG.fxMax`.

### 🟡 Medium
- `pendingLevelUps`-style queue counters that leak when a branch returns early without decrementing.
- Dead code: fields assigned but never read (`id` counters) — delete via "Find Usages".
- `catch (_e) { /* safe fallback */ }` swallows errors silently → at least `hilog.error` for diagnosability.
- UI component doing loop+render+input+HUD (hundreds of lines) → extract `Renderer`/sub-components.

### 🟢 Low (habit)
- No magic numbers — every tunable into a single `balance.ts` (CFG).
- Shared epsilon constant instead of repeated `0.0001`.
- Render radius uses unified scale (avoid `scaleX≠scaleY` distortion).

## ArkTS-specific rules to enforce
- **No `setInterval` as game loop** — timer cadence is not frame cadence.
- Canvas-heavy games: prefer `XComponent` + `onFrame` for the loop; ArkUI `Canvas` is acceptable for drawing but not as the tick source.
- Lifecycle: `onPageHide` pauses sim + persists; `onPageShow` resets the frame-time baseline to avoid dt spike.
- New permission (e.g. `ohos.permission.VIBRATE`) must be declared in `module.json5` AND have a reason string in `string.json`, or build/release fails.
- No `any`; `unknown` must be narrowed before use. Delete unused vars/imports (strict-mode warnings).

## Deliverables template
1. `资深代码评审报告_vN.md` — graded findings with file:line, why it's a problem, how a senior fixes it; include a "what's done right" section.
2. `团队工程规范与CR清单_vN.md` — the standing bar: architecture/perf/ArkTS/test/quality + a per-PR CR checklist with a senior sign-off gate.
3. Fix only the items verifiable by the Node harness (re-run to prove zero regression); leave device-only fixes (B1/B2/H1/H2) as precise tickets with build/device evidence required.
